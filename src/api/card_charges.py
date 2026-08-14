from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from src.db import get_db
from src.api.auth import get_current_user
from src.db_models import (
    CardChargesHeader,
    CardChargeEntry,
    MakerCheckerWorkItem,
    PostingBranchType,
    PostingEntryType,
)
from src.models import (
    UserInfo,
    CardChargesHeaderRead,
    CardChargesHeaderCreate,
    CardChargesHeaderUpdate,
    CardChargeEntryRead,
    PostingBranchTypeRead,
    PostingEntryTypeRead,
    ConfigExecutionResult,
)
from src.api.config_orchestrator import ConfigurationOrchestrator
from src.api.card_charges_validation import validate_card_charges_aggregate

router = APIRouter(prefix="/config", tags=["Card Charges"])


@router.get("/card-charges", response_model=list[CardChargesHeaderRead])
def list_card_charges(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query("ACTIVE"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    query = db.query(CardChargesHeader)
    if "super_admin" not in current_user.roles:
        query = query.filter(CardChargesHeader.client_id == current_user.client_id)

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                CardChargesHeader.charge_name.ilike(term),
                CardChargesHeader.description.ilike(term),
            )
        )

    # Status filter (ACTIVE, INACTIVE, ALL)
    if status_filter:
        sf = status_filter.upper().strip()
        if sf == "ACTIVE":
            query = query.filter(CardChargesHeader.active == True)
        elif sf == "INACTIVE":
            query = query.filter(CardChargesHeader.active == False)

    headers = query.order_by(CardChargesHeader.charge_name.asc()).all()

    # Fetch pending Maker/Checker items for correlation
    pending_items = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.entity_type_code == "CARD_CHARGES_HEADER",
            MakerCheckerWorkItem.status_code == "PENDING",
            MakerCheckerWorkItem.client_id == current_user.client_id,
        )
        .all()
    )
    pending_map = {item.entity_id: item for item in pending_items}

    result = []
    for h in headers:
        entries = (
            db.query(CardChargeEntry)
            .filter(CardChargeEntry.charge_header_id == h.id)
            .order_by(CardChargeEntry.sequence_no.asc())
            .all()
        )
        entry_reads = [CardChargeEntryRead.model_validate(e) for e in entries]

        # Determine effective currency from entries
        effective_currency = "NGN"
        if entry_reads:
            active_entries = [e for e in entry_reads if e.active]
            if active_entries:
                effective_currency = active_entries[0].currency_code
            else:
                effective_currency = entry_reads[0].currency_code

        pending = pending_map.get(h.id)

        h_read = CardChargesHeaderRead(
            id=h.id,
            client_id=h.client_id,
            charge_name=h.charge_name,
            description=h.description,
            active=h.active,
            created_by=h.created_by,
            created_date=h.created_date,
            last_modified_by=h.last_modified_by,
            last_modified_date=h.last_modified_date,
            entries=entry_reads,
            entries_count=len(entries),
            effective_currency=effective_currency,
            has_pending_change=bool(pending),
            pending_work_item_id=pending.id if pending else None,
            pending_work_item_number=pending.work_item_number if pending else None,
            pending_operation_code=pending.operation_code if pending else None,
        )
        result.append(h_read)

    return result


@router.get("/card-charges/{id}", response_model=CardChargesHeaderRead)
def get_card_charge_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    query = db.query(CardChargesHeader).filter(CardChargesHeader.id == id)
    if "super_admin" not in current_user.roles:
        query = query.filter(CardChargesHeader.client_id == current_user.client_id)

    header = query.first()
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Charges Header #{id} not found.",
        )

    entries = (
        db.query(CardChargeEntry)
        .filter(CardChargeEntry.charge_header_id == header.id)
        .order_by(CardChargeEntry.sequence_no.asc())
        .all()
    )
    entry_reads = [CardChargeEntryRead.model_validate(e) for e in entries]

    effective_currency = "NGN"
    if entry_reads:
        active_entries = [e for e in entry_reads if e.active]
        if active_entries:
            effective_currency = active_entries[0].currency_code
        else:
            effective_currency = entry_reads[0].currency_code

    pending = (
        db.query(MakerCheckerWorkItem)
        .filter(
            MakerCheckerWorkItem.entity_type_code == "CARD_CHARGES_HEADER",
            MakerCheckerWorkItem.entity_id == header.id,
            MakerCheckerWorkItem.status_code == "PENDING",
            MakerCheckerWorkItem.client_id == current_user.client_id,
        )
        .first()
    )

    return CardChargesHeaderRead(
        id=header.id,
        client_id=header.client_id,
        charge_name=header.charge_name,
        description=header.description,
        active=header.active,
        created_by=header.created_by,
        created_date=header.created_date,
        last_modified_by=header.last_modified_by,
        last_modified_date=header.last_modified_date,
        entries=entry_reads,
        entries_count=len(entries),
        effective_currency=effective_currency,
        has_pending_change=bool(pending),
        pending_work_item_id=pending.id if pending else None,
        pending_work_item_number=pending.work_item_number if pending else None,
        pending_operation_code=pending.operation_code if pending else None,
    )


