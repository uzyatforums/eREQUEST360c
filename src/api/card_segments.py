from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from src.db import get_db
from src.db_models import (
    CardSegment,
    CardSegmentProgramme,
    CardProgramme,
    MakerCheckerWorkItem,
)
from src.api.maker_checker_constants import WorkItemStatus
from src.models import (
    UserInfo,
    CardSegmentCreate,
    CardSegmentUpdate,
    CardSegmentRead,
    CardSegmentProgrammeAssign,
    CardSegmentProgrammeRead,
    CardSegmentProgrammeReorder,
    ConfigExecutionResult,
)
from src.api.auth import get_current_user, require_permission
from src.api.branch_context_service import BranchContextService, get_branch_context
from src.api.config_orchestrator import ConfigurationOrchestrator
from src.api.audit_service import log_audit_event

router = APIRouter(prefix="/config/card-segments", tags=["Card Segments"])


# Helper: Resequence Programme Selection Order for a (segment_id, card_brand)
def _resequence_brand_programmes(db: Session, client_id: int, segment_id: int, card_brand: str):
    assignments = (
        db.query(CardSegmentProgramme, CardProgramme.card_type)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardProgramme.card_type == card_brand,
        )
        .order_by(CardSegmentProgramme.priority.asc(), CardSegmentProgramme.id.asc())
        .all()
    )
    for idx, (assign, _) in enumerate(assignments, start=1):
        assign.priority = idx
    db.commit()


@router.get("", response_model=List[CardSegmentRead])
def list_card_segments(
    q: Optional[str] = None,
    active: Optional[bool] = Query(None),
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    client_id = branch_service.get_client_id()
    query = db.query(CardSegment).filter(CardSegment.client_id == client_id)
    if active is not None:
        query = query.filter(CardSegment.active == active)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            (CardSegment.segment_code.ilike(search_term)) | (CardSegment.segment_name.ilike(search_term))
        )
    segments = query.order_by(CardSegment.priority.asc(), CardSegment.segment_code.asc()).all()

    # Query active pending work items for CARD_SEGMENT
    pending_items = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.client_id == client_id,
            MakerCheckerWorkItem.entity_type_code == "CARD_SEGMENT",
            MakerCheckerWorkItem.status_code == WorkItemStatus.PENDING,
        )
        .all()
    )
    pending_map = {wi.entity_id: wi for wi in pending_items}

    result: List[CardSegmentRead] = []
    for seg in segments:
        read_obj = CardSegmentRead.model_validate(seg)
        wi = pending_map.get(seg.id)
        if wi:
            read_obj.has_pending_change = True
            read_obj.pending_work_item_id = wi.id
            read_obj.pending_work_item_number = wi.work_item_number
            read_obj.pending_operation_code = wi.operation_code
        result.append(read_obj)

    return result


@router.get("/{segment_id}", response_model=CardSegmentRead)
def get_card_segment(
    segment_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    client_id = branch_service.get_client_id()
    segment = (
        db.query(CardSegment)
        .filter(CardSegment.id == segment_id, CardSegment.client_id == client_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")

    read_obj = CardSegmentRead.model_validate(segment)
    wi = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.client_id == client_id,
            MakerCheckerWorkItem.entity_type_code == "CARD_SEGMENT",
            MakerCheckerWorkItem.entity_id == segment_id,
            MakerCheckerWorkItem.status_code == WorkItemStatus.PENDING,
        )
        .first()
    )
    if wi:
        read_obj.has_pending_change = True
        read_obj.pending_work_item_id = wi.id
        read_obj.pending_work_item_number = wi.work_item_number
        read_obj.pending_operation_code = wi.operation_code

    return read_obj


@router.post("", response_model=ConfigExecutionResult)
def create_card_segment(
    payload: CardSegmentCreate,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    code_upper = payload.segment_code.strip().upper()
    name_strip = payload.segment_name.strip()

    # BR-001: Unique Segment Code per tenant
    if db.query(CardSegment).filter(CardSegment.client_id == client_id, CardSegment.segment_code == code_upper).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card Segment code '{code_upper}' already exists for this tenant."
        )

    # BR-002: Unique Segment Name per tenant
    if db.query(CardSegment).filter(CardSegment.client_id == client_id, CardSegment.segment_name == name_strip).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card Segment name '{name_strip}' already exists for this tenant."
        )

    def _commit_create(s: Session, data: dict):
        new_seg = CardSegment(
            client_id=client_id,
            segment_code=code_upper,
            segment_name=name_strip,
            priority=data.get("priority", 0),
            active=data.get("active", True),
            created_by=current_user.username,
            created_date=datetime.utcnow(),
        )
        s.add(new_seg)
        s.flush()

        log_audit_event(
            db=s,
            entity_type="CARD_SEGMENT",
            entity_id=new_seg.id,
            event_code="CARD_SEGMENT_CREATED",
            performed_by=current_user.username,
            branch_code=branch_service.get_effective_branch(),
            remarks=f"Created Card Segment '{code_upper}' - '{name_strip}'",
            snapshot_data={
                "id": new_seg.id,
                "client_id": client_id,
                "segment_code": code_upper,
                "segment_name": name_strip,
                "priority": new_seg.priority,
                "active": new_seg.active,
            },
        )
        return new_seg.id

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT",
        entity_id=0,
        operation_code="CREATE",
        entity_name=name_strip,
        before_payload=None,
        after_payload=payload.dict(),
        commit_callback=_commit_create,
    )


