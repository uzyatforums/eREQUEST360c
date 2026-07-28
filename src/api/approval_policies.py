from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.models import (
    UserInfo,
    ApprovalPolicySetRequest,
    ApprovalPolicyRead,
    ApprovalCheckResponse,
    ConfigExecutionResult,
)
from src.api.auth import get_current_user
from src.api.approval_policy_service import ApprovalPolicyService
from src.api.config_orchestrator import ConfigurationOrchestrator

router = APIRouter(prefix="/config/approval-policies", tags=["approval-policies"])


@router.get(
    "",
    response_model=list[ApprovalPolicyRead],
    summary="List all approval policies for current tenant",
)
def list_approval_policies(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return ApprovalPolicyService.list_policies(db, current_user)


@router.get(
    "/check",
    response_model=ApprovalCheckResponse,
    summary="Check whether approval is required for an entity type and operation",
)
def check_approval_required(
    entity_type_code: str = Query(..., description="Entity type code e.g. BRANCH"),
    operation_code: str = Query(..., description="Operation code e.g. CREATE"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    req_val = ApprovalPolicyService.requires_approval(
        db, current_user.client_id, entity_type_code, operation_code
    )
    return ApprovalCheckResponse(
        client_id=current_user.client_id,
        entity_type_code=entity_type_code,
        operation_code=operation_code,
        approval_required=req_val,
    )


@router.post(
    "",
    response_model=ConfigExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Configure or update an approval policy (Always routes to Maker/Checker)",
)
def set_approval_policy(
    payload: ApprovalPolicySetRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Fetch existing policy for before_payload comparison if present
    existing = ApprovalPolicyService.get_policy(
        db, current_user, payload.entity_type_code, payload.operation_code
    )
    before_dict = (
        {
            "entity_type_code": existing.entity_type_code,
            "operation_code": existing.operation_code,
            "approval_required": existing.approval_required,
        }
        if existing
        else None
    )

    after_dict = {
        "entity_type_code": payload.entity_type_code,
        "operation_code": payload.operation_code,
        "approval_required": payload.approval_required,
    }

    def commit_func(session: Session, data: dict):
        ApprovalPolicyService.set_policy(session, current_user, payload)

    return ConfigurationOrchestrator.execute_change(
        db=db,
        user=current_user,
        entity_type_code="APPROVAL_POLICY",
        entity_id=existing.id if existing else 0,
        operation_code="UPDATE" if existing else "CREATE",
        entity_name=f"Approval Policy: {payload.entity_type_code}/{payload.operation_code}",
        before_payload=before_dict,
        after_payload=after_dict,
        commit_callback=commit_func,
    )
