import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from src.db_models import (
    CardSegmentProgrammeCharge,
    CardSegmentProgramme,
    CardSegment,
    CardProgramme,
    CardChargesHeader,
    CardChargeEntry,
    MakerCheckerWorkItem,
    ProcessingMode,
)
from src.models import (
    UserInfo,
    ConfigExecutionResult,
    CardSegmentProgrammeChargeCreate,
    CardSegmentProgrammeChargeUpdate,
    CardSegmentProgrammeChargeListItem,
    CardSegmentProgrammeChargeDetail,
    CardSegmentProgrammeLookup,
)
from src.api.auth import get_current_user, require_permission, get_db
from src.api.branch_context_service import get_branch_context, BranchContextService
from src.api.config_orchestrator import ConfigurationOrchestrator
from src.api.card_segment_programme_charges_validation import (
    validate_card_segment_programme_charge_payload,
)

logger = logging.getLogger("card_segment_programme_charges")

router = APIRouter(
    prefix="/config/card-segment-programme-charges",
    tags=["Card Segment Programme Charges"],
)


@router.get("", response_model=dict)
def list_card_segment_programme_charges(
    search: Optional[str] = Query(None, description="Search by segment, programme, or charge name"),
    status_filter: Optional[str] = Query("active", description="Filter status: 'all', 'active', 'inactive', 'pending'"),
    card_segment_programme_id: Optional[int] = Query(None, description="Filter by Card Segment Programme ID"),
    segment_id: Optional[int] = Query(None, description="Filter by Card Segment ID"),
    card_programme_id: Optional[int] = Query(None, description="Filter by Card Programme ID"),
    charge_header_id: Optional[int] = Query(None, description="Filter by Charge Header ID"),
    processing_mode_code: Optional[str] = Query(None, description="Filter by processing mode code"),
    sort_by: Optional[str] = Query(None, description="Sort column: segment_code, card_programme_code, processing_mode_code, charge_name, priority, active, id"),
    sort_dir: Optional[str] = Query("asc", description="Sort direction: asc or desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.view")
    client_id = branch_service.get_client_id()

    query = (
        db.query(
            CardSegmentProgrammeCharge,
            CardSegment.segment_code,
            CardSegment.segment_name,
            CardProgramme.card_programme_code,
            CardProgramme.card_programme_name,
            CardProgramme.card_type.label("card_brand"),
            CardChargesHeader.charge_name,
        )
        .join(
            CardSegmentProgramme,
            CardSegmentProgrammeCharge.card_segment_programme_id == CardSegmentProgramme.id,
        )
        .join(CardSegment, CardSegmentProgramme.segment_id == CardSegment.id)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .join(
            CardChargesHeader,
            CardSegmentProgrammeCharge.charge_header_id == CardChargesHeader.id,
        )
        .filter(CardSegmentProgrammeCharge.client_id == client_id)
    )

    if card_segment_programme_id:
        query = query.filter(CardSegmentProgrammeCharge.card_segment_programme_id == card_segment_programme_id)
    if segment_id:
        query = query.filter(CardSegmentProgramme.segment_id == segment_id)
    if card_programme_id:
        query = query.filter(CardSegmentProgramme.card_programme_id == card_programme_id)
    if charge_header_id:
        query = query.filter(CardSegmentProgrammeCharge.charge_header_id == charge_header_id)
    if processing_mode_code:
        query = query.filter(CardSegmentProgrammeCharge.processing_mode_code == processing_mode_code.strip().upper())

    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CardSegment.segment_code.ilike(term),
                CardSegment.segment_name.ilike(term),
                CardProgramme.card_programme_code.ilike(term),
                CardProgramme.card_programme_name.ilike(term),
                CardChargesHeader.charge_name.ilike(term),
            )
        )

    # Status filtering
    filter_lower = (status_filter or "active").strip().lower()

    # Correlate pending Maker/Checker work items
    pending_items = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.client_id == client_id,
            MakerCheckerWorkItem.entity_type_code == "CARD_SEGMENT_PROGRAMME_CHARGE",
            MakerCheckerWorkItem.status_code == "PENDING",
        )
        .all()
    )
    pending_map = {item.entity_id: f"MC-{item.id:08d}" for item in pending_items if item.entity_id}

    if filter_lower == "active":
        query = query.filter(CardSegmentProgrammeCharge.active == True)
    elif filter_lower == "inactive":
        query = query.filter(CardSegmentProgrammeCharge.active == False)
    elif filter_lower == "pending":
        pending_ids = list(pending_map.keys())
        query = query.filter(CardSegmentProgrammeCharge.id.in_(pending_ids if pending_ids else [-1]))

    sort_map = {
        "segment_code": CardSegment.segment_code,
        "segment_name": CardSegment.segment_name,
        "card_programme_code": CardProgramme.card_programme_code,
        "card_programme_name": CardProgramme.card_programme_name,
        "processing_mode_code": CardSegmentProgrammeCharge.processing_mode_code,
        "charge_name": CardChargesHeader.charge_name,
        "priority": CardSegmentProgrammeCharge.priority,
        "active": CardSegmentProgrammeCharge.active,
        "id": CardSegmentProgrammeCharge.id,
    }

    if sort_by and sort_by in sort_map:
        col = sort_map[sort_by]
        if sort_dir and sort_dir.lower() == "desc":
            query = query.order_by(col.desc(), CardSegmentProgrammeCharge.id.desc())
        else:
            query = query.order_by(col.asc(), CardSegmentProgrammeCharge.id.asc())
    else:
        query = query.order_by(CardSegmentProgrammeCharge.priority.asc(), CardSegmentProgrammeCharge.id.desc())

    total = query.count()
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    items = []
    for row in results:
        spc, seg_code, seg_name, prog_code, prog_name, brand, chg_name = row
        work_item_id = pending_map.get(spc.id)
        items.append(
            CardSegmentProgrammeChargeListItem(
                id=spc.id,
                client_id=spc.client_id,
                card_segment_programme_id=spc.card_segment_programme_id,
                segment_code=seg_code,
                segment_name=seg_name,
                card_programme_code=prog_code,
                card_programme_name=prog_name,
                card_brand=brand,
                charge_header_id=spc.charge_header_id,
                charge_name=chg_name,
                priority=spc.priority or 0,
                active=spc.active,
                processing_mode_code=spc.processing_mode_code or "NORMAL",
                has_pending_change=bool(work_item_id),
                pending_work_item_id=work_item_id,
                created_by=spc.created_by,
                created_date=spc.created_date,
                last_modified_by=spc.last_modified_by,
                last_modified_date=spc.last_modified_date,
            )
        )

    return {
        "items": [item.dict() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/segment-programmes/lookup", response_model=list[CardSegmentProgrammeLookup])
def get_segment_programme_lookups(
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.view")
    client_id = branch_service.get_client_id()

    rows = (
        db.query(
            CardSegmentProgramme.id,
            CardSegment.id.label("segment_id"),
            CardSegment.segment_code,
            CardSegment.segment_name,
            CardProgramme.id.label("programme_id"),
            CardProgramme.card_programme_code,
            CardProgramme.card_programme_name,
            CardProgramme.card_type.label("card_brand"),
        )
        .join(CardSegment, CardSegmentProgramme.segment_id == CardSegment.id)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .filter(
            CardSegmentProgramme.client_id == client_id,
            CardSegmentProgramme.active == True,
            CardSegment.active == True,
            CardProgramme.active == True,
        )
        .order_by(CardSegment.segment_code.asc(), CardProgramme.card_programme_code.asc())
        .all()
    )

    return [
        CardSegmentProgrammeLookup(
            id=r.id,
            segment_id=r.segment_id,
            segment_code=r.segment_code,
            segment_name=r.segment_name,
            card_programme_id=r.programme_id,
            card_programme_code=r.card_programme_code,
            card_programme_name=r.card_programme_name,
            card_brand=r.card_brand,
        )
        for r in rows
    ]


@router.get("/charge-headers/lookup", response_model=list[dict])
def get_charge_header_lookups(
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.view")
    client_id = branch_service.get_client_id()

    headers = (
        db.query(CardChargesHeader)
        .filter(CardChargesHeader.client_id == client_id, CardChargesHeader.active == True)
        .order_by(CardChargesHeader.charge_name.asc())
        .all()
    )

    return [
        {
            "id": h.id,
            "charge_name": h.charge_name,
            "description": h.description,
            "active": h.active,
        }
        for h in headers
    ]


@router.get("/processing-modes/lookup", response_model=list[dict])
def get_processing_mode_lookups(
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.view")

    modes = (
        db.query(ProcessingMode)
        .filter(ProcessingMode.active == True)
        .order_by(ProcessingMode.display_order.asc(), ProcessingMode.processing_mode_code.asc())
        .all()
    )

    return [
        {
            "processing_mode_code": m.processing_mode_code,
            "processing_mode_name": m.processing_mode_name,
            "display_order": m.display_order,
            "active": m.active,
        }
        for m in modes
    ]


@router.get("/{id}", response_model=CardSegmentProgrammeChargeDetail)
def get_card_segment_programme_charge_detail(
    id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.view")
    client_id = branch_service.get_client_id()

    row = (
        db.query(
            CardSegmentProgrammeCharge,
            CardSegment.segment_code,
            CardSegment.segment_name,
            CardProgramme.card_programme_code,
            CardProgramme.card_programme_name,
            CardProgramme.card_type.label("card_brand"),
            CardChargesHeader.charge_name,
        )
        .join(
            CardSegmentProgramme,
            CardSegmentProgrammeCharge.card_segment_programme_id == CardSegmentProgramme.id,
        )
        .join(CardSegment, CardSegmentProgramme.segment_id == CardSegment.id)
        .join(CardProgramme, CardSegmentProgramme.card_programme_id == CardProgramme.id)
        .join(
            CardChargesHeader,
            CardSegmentProgrammeCharge.charge_header_id == CardChargesHeader.id,
        )
        .filter(
            CardSegmentProgrammeCharge.id == id,
            CardSegmentProgrammeCharge.client_id == client_id,
        )
        .first()
    )

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Segment Programme Charge #{id} not found for this tenant.",
        )

    spc, seg_code, seg_name, prog_code, prog_name, brand, chg_name = row

    # Entries list for details view
    entries = (
        db.query(CardChargeEntry)
        .filter(CardChargeEntry.charge_header_id == spc.charge_header_id)
        .order_by(CardChargeEntry.sequence_no.asc())
        .all()
    )
    entries_list = [
        {
            "id": e.id,
            "sequence_no": e.sequence_no,
            "posting_account_type": e.posting_account_type,
            "dr_cr": e.dr_cr,
            "narration": e.narration,
            "posting_entry_type": e.posting_entry_type,
            "amount": float(e.amount),
            "currency_code": e.currency_code,
            "active": e.active,
        }
        for e in entries
    ]

    pending_wi = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.client_id == client_id,
            MakerCheckerWorkItem.entity_type_code == "CARD_SEGMENT_PROGRAMME_CHARGE",
            MakerCheckerWorkItem.entity_id == id,
            MakerCheckerWorkItem.status_code == "PENDING",
        )
        .first()
    )
    work_item_id = f"MC-{pending_wi.id:08d}" if pending_wi else None

    return CardSegmentProgrammeChargeDetail(
        id=spc.id,
        client_id=spc.client_id,
        card_segment_programme_id=spc.card_segment_programme_id,
        segment_code=seg_code,
        segment_name=seg_name,
        card_programme_code=prog_code,
        card_programme_name=prog_name,
        card_brand=brand,
        charge_header_id=spc.charge_header_id,
        charge_name=chg_name,
        priority=spc.priority or 0,
        active=spc.active,
        processing_mode_code=spc.processing_mode_code or "NORMAL",
        has_pending_change=bool(work_item_id),
        pending_work_item_id=work_item_id,
        created_by=spc.created_by,
        created_date=spc.created_date,
        last_modified_by=spc.last_modified_by,
        last_modified_date=spc.last_modified_date,
        entries=entries_list,
    )


@router.post("", response_model=ConfigExecutionResult)
def create_card_segment_programme_charge(
    payload: CardSegmentProgrammeChargeCreate,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()

    # Pre-validate payload
    validate_card_segment_programme_charge_payload(
        db=db,
        client_id=client_id,
        card_segment_programme_id=payload.card_segment_programme_id,
        charge_header_id=payload.charge_header_id,
        processing_mode_code=payload.processing_mode_code,
        priority=payload.priority or 0,
        is_update=False,
    )

    csp = (
        db.query(CardSegmentProgramme)
        .filter(CardSegmentProgramme.id == payload.card_segment_programme_id)
        .first()
    )
    chg = (
        db.query(CardChargesHeader)
        .filter(CardChargesHeader.id == payload.charge_header_id)
        .first()
    )

    entity_name = f"CSP #{payload.card_segment_programme_id} - {chg.charge_name} ({payload.processing_mode_code.upper()})"

    after_dict = {
        "card_segment_programme_id": payload.card_segment_programme_id,
        "charge_header_id": payload.charge_header_id,
        "processing_mode_code": payload.processing_mode_code.strip().upper(),
        "priority": payload.priority or 0,
        "active": True,
    }

    def _commit_callback(session: Session, data: dict):
        new_spc = CardSegmentProgrammeCharge(
            client_id=client_id,
            card_segment_programme_id=data["card_segment_programme_id"],
            charge_header_id=data["charge_header_id"],
            processing_mode_code=data["processing_mode_code"],
            priority=data["priority"],
            active=True,
            created_by=current_user.username,
        )
        session.add(new_spc)
        session.flush()
        return new_spc.id

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME_CHARGE",
        entity_id=0,
        operation_code="CREATE",
        entity_name=entity_name,
        before_payload=None,
        after_payload=after_dict,
        commit_callback=_commit_callback,
    )


@router.put("/{id}", response_model=ConfigExecutionResult)
def update_card_segment_programme_charge(
    id: int,
    payload: CardSegmentProgrammeChargeUpdate,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()

    existing = (
        db.query(CardSegmentProgrammeCharge)
        .filter(
            CardSegmentProgrammeCharge.id == id,
            CardSegmentProgrammeCharge.client_id == client_id,
        )
        .first()
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Segment Programme Charge #{id} not found for this tenant.",
        )

    # Validate update payload
    validate_card_segment_programme_charge_payload(
        db=db,
        client_id=client_id,
        card_segment_programme_id=existing.card_segment_programme_id,
        charge_header_id=payload.charge_header_id,
        processing_mode_code=payload.processing_mode_code,
        priority=payload.priority or 0,
        is_update=True,
        current_charge_mapping_id=id,
    )

    before_dict = {
        "id": existing.id,
        "card_segment_programme_id": existing.card_segment_programme_id,
        "charge_header_id": existing.charge_header_id,
        "processing_mode_code": existing.processing_mode_code,
        "priority": existing.priority,
        "active": existing.active,
    }

    after_dict = {
        "id": existing.id,
        "card_segment_programme_id": existing.card_segment_programme_id,
        "charge_header_id": payload.charge_header_id,
        "processing_mode_code": payload.processing_mode_code.strip().upper(),
        "priority": payload.priority or 0,
        "active": existing.active,
    }

    def _commit_callback(session: Session, data: dict):
        spc = session.query(CardSegmentProgrammeCharge).get(id)
        if spc:
            spc.charge_header_id = data["charge_header_id"]
            spc.processing_mode_code = data["processing_mode_code"]
            spc.priority = data["priority"]
            spc.last_modified_by = current_user.username
            session.flush()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME_CHARGE",
        entity_id=id,
        operation_code="UPDATE",
        entity_name=f"Card Segment Programme Charge #{id}",
        before_payload=before_dict,
        after_payload=after_dict,
        commit_callback=_commit_callback,
    )


@router.post("/{id}/deactivate", response_model=ConfigExecutionResult)
def deactivate_card_segment_programme_charge(
    id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()

    existing = (
        db.query(CardSegmentProgrammeCharge)
        .filter(
            CardSegmentProgrammeCharge.id == id,
            CardSegmentProgrammeCharge.client_id == client_id,
        )
        .first()
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Segment Programme Charge #{id} not found for this tenant.",
        )

    if not existing.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card Segment Programme Charge #{id} is already inactive.",
        )

    before_dict = {"id": id, "active": True}
    after_dict = {"id": id, "active": False}

    def _commit_callback(session: Session, _):
        spc = session.query(CardSegmentProgrammeCharge).get(id)
        if spc:
            spc.active = False
            spc.last_modified_by = current_user.username
            session.flush()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME_CHARGE",
        entity_id=id,
        operation_code="DEACTIVATE",
        entity_name=f"Deactivate Card Segment Programme Charge #{id}",
        before_payload=before_dict,
        after_payload=after_dict,
        commit_callback=_commit_callback,
    )


@router.post("/{id}/activate", response_model=ConfigExecutionResult)
def activate_card_segment_programme_charge(
    id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    require_permission(db, current_user, "config.manage")
    client_id = branch_service.get_client_id()

    existing = (
        db.query(CardSegmentProgrammeCharge)
        .filter(
            CardSegmentProgrammeCharge.id == id,
            CardSegmentProgrammeCharge.client_id == client_id,
        )
        .first()
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Segment Programme Charge #{id} not found for this tenant.",
        )

    if existing.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card Segment Programme Charge #{id} is already active.",
        )

    before_dict = {"id": id, "active": False}
    after_dict = {"id": id, "active": True}

    def _commit_callback(session: Session, _):
        spc = session.query(CardSegmentProgrammeCharge).get(id)
        if spc:
            spc.active = True
            spc.last_modified_by = current_user.username
            session.flush()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_SEGMENT_PROGRAMME_CHARGE",
        entity_id=id,
        operation_code="ACTIVATE",
        entity_name=f"Activate Card Segment Programme Charge #{id}",
        before_payload=before_dict,
        after_payload=after_dict,
        commit_callback=_commit_callback,
    )