@router.put("/{segment_id}", response_model=ConfigExecutionResult)
def update_card_segment(
    segment_id: int,
    payload: CardSegmentUpdate,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    segment = (
        db.query(CardSegment)
        .filter(CardSegment.id == segment_id, CardSegment.client_id == client_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")

    if payload.segment_name:
        name_strip = payload.segment_name.strip()
        dup = (
            db.query(CardSegment)
            .filter(
                CardSegment.client_id == client_id,
                CardSegment.segment_name == name_strip,
                CardSegment.id != segment_id,
            )
            .first()
        )
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Card Segment name '{name_strip}' already exists for another segment."
            )

    before_snapshot = {
        "id": segment.id,
        "segment_code": segment.segment_code,
        "segment_name": segment.segment_name,
        "priority": segment.priority,
        "active": segment.active,
    }

    def _commit_update(s: Session, data: dict):
        seg = s.query(CardSegment).get(segment_id)
        if not seg:
            return
        if data.get("segment_name") is not None:
            seg.segment_name = data["segment_name"].strip()
        if data.get("priority") is not None:
            seg.priority = data["priority"]
        if data.get("active") is not None:
            seg.active = data["active"]
        seg.last_modified_by = current_user.username
        seg.last_modified_date = datetime.utcnow()

        log_audit_event(
            db=s,
            entity_type="CARD_SEGMENT",
            entity_id=seg.id,
            event_code="CARD_SEGMENT_UPDATED",
            performed_by=current_user.username,
            branch_code=branch_service.get_effective_branch(),
            remarks=f"Updated Card Segment '{seg.segment_code}'",
            changes={
                "segment_name": (before_snapshot["segment_name"], seg.segment_name),
                "priority": (before_snapshot["priority"], seg.priority),
                "active": (before_snapshot["active"], seg.active),
            },
            snapshot_data={
                "id": seg.id,
                "segment_code": seg.segment_code,
                "segment_name": seg.segment_name,
                "priority": seg.priority,
                "active": seg.active,
            },
        )

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT",
        entity_id=segment_id,
        operation_code="UPDATE",
        entity_name=segment.segment_name,
        before_payload=before_snapshot,
        after_payload=payload.dict(exclude_none=True),
        commit_callback=_commit_update,
    )


@router.post("/{segment_id}/activate", response_model=ConfigExecutionResult)
def activate_card_segment(
    segment_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    segment = (
        db.query(CardSegment)
        .filter(CardSegment.id == segment_id, CardSegment.client_id == client_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")

    def _commit_activate(s: Session, _):
        seg = s.query(CardSegment).get(segment_id)
        if seg:
            seg.active = True
            seg.last_modified_by = current_user.username
            seg.last_modified_date = datetime.utcnow()
            log_audit_event(
                db=s,
                entity_type="CARD_SEGMENT",
                entity_id=seg.id,
                event_code="CARD_SEGMENT_ACTIVATED",
                performed_by=current_user.username,
                branch_code=branch_service.get_effective_branch(),
                remarks=f"Activated Card Segment '{seg.segment_code}'",
            )

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT",
        entity_id=segment_id,
        operation_code="ACTIVATE",
        entity_name=segment.segment_name,
        before_payload={"active": segment.active},
        after_payload={"active": True},
        commit_callback=_commit_activate,
    )


@router.post("/{segment_id}/deactivate", response_model=ConfigExecutionResult)
def deactivate_card_segment(
    segment_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    segment = (
        db.query(CardSegment)
        .filter(CardSegment.id == segment_id, CardSegment.client_id == client_id)
        .first()
    )
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")

    def _commit_deactivate(s: Session, _):
        seg = s.query(CardSegment).get(segment_id)
        if seg:
            seg.active = False
            seg.last_modified_by = current_user.username
            seg.last_modified_date = datetime.utcnow()
            log_audit_event(
                db=s,
                entity_type="CARD_SEGMENT",
                entity_id=seg.id,
                event_code="CARD_SEGMENT_DEACTIVATED",
                performed_by=current_user.username,
                branch_code=branch_service.get_effective_branch(),
                remarks=f"Deactivated Card Segment '{seg.segment_code}'",
            )

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT",
        entity_id=segment_id,
        operation_code="DEACTIVATE",
        entity_name=segment.segment_name,
        before_payload={"active": segment.active},
        after_payload={"active": False},
        commit_callback=_commit_deactivate,
    )


@router.get("/{segment_id}/programmes", response_model=List[CardSegmentProgrammeRead])
def list_segment_programmes(
    segment_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    client_id = branch_service.get_client_id()
    segment = db.query(CardSegment).filter(CardSegment.id == segment_id, CardSegment.client_id == client_id).first()
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")

    results = (
        db.query(CardSegmentProgramme, CardProgramme)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.segment_id == segment_id,
            CardSegmentProgramme.client_id == client_id,
        )
        .order_by(CardProgramme.card_type.asc(), CardSegmentProgramme.priority.asc())
        .all()
    )

    items = []
    for csp, cp in results:
        items.append(
            CardSegmentProgrammeRead(
                id=csp.id,
                client_id=csp.client_id,
                segment_id=csp.segment_id,
                card_programme_id=csp.card_programme_id,
                card_programme_code=cp.card_programme_code,
                card_programme_name=cp.card_programme_name,
                card_type=cp.card_type,
                priority=csp.priority or 1,
                description=csp.description,
                created_by=csp.created_by,
                created_date=csp.created_date,
            )
        )
    return items


@router.post("/{segment_id}/programmes", response_model=ConfigExecutionResult)
def assign_programme_to_segment(
    segment_id: int,
    payload: CardSegmentProgrammeAssign,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()

    # BR-003: Inactive Card Segments cannot receive new assignments
    segment = db.query(CardSegment).filter(CardSegment.id == segment_id, CardSegment.client_id == client_id).first()
    if not segment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Segment not found")
    if not segment.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign programmes to an inactive Card Segment."
        )

    # BR-004: Inactive Card Programmes cannot be assigned
    prog = db.query(CardProgramme).filter(CardProgramme.id == payload.card_programme_id, CardProgramme.client_id == client_id).first()
    if not prog:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card Programme not found")
    if not prog.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive Card Programme to a Card Segment."
        )

    # BR-005: The same Card Programme cannot be assigned twice to the same Card Segment
    existing = (
        db.query(CardSegmentProgramme)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardSegmentProgramme.card_programme_id == payload.card_programme_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card Programme '{prog.card_programme_code}' is already assigned to this Card Segment."
        )

    # Calculate next selection order for this (segment_id, card_type)
    current_max = (
        db.query(CardSegmentProgramme.priority)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardProgramme.card_type == prog.card_type,
        )
        .order_by(CardSegmentProgramme.priority.desc())
        .first()
    )
    next_priority = (current_max[0] + 1) if (current_max and current_max[0] is not None) else 1

    def _commit_assign(s: Session, data: dict):
        new_csp = CardSegmentProgramme(
            client_id=client_id,
            segment_id=segment_id,
            card_programme_id=payload.card_programme_id,
            priority=next_priority,
            description=data.get("description"),
            active=True,
            created_by=current_user.username,
            created_date=datetime.utcnow(),
        )
        s.add(new_csp)
        s.flush()

        log_audit_event(
            db=s,
            entity_type="CARD_SEGMENT_PROGRAMME",
            entity_id=new_csp.id,
            event_code="CARD_SEGMENT_PROGRAMME_ASSIGNED",
            performed_by=current_user.username,
            branch_code=branch_service.get_effective_branch(),
            remarks=f"Assigned Card Programme '{prog.card_programme_code}' to Segment '{segment.segment_code}' (Priority {next_priority})",
            snapshot_data={
                "id": new_csp.id,
                "segment_id": segment_id,
                "card_programme_id": payload.card_programme_id,
                "card_brand": prog.card_type,
                "priority": next_priority,
            },
        )
        _resequence_brand_programmes(s, client_id, segment_id, prog.card_type)
        return new_csp.id

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME",
        entity_id=0,
        operation_code="ASSIGN",
        entity_name=f"{segment.segment_code} - {prog.card_programme_code}",
        before_payload=None,
        after_payload={"segment_id": segment_id, "card_programme_id": payload.card_programme_id, "priority": next_priority},
        commit_callback=_commit_assign,
    )


