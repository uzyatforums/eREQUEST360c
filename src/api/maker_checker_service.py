import json
import logging
import time
from datetime import datetime
from typing import Optional, Any
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, OperationalError, DatabaseError
from sqlalchemy.orm import Session
from sqlalchemy.orm.exc import FlushError

from src.db_models import MakerCheckerWorkItem, MakerCheckerWorkItemPayload, MakerCheckerWorkItemAction
from src.models import (
    UserInfo,
    MakerCheckerSubmitRequest,
    MakerCheckerResubmitRequest,
)
from src.api.auth import require_permission
from src.api.maker_checker_repository import MakerCheckerRepository
from src.api.maker_checker_constants import (
    WorkItemStatus,
    WorkItemOperation,
    IGNORED_CHANGE_SUMMARY_FIELDS,
    TRANSITION_MAP,
)
from src.api.entity_execution_dispatcher import EntityExecutionDispatcher
import src.api.entity_executors  # Ensure executors are registered

logger = logging.getLogger("maker_checker")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def _format_field_name(key: str) -> str:
    parts = key.replace("_", " ").split()
    return " ".join(part.capitalize() for part in parts)


def generate_change_summary(before_raw: Optional[str], after_raw: str) -> str:
    before_dict: dict[str, Any] = {}
    if before_raw:
        if isinstance(before_raw, str):
            try:
                before_dict = json.loads(before_raw)
            except Exception:
                before_dict = {}
        elif isinstance(before_raw, dict):
            before_dict = before_raw

    after_dict: dict[str, Any] = {}
    if isinstance(after_raw, str):
        try:
            after_dict = json.loads(after_raw)
        except Exception:
            after_dict = {}
    elif isinstance(after_raw, dict):
        after_dict = after_raw

    changes: list[str] = []

    # Filter out audit/metadata fields
    filtered_after = {
        k: v for k, v in after_dict.items() if k.lower() not in IGNORED_CHANGE_SUMMARY_FIELDS
    }
    filtered_before = {
        k: v for k, v in before_dict.items() if k.lower() not in IGNORED_CHANGE_SUMMARY_FIELDS
    }

    # Check keys present in filtered_after
    for key, after_val in filtered_after.items():
        field_label = _format_field_name(key)
        if key in filtered_before:
            before_val = filtered_before[key]
            if before_val != after_val:
                changes.append(f"{field_label} changed from {before_val} to {after_val}")
        else:
            changes.append(f"{field_label} set to {after_val}")

    # Check keys in filtered_before but missing in filtered_after
    for key, before_val in filtered_before.items():
        if key not in filtered_after:
            field_label = _format_field_name(key)
            changes.append(f"{field_label} removed (was {before_val})")

    if not changes:
        return "No field changes detected"
    return "; ".join(changes)


