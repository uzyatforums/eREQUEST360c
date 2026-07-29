from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from src.db import get_db
from src.models import (
    CardProgrammeRead,
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    NochargeCheckRequest,
    NochargeCheckResponse,
    UserInfo
)
from src.db_models import (
    CardProgramme,
    CardSegmentProgramme,
    Request as RequestModel,
    ClientCardPolicy,
    NochargePolicy
)
from src.api.auth import get_current_user

router = APIRouter(prefix="/eligibility", tags=["eligibility"])


@router.get("/account/{account_number}", response_model=list[CardProgrammeRead])
def get_account_eligibility(
    account_number: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Parse first 2 digits as acct_seg (e.g. '10' or '20')
    acct_seg = account_number[:2]
    
    # Get active card programmes mapped to this segment group directly
    segment_progs = db.query(CardSegmentProgramme).filter(
        CardSegmentProgramme.card_seg_grp == acct_seg,
        CardSegmentProgramme.client_id == current_user.client_id,
        CardSegmentProgramme.active == True
    ).order_by(CardSegmentProgramme.seq).all()
    
    prog_ids = [sp.card_programme_id for sp in segment_progs]
    if not prog_ids:
        # Fallback: if no specific segment mapping, return all active programs for the client
        return db.query(CardProgramme).filter(
            CardProgramme.client_id == current_user.client_id,
            CardProgramme.active == True
        ).all()
        
    return db.query(CardProgramme).filter(
        CardProgramme.id.in_(prog_ids),
        CardProgramme.active == True
    ).all()


@router.post("/duplicate-check", response_model=DuplicateCheckResponse)
def duplicate_check(
    payload: DuplicateCheckRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Retrieve the policy for the client
    policy = db.query(ClientCardPolicy).filter(
        ClientCardPolicy.client_id == payload.client_id
    ).first()
    
    policy_name = policy.card_policy if policy else "one_card_per_account"
    requires_approval = policy.requires_approval_for_deviation if policy else True
    brand = (payload.brand or "").strip()
    
    # Query active requests for the same account
    existing_requests = db.query(RequestModel).filter(
        RequestModel.client_id == payload.client_id,
        RequestModel.account_number == payload.account_number,
        RequestModel.active == True
    ).all()
    
    if not existing_requests:
        return DuplicateCheckResponse(
            is_duplicate=False,
            requires_approval=False,
            message="No active requests exist for this account."
        )
        
    # Policy check logic
    if policy_name == "one_card_per_account_per_brand":
        if brand:
            brand_matches = [
                r for r in existing_requests
                if (r.brand or "").strip().lower() == brand.lower()
            ]
            if brand_matches:
                return DuplicateCheckResponse(
                    is_duplicate=True,
                    requires_approval=requires_approval,
                    message=f"Active request already exists for this brand ({brand}) on this account."
                )
            else:
                return DuplicateCheckResponse(
                    is_duplicate=False,
                    requires_approval=False,
                    message="Active requests exist on this account, but none match this brand."
                )
        else:
            return DuplicateCheckResponse(
                is_duplicate=True,
                requires_approval=requires_approval,
                message="Brand was not specified, but active requests exist on this account."
            )
            
    # Default 'one_card_per_account' policy
    return DuplicateCheckResponse(
        is_duplicate=True,
        requires_approval=requires_approval,
        message="Active request already exists for this account."
    )


@router.post("/nocharge-check", response_model=NochargeCheckResponse)
def nocharge_check(
    payload: NochargeCheckRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Check no-charge policy table
    policy = db.query(NochargePolicy).filter(
        NochargePolicy.client_id == payload.client_id,
        NochargePolicy.programme_id == payload.programme_id,
        NochargePolicy.active == True
    ).first()
    
    if policy:
        if policy.account_product_code:
            if payload.account_product_code and payload.account_product_code.lower() == policy.account_product_code.lower():
                return NochargeCheckResponse(
                    is_nocharge=policy.is_allowed,
                    message=f"No-charge policy matches for product code {payload.account_product_code}."
                )
        else:
            return NochargeCheckResponse(
                is_nocharge=policy.is_allowed,
                message="No-charge policy matches for this card programme."
            )
            
    # Fallback/default logic for common product codes
    if payload.account_product_code and payload.account_product_code.upper() in ["VIP", "STAFF"]:
        return NochargeCheckResponse(
            is_nocharge=True,
            message="No-charge allowed automatically for VIP/STAFF products."
        )
        
    return NochargeCheckResponse(
        is_nocharge=False,
        message="Standard issuance charges apply."
    )
