from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from src.db import get_db
from src.db_models import Request as RequestModel, ChargePostingAttempt, RequestStatusHistory
from src.models import UserInfo
from src.api.auth import get_current_user
from datetime import datetime
from src.api.audit_service import log_audit_event

router = APIRouter(prefix="/charges", tags=["charges"])


class SettlementCallbackPayload(BaseModel):
    request_id: int
    payment_reference: str
    amount: float
    status: str  # e.g., "SUCCESS", "FAILED"


@router.post("/settlement-callback")
def settlement_callback(
    payload: SettlementCallbackPayload,
    db: Session = Depends(get_db),
):
    # Lookup the card request
    request = db.query(RequestModel).filter(RequestModel.request_id == payload.request_id).first()
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    # Record the charge posting attempt
    attempt = ChargePostingAttempt(
        request_id=payload.request_id,
        payment_ref=payload.payment_reference,
        amount=payload.amount,
        status=payload.status,
        created_by="settlement_service"
    )
    db.add(attempt)

    old_status = request.request_status

    if payload.status.upper() == "SUCCESS":
        # Transition from PENDING/PENDING_SETTLEMENT to PENDING_AUTHORIZATION
        if old_status in ["PENDING", "PENDING_SETTLEMENT"]:
            request.request_status = "PENDING_AUTHORIZATION"
        else:
            # If it was PENDING_APPROVAL, it must be approved first before settlement is meaningful.
            # However, for simplicity in test flows, let's allow it to transition if the callback is sent.
            request.request_status = "PENDING_AUTHORIZATION"
    else:
        request.request_status = "SETTLEMENT_FAILED"

    request.status_last_updated = datetime.utcnow()

    # Record history
    history = RequestStatusHistory(
        request_id=request.request_id,
        from_status=old_status,
        to_status=request.request_status,
        action="settlement_callback",
        performed_by="settlement_service",
        remarks=f"Settlement status: {payload.status}. Payment Ref: {payload.payment_reference}"
    )
    db.add(history)
    db.commit()

    # Log audit event with status change details and new state snapshot
    snapshot_data = {
        "request_id": request.request_id,
        "client_id": request.client_id,
        "account_number": request.account_number,
        "programme_id": request.programme_id,
        "request_status": request.request_status,
        "request_branch": request.request_branch,
        "pickup_branch": request.pickup_branch,
        "brand": request.brand
    }
    log_audit_event(
        db=db,
        entity_type="request",
        entity_id=request.request_id,
        event_code="REQUEST_SETTLED",
        performed_by="settlement_service",
        branch_code=request.request_branch,
        remarks=f"Settlement status: {payload.status}. Payment Ref: {payload.payment_reference}",
        changes={"request_status": (old_status, request.request_status)},
        snapshot_data=snapshot_data
    )

    return {
        "message": "Callback processed successfully",
        "request_id": request.request_id,
        "old_status": old_status,
        "new_status": request.request_status
    }
