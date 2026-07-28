from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.models import (
    UserInfo,
    BranchCreateRequest,
    BranchUpdateRequest,
    BranchReadResponse,
    ConfigExecutionResult,
)
from src.api.auth import get_current_user
from src.api.branch_service import BranchService

router = APIRouter(prefix="/config/branches", tags=["branch-configuration"])


@router.get(
    "",
    response_model=list[BranchReadResponse],
    summary="List all branches for current tenant",
)
def list_branches(
    active_only: bool = Query(True, description="Filter active branches only"),
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return BranchService.list_branches(db, current_user, active_only=active_only)


@router.get(
    "/{branch_code}",
    response_model=BranchReadResponse,
    summary="Get branch details by branch_code",
)
def get_branch_by_code(
    branch_code: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return BranchService.get_branch(db, current_user, branch_code)


@router.post(
    "",
    response_model=ConfigExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Create a new branch (Orchestrated)",
)
def create_branch(
    payload: BranchCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return BranchService.create_branch(db, current_user, payload)


@router.put(
    "/{branch_code}",
    response_model=ConfigExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Update branch details (branch_code is immutable)",
)
def update_branch(
    branch_code: str,
    payload: BranchUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return BranchService.update_branch(db, current_user, branch_code, payload)


@router.delete(
    "/{branch_code}",
    response_model=ConfigExecutionResult,
    status_code=status.HTTP_200_OK,
    summary="Soft-delete (deactivate) branch (Orchestrated)",
)
def delete_branch(
    branch_code: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return BranchService.delete_branch(db, current_user, branch_code)
