from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from src.db import get_db
from src.models import (
    UserInfo,
    MakerCheckerSubmitRequest,
    MakerCheckerActionRequest,
    MakerCheckerResubmitRequest,
    WorkItemRead,
    WorkItemPayloadRead,
    WorkItemActionRead,
)
from src.api.auth import get_current_user
from src.api.maker_checker_service import MakerCheckerService

router = APIRouter(prefix="/maker-checker", tags=["maker-checker"])


@router.post(
    "/submit",
    response_model=WorkItemRead,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new approval request",
)
def submit_request(
    payload: MakerCheckerSubmitRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.submit(db, current_user, payload)


@router.get(
    "/pending",
    response_model=list[WorkItemRead],
    summary="Retrieve all pending work items for tenant",
)
def get_pending_requests(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.get_pending(db, current_user)


@router.get(
    "/{id}",
    response_model=WorkItemRead,
    summary="Retrieve work item details by canonical ID",
)
def get_work_item(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.get_work_item(db, current_user, id)


@router.get(
    "/{id}/payload",
    response_model=WorkItemPayloadRead,
    summary="Retrieve before/after payload for work item",
)
def get_payload(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.get_payload(db, current_user, id)


@router.get(
    "/{id}/history",
    response_model=list[WorkItemActionRead],
    summary="Retrieve action history for work item",
)
def get_history(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.get_history(db, current_user, id)


@router.post(
    "/{id}/approve",
    response_model=WorkItemRead,
    summary="Approve a pending work item (Checker)",
)
def approve_request(
    id: int,
    action_req: Optional[MakerCheckerActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    remarks = action_req.remarks if action_req else None
    return MakerCheckerService.approve(db, current_user, id, remarks)


@router.post(
    "/{id}/reject",
    response_model=WorkItemRead,
    summary="Reject a pending work item (Checker)",
)
def reject_request(
    id: int,
    action_req: Optional[MakerCheckerActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    remarks = action_req.remarks if action_req else None
    return MakerCheckerService.reject(db, current_user, id, remarks)


@router.post(
    "/{id}/cancel",
    response_model=WorkItemRead,
    summary="Cancel a pending work item (Maker)",
)
def cancel_request(
    id: int,
    action_req: Optional[MakerCheckerActionRequest] = None,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    remarks = action_req.remarks if action_req else None
    return MakerCheckerService.cancel(db, current_user, id, remarks)


@router.post(
    "/{id}/resubmit",
    response_model=WorkItemRead,
    summary="Resubmit a rejected work item (Maker)",
)
def resubmit_request(
    id: int,
    resubmit_req: MakerCheckerResubmitRequest,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return MakerCheckerService.resubmit(db, current_user, id, resubmit_req)