class MakerCheckerService:
    @staticmethod
    def submit(
        db: Session, user: UserInfo, req: MakerCheckerSubmitRequest
    ) -> MakerCheckerWorkItem:
        start_time = time.perf_counter()

        lookups_valid = MakerCheckerRepository.validate_lookups(
            db, req.entity_type_code, req.operation_code
        )
        if not lookups_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or inactive entity_type_code ('{req.entity_type_code}') or operation_code ('{req.operation_code}')",
            )

        # Generic Protection: Ensure at most ONE PENDING work item exists for an entity
        if req.entity_id and req.entity_id > 0:
            if MakerCheckerRepository.has_pending_for_entity(
                db, user.client_id, req.entity_type_code, req.entity_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A pending configuration change already exists for this entity.",
                )

        before_str: Optional[str] = None
        if req.before_payload is not None:
            before_str = (
                json.dumps(req.before_payload)
                if isinstance(req.before_payload, dict)
                else str(req.before_payload)
            )

        after_str: str = (
            json.dumps(req.after_payload)
            if isinstance(req.after_payload, dict)
            else str(req.after_payload)
        )

        change_summary = generate_change_summary(before_str, after_str)

        try:
            work_item = MakerCheckerRepository.create_work_item(
                db,
                client_id=user.client_id,
                entity_type_code=req.entity_type_code,
                entity_id=req.entity_id,
                operation_code=req.operation_code,
                user_id=user.user_id,
            )

            MakerCheckerRepository.create_payload(
                db,
                work_item_id=work_item.id,
                entity_name=req.entity_name,
                before_payload=before_str,
                after_payload=after_str,
                user_id=user.user_id,
            )

            MakerCheckerRepository.add_action(
                db,
                work_item_id=work_item.id,
                operation_code=req.operation_code,
                status_code=WorkItemStatus.PENDING,
                action_by=user.user_id,
                remarks="Submitted for approval",
                change_summary=change_summary,
            )

            db.commit()
            db.refresh(work_item)
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                f"[MakerCheckerService] submit: work_item_id={work_item.id}, user_id={user.user_id}, "
                f"client_id={user.client_id}, entity_type={req.entity_type_code}, entity_id={req.entity_id}, "
                f"operation={req.operation_code}, transition=NONE->PENDING, duration_ms={duration_ms:.2f}"
            )
            return work_item
        except (IntegrityError, FlushError, OperationalError, DatabaseError):
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending configuration change already exists for this entity.",
            )
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def count_pending(db: Session, user: UserInfo) -> int:
        return MakerCheckerRepository.count_pending(db, user.client_id)

    @staticmethod
    def get_pending(db: Session, user: UserInfo) -> list[MakerCheckerWorkItem]:
        start_time = time.perf_counter()
        items = MakerCheckerRepository.list_pending(db, user.client_id)
        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            f"[MakerCheckerService] get_pending: count={len(items)}, user_id={user.user_id}, "
            f"client_id={user.client_id}, duration_ms={duration_ms:.2f}"
        )
        return items

    @staticmethod
    def get_work_item(
        db: Session, user: UserInfo, work_item_id: int
    ) -> MakerCheckerWorkItem:
        work_item = MakerCheckerRepository.get_work_item_by_id(
            db, work_item_id, user.client_id
        )
        if not work_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found"
            )
        return work_item

    @staticmethod
    def get_payload(
        db: Session, user: UserInfo, work_item_id: int
    ) -> MakerCheckerWorkItemPayload:
        # Authorization check: verify work item exists and belongs to current tenant
        work_item = MakerCheckerService.get_work_item(db, user, work_item_id)
        payload = MakerCheckerRepository.get_payload_by_work_item_id(db, work_item.id)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payload not found for work item",
            )
        return payload

    @staticmethod
    def get_history(
        db: Session, user: UserInfo, work_item_id: int
    ) -> list[MakerCheckerWorkItemAction]:
        work_item = MakerCheckerService.get_work_item(db, user, work_item_id)
        return MakerCheckerRepository.get_actions_by_work_item_id(db, work_item.id)

    @staticmethod
    def _execute_transition(
        db: Session,
        user: UserInfo,
        work_item_id: int,
        operation_code: str,
        remarks: Optional[str] = None,
        new_after_payload: Optional[dict | str] = None,
    ) -> MakerCheckerWorkItem:
        start_time = time.perf_counter()
        transition_rule = TRANSITION_MAP.get(operation_code)
        if not transition_rule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported transition operation '{operation_code}'",
            )

        if operation_code in (WorkItemOperation.APPROVE, WorkItemOperation.REJECT):
            require_permission(db, user, "request.approve")

        work_item = MakerCheckerRepository.get_work_item_by_id(
            db, work_item_id, user.client_id, lock_for_update=True
        )
        if not work_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found"
            )

        allowed_from = transition_rule["allowed_from"]
        if work_item.status_code not in allowed_from:
            allowed_str = " or ".join(allowed_from)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot perform '{operation_code}' on work item in '{work_item.status_code}' status. Only {allowed_str} items can be target of this action.",
            )

        is_maker = (work_item.created_by == user.user_id)
        maker_permitted = transition_rule["maker_permitted"]

        if not maker_permitted and is_maker:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Maker cannot {operation_code.lower()} their own work item.",
            )
        if maker_permitted and not is_maker:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Only the maker who created the work item can {operation_code.lower()} it.",
            )

        change_summary: Optional[str] = None

        if operation_code == WorkItemOperation.RESUBMIT:
            payload = MakerCheckerRepository.get_payload_by_work_item_id(db, work_item_id)
            if not payload:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Payload record not found for resubmission",
                )
            new_after_str = (
                json.dumps(new_after_payload)
                if isinstance(new_after_payload, dict)
                else str(new_after_payload)
            )
            MakerCheckerRepository.update_payload(db, work_item_id, new_after_str)
            change_summary = generate_change_summary(payload.before_payload, new_after_str)

        old_status = work_item.status_code
        target_status = transition_rule["target_status"]
        work_item.status_code = target_status

        date_field = transition_rule["date_field"]
        if date_field:
            setattr(work_item, date_field, datetime.utcnow())

        checker_field = transition_rule["checker_field"]
        if checker_field:
            setattr(work_item, checker_field, user.user_id)

        work_item.last_modified_by = user.user_id
        work_item.last_modified_date = datetime.utcnow()

        MakerCheckerRepository.add_action(
            db,
            work_item_id=work_item.id,
            operation_code=operation_code,
            status_code=target_status,
            action_by=user.user_id,
            remarks=remarks,
            change_summary=change_summary,
        )

        try:
            # If operation is APPROVE, dispatch payload to domain entity executor before commit
            if operation_code == WorkItemOperation.APPROVE:
                payload = MakerCheckerRepository.get_payload_by_work_item_id(db, work_item.id)
                EntityExecutionDispatcher.dispatch(
                    db=db,
                    work_item=work_item,
                    payload=payload,
                    checker_user_id=user.user_id,
                )

            db.commit()
            db.refresh(work_item)
            duration_ms = (time.perf_counter() - start_time) * 1000
            logger.info(
                f"[MakerCheckerService] {operation_code.lower()}: work_item_id={work_item.id}, user_id={user.user_id}, "
                f"client_id={user.client_id}, entity_type={work_item.entity_type_code}, entity_id={work_item.entity_id}, "
                f"operation={operation_code}, transition={old_status}->{target_status}, duration_ms={duration_ms:.2f}"
            )
            return work_item
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def approve(
        db: Session, user: UserInfo, work_item_id: int, remarks: Optional[str]
    ) -> MakerCheckerWorkItem:
        return MakerCheckerService._execute_transition(
            db, user, work_item_id, WorkItemOperation.APPROVE, remarks=remarks
        )

    @staticmethod
    def reject(
        db: Session, user: UserInfo, work_item_id: int, remarks: Optional[str]
    ) -> MakerCheckerWorkItem:
        return MakerCheckerService._execute_transition(
            db, user, work_item_id, WorkItemOperation.REJECT, remarks=remarks
        )

    @staticmethod
    def cancel(
        db: Session, user: UserInfo, work_item_id: int, remarks: Optional[str]
    ) -> MakerCheckerWorkItem:
        return MakerCheckerService._execute_transition(
            db, user, work_item_id, WorkItemOperation.CANCEL, remarks=remarks
        )

    @staticmethod
    def resubmit(
        db: Session,
        user: UserInfo,
        work_item_id: int,
        req: MakerCheckerResubmitRequest,
    ) -> MakerCheckerWorkItem:
        return MakerCheckerService._execute_transition(
            db,
            user,
            work_item_id,
            WorkItemOperation.RESUBMIT,
            remarks=req.remarks,
            new_after_payload=req.after_payload,
        )
