from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import (
    CardSegmentProgrammeCharge,
    CardSegmentProgramme,
    CardSegment,
    CardProgramme,
    CardChargesHeader,
    ProcessingMode,
)


def validate_card_segment_programme_charge_payload(
    db: Session,
    client_id: int,
    card_segment_programme_id: int,
    charge_header_id: int,
    processing_mode_code: str,
    priority: int = 0,
    is_update: bool = False,
    current_charge_mapping_id: Optional[int] = None,
) -> None:
    # 1. Processing Mode Code validation against authoritative DB table
    mode_upper = (processing_mode_code or "").strip().upper()
    if not mode_upper:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Processing mode code is required.",
        )

    active_modes = (
        db.query(ProcessingMode)
        .filter(ProcessingMode.active == True)
        .all()
    )
    active_mode_codes = {pm.processing_mode_code.strip().upper() for pm in active_modes}

    if mode_upper not in active_mode_codes:
        allowed = ", ".join(sorted(active_mode_codes))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or inactive processing mode code '{processing_mode_code}'. Allowed active values: {allowed}",
        )

    # 2. Card Segment Programme Existence & Tenant Verification
    csp = (
        db.query(CardSegmentProgramme)
        .filter(
            CardSegmentProgramme.id == card_segment_programme_id,
            CardSegmentProgramme.client_id == client_id,
        )
        .first()
    )
    if not csp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Segment Programme mapping #{card_segment_programme_id} not found for this tenant.",
        )
    if not csp.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign charges to an inactive Card Segment Programme mapping.",
        )

    # Verify parent Segment and Programme are also active
    segment = db.query(CardSegment).filter(CardSegment.id == csp.segment_id, CardSegment.client_id == client_id).first()
    if not segment or not segment.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign charges because the associated Card Segment is inactive.",
        )

    programme = db.query(CardProgramme).filter(CardProgramme.id == csp.card_programme_id, CardProgramme.client_id == client_id).first()
    if not programme or not programme.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign charges because the associated Card Programme is inactive.",
        )

    # 3. Charge Header Existence & Active Status Verification
    header = (
        db.query(CardChargesHeader)
        .filter(
            CardChargesHeader.id == charge_header_id,
            CardChargesHeader.client_id == client_id,
        )
        .first()
    )
    if not header:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Card Charge Header #{charge_header_id} not found for this tenant.",
        )
    if not header.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot link inactive Card Charge Header '{header.charge_name}'.",
        )

    # 4. Duplicate Mapping Guard
    dup_query = db.query(CardSegmentProgrammeCharge).filter(
        CardSegmentProgrammeCharge.client_id == client_id,
        CardSegmentProgrammeCharge.card_segment_programme_id == card_segment_programme_id,
        CardSegmentProgrammeCharge.processing_mode_code == mode_upper,
        CardSegmentProgrammeCharge.charge_header_id == charge_header_id,
    )
    if is_update and current_charge_mapping_id:
        dup_query = dup_query.filter(CardSegmentProgrammeCharge.id != current_charge_mapping_id)

    existing_dup = dup_query.first()
    if existing_dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A charge mapping already exists for this Segment Programme under processing mode '{mode_upper}' with Charge Header '{header.charge_name}'.",
        )