@router.post("/card-charges", response_model=ConfigExecutionResult)
def create_card_charges(
    payload: CardChargesHeaderCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    entries_dict = [e.dict() for e in payload.entries]

    # Pre-validate before submitting to Maker/Checker
    validate_card_charges_aggregate(
        db=db,
        client_id=current_user.client_id,
        charge_name=payload.charge_name,
        entries=entries_dict,
        is_update=False,
    )

    after_payload = payload.dict()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_CHARGES_HEADER",
        entity_id=0,
        operation_code="CREATE",
        entity_name=payload.charge_name,
        before_payload=None,
        after_payload=after_payload,
    )


@router.put("/card-charges/{id}", response_model=ConfigExecutionResult)
def update_card_charges(
    id: int,
    payload: CardChargesHeaderUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    existing = (
        db.query(CardChargesHeader)
        .filter(CardChargesHeader.id == id, CardChargesHeader.client_id == current_user.client_id)
        .first()
    )
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Charges Header #{id} not found.",
        )

    charge_name = payload.charge_name if payload.charge_name is not None else existing.charge_name
    description = payload.description if payload.description is not None else existing.description
    active = payload.active if payload.active is not None else existing.active

    existing_entries = (
        db.query(CardChargeEntry)
        .filter(CardChargeEntry.charge_header_id == id)
        .order_by(CardChargeEntry.sequence_no.asc())
        .all()
    )
    existing_entries_dict = [
        {
            "id": e.id,
            "sequence_no": e.sequence_no,
            "posting_account_type": e.posting_account_type,
            "dr_cr": e.dr_cr,
            "narration": e.narration,
            "posting_account_number": e.posting_account_number,
            "posting_branch_type": e.posting_branch_type,
            "posting_entry_type": e.posting_entry_type,
            "amount": float(e.amount),
            "currency_code": e.currency_code,
            "active": e.active,
        }
        for e in existing_entries
    ]

    if payload.entries is not None:
        entries_dict = [e.dict() for e in payload.entries]
    else:
        entries_dict = existing_entries_dict

    # Pre-validate before submitting
    validate_card_charges_aggregate(
        db=db,
        client_id=current_user.client_id,
        charge_name=charge_name,
        entries=entries_dict,
        is_update=True,
        header_id=id,
    )

    before_payload = {
        "id": existing.id,
        "charge_name": existing.charge_name,
        "description": existing.description,
        "active": existing.active,
        "entries": existing_entries_dict,
    }

    after_payload = {
        "charge_name": charge_name,
        "description": description,
        "active": active,
        "entries": entries_dict,
    }

    # Check for no-change UPDATE
    if (
        before_payload["charge_name"] == after_payload["charge_name"]
        and before_payload["description"] == after_payload["description"]
        and before_payload["active"] == after_payload["active"]
        and before_payload["entries"] == after_payload["entries"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes detected. Nothing to submit for approval.",
        )

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_CHARGES_HEADER",
        entity_id=id,
        operation_code="UPDATE",
        entity_name=charge_name,
        before_payload=before_payload,
        after_payload=after_payload,
    )


@router.post("/card-charges/{id}/deactivate", response_model=ConfigExecutionResult)
def deactivate_card_charge(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    header = (
        db.query(CardChargesHeader)
        .filter(CardChargesHeader.id == id, CardChargesHeader.client_id == current_user.client_id)
        .first()
    )
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Charge Header #{id} not found.",
        )
    if not header.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card Charge Header '{header.charge_name}' is already inactive.",
        )

    def _commit_deactivate(s: Session, _):
        header.active = False
        header.last_modified_by = current_user.user_id
        header.last_modified_date = datetime.utcnow()
        s.commit()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_CHARGES_HEADER",
        entity_id=id,
        operation_code="DEACTIVATE",
        entity_name=f"Deactivate Card Charge Header '{header.charge_name}'",
        before_payload={"id": header.id, "charge_name": header.charge_name, "active": True},
        after_payload={"id": header.id, "charge_name": header.charge_name, "active": False},
        commit_callback=_commit_deactivate,
    )


@router.post("/card-charges/{id}/activate", response_model=ConfigExecutionResult)
def activate_card_charge(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    header = (
        db.query(CardChargesHeader)
        .filter(CardChargesHeader.id == id, CardChargesHeader.client_id == current_user.client_id)
        .first()
    )
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Charge Header #{id} not found.",
        )
    if header.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card Charge Header '{header.charge_name}' is already active.",
        )

    def _commit_activate(s: Session, _):
        header.active = True
        header.last_modified_by = current_user.user_id
        header.last_modified_date = datetime.utcnow()
        s.commit()

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="CARD_CHARGES_HEADER",
        entity_id=id,
        operation_code="ACTIVATE",
        entity_name=f"Activate Card Charge Header '{header.charge_name}'",
        before_payload={"id": header.id, "charge_name": header.charge_name, "active": False},
        after_payload={"id": header.id, "charge_name": header.charge_name, "active": True},
        commit_callback=_commit_activate,
    )


@router.get("/posting-branch-types", response_model=list[PostingBranchTypeRead])
def list_posting_branch_types(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return (
        db.query(PostingBranchType)
        .filter(
            or_(
                PostingBranchType.client_id == current_user.client_id,
                PostingBranchType.client_id == 1,
            ),
            PostingBranchType.active == True,
        )
        .all()
    )


@router.get("/posting-entry-types", response_model=list[PostingEntryTypeRead])
def list_posting_entry_types(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return (
        db.query(PostingEntryType)
        .filter(
            or_(
                PostingEntryType.client_id == current_user.client_id,
                PostingEntryType.client_id == 1,
            ),
            PostingEntryType.active == True,
        )
        .all()
    )
