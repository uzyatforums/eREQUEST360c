from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import CardChargesHeader, PostingBranchType, PostingEntryType

VALID_BRANCH_TYPES = {"HQ", "RB", "CB"}
VALID_ENTRY_TYPES = {
    "CISSUANCE", "GSTOCK", "GPERSO", "GINC", "CVATA", "GVATA",
    "CMAINT", "GMAINT", "CVATB", "GVATB", "GEXPENSE", "CDELIVERY", "GDELIVERY"
}


def validate_card_charges_aggregate(
    db: Session,
    client_id: int,
    charge_name: str,
    entries: List[Dict[str, Any]],
    is_update: bool = False,
    header_id: Optional[int] = None,
) -> None:
    if not charge_name or not charge_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Charge Header Name is required.",
        )

    # 1. Header Name Uniqueness within tenant
    query = db.query(CardChargesHeader).filter(
        CardChargesHeader.client_id == client_id,
        CardChargesHeader.charge_name == charge_name.strip(),
    )
    if is_update and header_id is not None:
        query = query.filter(CardChargesHeader.id != header_id)
    
    existing = query.first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Card Charges Header '{charge_name.strip()}' already exists.",
        )

    if not entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one Charge Entry line is required.",
        )

    # Fetch tenant lookups if present in DB
    db_branch_types = [
        r.posting_branch_type for r in db.query(PostingBranchType.posting_branch_type).filter(
            (PostingBranchType.client_id == client_id) | (PostingBranchType.client_id == 1)
        ).all()
    ]
    valid_branch_types = set(db_branch_types) if db_branch_types else VALID_BRANCH_TYPES

    db_entry_types = [
        r.posting_entry_type for r in db.query(PostingEntryType.posting_entry_type).filter(
            (PostingEntryType.client_id == client_id) | (PostingEntryType.client_id == 1)
        ).all()
    ]
    valid_entry_types = set(db_entry_types) if db_entry_types else VALID_ENTRY_TYPES

    # 2. Entry Level Validations & Currency Consistency
    currencies = set()
    seen_entry_types = set()
    total_debits = 0.0
    total_credits = 0.0

    for idx, e in enumerate(entries, start=1):
        act_raw = e.get("active")
        is_active = True if act_raw is None or act_raw is True or str(act_raw).lower() == "true" else False
        
        narration = str(e.get("narration", "")).strip()
        if is_active and not narration:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entry line {idx}: Narration is required.",
            )

        dr_cr = str(e.get("dr_cr", "")).upper().strip()
        if dr_cr not in ("D", "C"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entry line {idx}: dr_cr must be 'D' (Debit) or 'C' (Credit).",
            )

        entry_type = str(e.get("posting_entry_type", "")).strip()
        if not entry_type or entry_type not in valid_entry_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entry line {idx}: Invalid posting_entry_type '{entry_type}'.",
            )

        if is_active:
            if entry_type in seen_entry_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Duplicate posting_entry_type '{entry_type}' is not allowed in the same Card Charges Profile.",
                )
            seen_entry_types.add(entry_type)

        branch_type = e.get("posting_branch_type")
        if branch_type and str(branch_type).strip() not in valid_branch_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entry line {idx}: Invalid posting_branch_type '{branch_type}'.",
            )

        amount = float(e.get("amount", 0.0))
        if amount < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Entry line {idx}: Amount cannot be negative.",
            )

        currency = str(e.get("currency_code", "NGN")).upper().strip()
        currencies.add(currency)

        # Count active/effective entries towards balance
        if is_active:
            if dr_cr == "D":
                total_debits += amount
            elif dr_cr == "C":
                total_credits += amount

    if len(currencies) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"All entries under a Charge Header must share the same currency. Found multiple: {', '.join(currencies)}",
        )

    # 3. Accounting Balance Validation (round to 2 decimal places)
    diff = round(total_debits - total_credits, 2)
    if diff != 0:
        currency_label = list(currencies)[0] if currencies else "NGN"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Unbalanced Card Charges Aggregate: Total Debits ({currency_label} {total_debits:,.2f}) "
                f"must equal Total Credits ({currency_label} {total_credits:,.2f}). Difference: {currency_label} {abs(diff):,.2f}."
            ),
        )
