import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.db import get_db
from src.models import RequestCreate, RequestRead, UserInfo, LinkAccountRequest
from src.db_models import ClientCardPolicy, Request as RequestModel, RequestStatusHistory, AuditEvent, AuditEventDetail, AuditSnapshot
from src.api.auth import get_current_user
from datetime import datetime
from src.api.audit_service import log_audit_event

from src.api.branch_context_service import BranchContextService, get_branch_context

router = APIRouter(prefix="/requests", tags=["requests"])


def _resolve_policy(db: Session, client_id: int) -> ClientCardPolicy | None:
    return db.query(ClientCardPolicy).filter(ClientCardPolicy.client_id == client_id).first()


def _requires_approval(db: Session, obj) -> bool:
    policy = _resolve_policy(db, obj.client_id)
    policy_name = policy.card_policy if policy else "one_card_per_account"
    requires_approval = policy.requires_approval_for_deviation if policy else True
    brand = (obj.brand or "").strip()

    existing_requests = (
        db.query(RequestModel)
        .filter(
            RequestModel.client_id == obj.client_id,
            RequestModel.account_number == obj.account_number,
            RequestModel.active == True,
        )
        .all()
    )

    # Exclude the current request if it's already saved and we are querying duplicate status post-save
    if hasattr(obj, "request_id") and obj.request_id is not None:
        existing_requests = [r for r in existing_requests if r.request_id != obj.request_id]

    if not existing_requests:
        return False

    if policy_name == "one_card_per_account_per_brand":
        if brand:
            brand_matches = [
                request for request in existing_requests if (request.brand or "").strip().lower() == brand.lower()
            ]
            return bool(brand_matches) and requires_approval
        return requires_approval

    return requires_approval