@router.delete("/{segment_id}/programmes/{programme_id}", response_model=ConfigExecutionResult)
def remove_programme_from_segment(
    segment_id: int,
    programme_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    assignment = (
        db.query(CardSegmentProgramme, CardProgramme.card_type, CardProgramme.card_programme_code)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardSegmentProgramme.card_programme_id == programme_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programme assignment not found for this segment."
        )

    csp, card_brand, prog_code = assignment

    before_snapshot = {
        "id": csp.id,
        "segment_id": csp.segment_id,
        "card_programme_id": csp.card_programme_id,
        "card_brand": card_brand,
        "priority": csp.priority,
    }

    # BR-009: Removing a programme deletes the relationship (DELETE).
    def _commit_remove(s: Session, _):
        item = (
            s.query(CardSegmentProgramme)
            .filter(
                CardSegmentProgramme.client_id == client_id,
                CardSegmentProgramme.segment_id == segment_id,
                CardSegmentProgramme.card_programme_id == programme_id,
            )
            .first()
        )
        if item:
            s.delete(item)
            s.flush()
            log_audit_event(
                db=s,
                entity_type="CARD_SEGMENT_PROGRAMME",
                entity_id=before_snapshot["id"],
                event_code="CARD_SEGMENT_PROGRAMME_REMOVED",
                performed_by=current_user.username,
                branch_code=branch_service.get_effective_branch(),
                remarks=f"Removed Card Programme '{prog_code}' from Segment ID {segment_id}",
                snapshot_data=before_snapshot,
            )
            _resequence_brand_programmes(s, client_id, segment_id, card_brand)

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME",
        entity_id=csp.id,
        operation_code="REMOVE",
        entity_name=f"Segment {segment_id} - {prog_code}",
        before_payload=before_snapshot,
        after_payload=None,
        commit_callback=_commit_remove,
    )


@router.post("/{segment_id}/programmes/reorder", response_model=ConfigExecutionResult)
def reorder_programme_selection_order(
    segment_id: int,
    payload: CardSegmentProgrammeReorder,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()
    target_assign = (
        db.query(CardSegmentProgramme, CardProgramme.card_type)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardSegmentProgramme.card_programme_id == payload.card_programme_id,
        )
        .first()
    )
    if not target_assign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Programme assignment not found for this segment."
        )

    csp_target, card_brand = target_assign

    # Get all assignments for this (segment_id, card_brand) ordered by priority
    brand_assignments = (
        db.query(CardSegmentProgramme)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.segment_id == segment_id,
            CardProgramme.card_type == card_brand,
        )
        .order_by(CardSegmentProgramme.priority.asc(), CardSegmentProgramme.id.asc())
        .all()
    )

    idx_map = {item.id: idx for idx, item in enumerate(brand_assignments)}
    curr_idx = idx_map.get(csp_target.id)

    dir_upper = payload.direction.upper()
    if dir_upper == "UP":
        if curr_idx == 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Programme is already at top priority.")
        swap_idx = curr_idx - 1
    else:  # DOWN
        if curr_idx == len(brand_assignments) - 1:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Programme is already at bottom priority.")
        swap_idx = curr_idx + 1

    neighbor_item = brand_assignments[swap_idx]

    def _commit_reorder(s: Session, _):
        t_item = s.query(CardSegmentProgramme).get(csp_target.id)
        n_item = s.query(CardSegmentProgramme).get(neighbor_item.id)
        if t_item and n_item:
            t_item.priority, n_item.priority = n_item.priority, t_item.priority
            s.flush()
            log_audit_event(
                db=s,
                entity_type="CARD_SEGMENT_PROGRAMME",
                entity_id=t_item.id,
                event_code="CARD_SEGMENT_PROGRAMME_REORDERED",
                performed_by=current_user.username,
                branch_code=branch_service.get_effective_branch(),
                remarks=f"Reordered Card Programme ID {payload.card_programme_id} ({dir_upper}) in Segment {segment_id}",
            )
            _resequence_brand_programmes(s, client_id, segment_id, card_brand)

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME",
        entity_id=csp_target.id,
        operation_code="REORDER",
        entity_name=f"Segment {segment_id} Reorder",
        before_payload={"priority": csp_target.priority},
        after_payload={"direction": dir_upper},
        commit_callback=_commit_reorder,
    )