@router.post("/", response_model=RequestRead, status_code=201)
def create_request(
    payload: RequestCreate,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Auto-resolve request_branch for branch-scoped users if not provided or to enforce effective branch
    req_branch = payload.request_branch
    if not branch_service.is_head_office_user():
        req_branch = branch_service.get_effective_branch() or payload.request_branch
        branch_service.assert_branch_access(req_branch, action_description="create request")

    approval_required = _requires_approval(db, payload)
    request_status = "PENDING_APPROVAL" if approval_required else "PENDING"

    request_obj = RequestModel(
        client_id=branch_service.get_client_id() or payload.client_id,
        account_number=payload.account_number,
        programme_id=payload.programme_id,
        request_status=request_status,
        request_branch=req_branch,
        pickup_branch=payload.pickup_branch,
        created_by=payload.created_by,
        channel_id=payload.channel_id,
        category_id=payload.category_id,
        source_type=payload.source_type,
        source_reference=payload.source_reference,
        brand=payload.brand,
        active=True,
    )
    db.add(request_obj)
    db.commit()
    db.refresh(request_obj)

    # Record status history
    history = RequestStatusHistory(
        request_id=request_obj.request_id,
        from_status=None,
        to_status=request_status,
        action="create",
        performed_by=current_user.username,
        remarks="Request created"
    )
    db.add(history)
    db.commit()

    # Log audit event and state snapshot
    snapshot_data = {
        "request_id": request_obj.request_id,
        "client_id": request_obj.client_id,
        "account_number": request_obj.account_number,
        "programme_id": request_obj.programme_id,
        "request_status": request_obj.request_status,
        "request_branch": request_obj.request_branch,
        "pickup_branch": request_obj.pickup_branch,
        "brand": request_obj.brand
    }
    log_audit_event(
        db=db,
        entity_type="request",
        entity_id=request_obj.request_id,
        event_code="REQUEST_CREATED",
        performed_by=current_user.username,
        branch_code=branch_service.get_effective_branch(),
        remarks="Request created",
        snapshot_data=snapshot_data
    )

    request_obj.approval_required = approval_required
    return request_obj


@router.get("/", response_model=list[RequestRead])
def list_requests(
    global_view: bool = False,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    query = db.query(RequestModel)
    query = branch_service.apply_branch_scope(query, RequestModel, primary_branch_col="request_branch", secondary_branch_col="pickup_branch")
    requests = query.all()
    for r in requests:
        r.approval_required = _requires_approval(db, r)
    return requests


@router.get("/{request_id}", response_model=RequestRead)
def get_request(
    request_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    branch_service.assert_branch_access(request_obj.request_branch, action_description="view request")
    request_obj.approval_required = _requires_approval(db, request_obj)
    return request_obj


@router.post("/{request_id}/approve", response_model=RequestRead)
def approve_request(
    request_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    # Authorizer verification
    is_authorized = any(
        r in current_user.roles
        for r in ["branch_authorizer", "operations_admin_checker", "internal_control_checker", "super_admin"]
    )
    if not is_authorized:
        raise HTTPException(status_code=403, detail="Role does not have permission to approve requests")

    # Enforce branch scope
    branch_service.assert_branch_access(request_obj.request_branch, action_description="approve request")

    old_status = request_obj.request_status
    remarks = "Approved by authorizer"

    # Status transition rules
    if old_status == "PENDING_APPROVAL":
        # Approval of duplicate deviation -> moves to PENDING (ready for settlement/charges)
        request_obj.request_status = "PENDING"
        remarks = "Special approval granted for policy deviation"
    elif old_status == "PENDING_AUTHORIZATION":
        # Final branch approval post-settlement -> moves to APPROVED/COMPLETED
        request_obj.request_status = "APPROVED"
        remarks = "Final branch authorization completed"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Request in status '{old_status}' is not in a state that can be approved (requires PENDING_APPROVAL or PENDING_AUTHORIZATION)"
        )

    request_obj.status_last_updated = datetime.utcnow()

    # Record history
    history = RequestStatusHistory(
        request_id=request_obj.request_id,
        from_status=old_status,
        to_status=request_obj.request_status,
        action="approve",
        performed_by=current_user.username,
        remarks=remarks
    )
    db.add(history)
    db.commit()
    db.refresh(request_obj)

    # Log audit event with status change details and new state snapshot
    snapshot_data = {
        "request_id": request_obj.request_id,
        "client_id": request_obj.client_id,
        "account_number": request_obj.account_number,
        "programme_id": request_obj.programme_id,
        "request_status": request_obj.request_status,
        "request_branch": request_obj.request_branch,
        "pickup_branch": request_obj.pickup_branch,
        "brand": request_obj.brand
    }
    log_audit_event(
        db=db,
        entity_type="request",
        entity_id=request_obj.request_id,
        event_code="REQUEST_APPROVED",
        performed_by=current_user.username,
        branch_code=branch_service.get_effective_branch(),
        remarks=remarks,
        changes={"request_status": (old_status, request_obj.request_status)},
        snapshot_data=snapshot_data
    )

    request_obj.approval_required = _requires_approval(db, request_obj)
    return request_obj


@router.get("/{request_id}/history")
def get_request_history(
    request_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    branch_service.assert_branch_access(request_obj.request_branch, action_description="view request history")

    history = db.query(RequestStatusHistory).filter(
        RequestStatusHistory.request_id == request_id
    ).order_by(RequestStatusHistory.performed_date.asc()).all()

    return history


@router.get("/{request_id}/audit")
def get_request_audit(
    request_id: int,
    branch_service: BranchContextService = Depends(get_branch_context),
    db: Session = Depends(get_db),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")

    branch_service.assert_branch_access(request_obj.request_branch, action_description="view request audit")

    events = db.query(AuditEvent).filter(
        AuditEvent.entity_type == "request",
        AuditEvent.entity_id == request_id
    ).order_by(AuditEvent.event_time.asc()).all()

    event_list = []
    for e in events:
        details = db.query(AuditEventDetail).filter(AuditEventDetail.event_id == e.event_id).all()
        snapshot = db.query(AuditSnapshot).filter(AuditSnapshot.event_id == e.event_id).first()

        event_list.append({
            "event_id": e.event_id,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
            "event_type_id": e.event_type_id,
            "event_source": e.event_source,
            "performed_by": e.performed_by,
            "branch_code": e.branch_code,
            "event_time": e.event_time,
            "correlation_id": e.correlation_id,
            "remarks": e.remarks,
            "details": [{"column_name": d.column_name, "old_value": d.old_value, "new_value": d.new_value} for d in details],
            "snapshot": json.loads(snapshot.snapshot_data) if snapshot else None
        })

    return event_list


@router.post("/{request_id}/hotlist", response_model=RequestRead)
def hotlist_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Enforce tenant scope
    if request_obj.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Access denied (tenant scope violation)")
        
    # Roles allowed: branch_submitter, branch_authorizer, super_admin, operations admins
    allowed = ["branch_submitter", "branch_authorizer", "super_admin", "operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    if not any(r in current_user.roles for r in allowed):
        raise HTTPException(status_code=403, detail="Role does not have permission to hotlist requests")
        
    old_status = request_obj.request_status
    request_obj.request_status = "HOTLISTED"
    request_obj.status_last_updated = datetime.utcnow()
    
    # Record history
    history = RequestStatusHistory(
        request_id=request_obj.request_id,
        from_status=old_status,
        to_status="HOTLISTED",
        action="hotlist",
        performed_by=current_user.username,
        remarks="Card hotlisted globally"
    )
    db.add(history)
    db.commit()
    db.refresh(request_obj)
    
    # Log audit event
    snapshot_data = {
        "request_id": request_obj.request_id,
        "client_id": request_obj.client_id,
        "account_number": request_obj.account_number,
        "programme_id": request_obj.programme_id,
        "request_status": request_obj.request_status,
        "request_branch": request_obj.request_branch,
        "pickup_branch": request_obj.pickup_branch,
        "brand": request_obj.brand
    }
    log_audit_event(
        db=db,
        entity_type="request",
        entity_id=request_obj.request_id,
        event_code="CARD_HOTLISTED",
        performed_by=current_user.username,
        branch_code=current_user.branch_code,
        remarks="Card hotlisted globally",
        changes={"request_status": (old_status, "HOTLISTED")},
        snapshot_data=snapshot_data
    )
    request_obj.approval_required = _requires_approval(db, request_obj)
    return request_obj


@router.post("/{request_id}/link-account", response_model=RequestRead)
def link_account(
    request_id: int,
    payload: LinkAccountRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    request_obj = db.query(RequestModel).filter(RequestModel.request_id == request_id).first()
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
        
    # Enforce tenant scope
    if request_obj.client_id != current_user.client_id:
        raise HTTPException(status_code=403, detail="Access denied (tenant scope violation)")
        
    # Roles allowed: branch_submitter, branch_authorizer, super_admin, operations admins
    allowed = ["branch_submitter", "branch_authorizer", "super_admin", "operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    if not any(r in current_user.roles for r in allowed):
        raise HTTPException(status_code=403, detail="Role does not have permission to link accounts")
        
    old_account = request_obj.account_number
    request_obj.account_number = payload.account_number
    
    # Check if duplicate deviation is triggered on the new account
    approval_required = _requires_approval(db, request_obj)
    old_status = request_obj.request_status
    remarks = f"Account number changed from '{old_account}' to '{payload.account_number}'"
    
    if approval_required:
        request_obj.request_status = "PENDING_APPROVAL"
        remarks += ". Re-flagged for policy deviation (duplicate card approval pending)."
    else:
        # If it was in PENDING_APPROVAL but new account doesn't trigger policy check, transition to PENDING
        if request_obj.request_status == "PENDING_APPROVAL":
            request_obj.request_status = "PENDING"
            remarks += ". Moved to PENDING."
            
    request_obj.status_last_updated = datetime.utcnow()
    
    # Record history
    history = RequestStatusHistory(
        request_id=request_obj.request_id,
        from_status=old_status,
        to_status=request_obj.request_status,
        action="link_account",
        performed_by=current_user.username,
        remarks=remarks
    )
    db.add(history)
    db.commit()
    db.refresh(request_obj)
    
    # Log audit event
    snapshot_data = {
        "request_id": request_obj.request_id,
        "client_id": request_obj.client_id,
        "account_number": request_obj.account_number,
        "programme_id": request_obj.programme_id,
        "request_status": request_obj.request_status,
        "request_branch": request_obj.request_branch,
        "pickup_branch": request_obj.pickup_branch,
        "brand": request_obj.brand
    }
    changes = {
        "account_number": (old_account, request_obj.account_number)
    }
    if old_status != request_obj.request_status:
        changes["request_status"] = (old_status, request_obj.request_status)
        
    log_audit_event(
        db=db,
        entity_type="request",
        entity_id=request_obj.request_id,
        event_code="CARD_ACCOUNT_LINKED",
        performed_by=current_user.username,
        branch_code=current_user.branch_code,
        remarks=remarks,
        changes=changes,
        snapshot_data=snapshot_data
    )
    
    request_obj.approval_required = approval_required
    return request_obj

