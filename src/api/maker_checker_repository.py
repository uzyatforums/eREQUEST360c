from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from src.db_models import (
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
    MakerCheckerWorkItemAction,
    MakerCheckerEntityType,
    MakerCheckerOperation,
)
from src.api.maker_checker_constants import WorkItemStatus


class MakerCheckerRepository:
    @staticmethod
    def validate_lookups(
        db: Session, entity_type_code: str, operation_code: str
    ) -> bool:
        entity_type_exists = (
            db.query(MakerCheckerEntityType.entity_type_code)
            .filter(
                MakerCheckerEntityType.entity_type_code == entity_type_code,
                MakerCheckerEntityType.active == True,
            )
            .first()
            is not None
        )
        if not entity_type_exists:
            return False

        operation_exists = (
            db.query(MakerCheckerOperation.operation_code)
            .filter(
                MakerCheckerOperation.operation_code == operation_code,
                MakerCheckerOperation.active == True,
            )
            .first()
            is not None
        )
        return operation_exists

    @staticmethod
    def has_pending_for_entity(
        db: Session, client_id: int, entity_type_code: str, entity_id: int
    ) -> bool:
        if not entity_id or entity_id <= 0:
            return False
        return (
            db.query(MakerCheckerWorkItem.id)
            .filter(
                MakerCheckerWorkItem.client_id == client_id,
                MakerCheckerWorkItem.entity_type_code == entity_type_code,
                MakerCheckerWorkItem.entity_id == entity_id,
                MakerCheckerWorkItem.status_code == WorkItemStatus.PENDING,
            )
            .first()
            is not None
        )

    @staticmethod
    def create_work_item(
        db: Session,
        client_id: int,
        entity_type_code: str,
        entity_id: int,
        operation_code: str,
        user_id: str,
    ) -> MakerCheckerWorkItem:
        work_item = MakerCheckerWorkItem(
            work_item_number=f"MC-TEMP-{datetime.utcnow().timestamp()}",
            client_id=client_id,
            entity_type_code=entity_type_code,
            entity_id=entity_id,
            operation_code=operation_code,
            status_code=WorkItemStatus.PENDING,
            created_by=user_id,
            created_date=datetime.utcnow(),
            active=True,
        )
        db.add(work_item)
        db.flush()

        work_item.work_item_number = f"MC-{work_item.id:08d}"
        db.flush()
        return work_item

    @staticmethod
    def create_payload(
        db: Session,
        work_item_id: int,
        entity_name: Optional[str],
        before_payload: Optional[str],
        after_payload: str,
        user_id: str,
    ) -> MakerCheckerWorkItemPayload:
        payload = MakerCheckerWorkItemPayload(
            work_item_id=work_item_id,
            entity_name=entity_name,
            before_payload=before_payload,
            after_payload=after_payload,
            created_by=user_id,
            created_date=datetime.utcnow(),
        )
        db.add(payload)
        db.flush()
        return payload

    @staticmethod
    def update_payload(
        db: Session,
        work_item_id: int,
        after_payload: str,
    ) -> Optional[MakerCheckerWorkItemPayload]:
        payload = (
            db.query(MakerCheckerWorkItemPayload)
            .filter(MakerCheckerWorkItemPayload.work_item_id == work_item_id)
            .first()
        )
        if payload:
            payload.after_payload = after_payload
            db.flush()
        return payload

    @staticmethod
    def add_action(
        db: Session,
        work_item_id: int,
        operation_code: str,
        status_code: str,
        action_by: str,
        remarks: Optional[str],
        change_summary: Optional[str],
    ) -> MakerCheckerWorkItemAction:
        max_seq = (
            db.query(func.max(MakerCheckerWorkItemAction.action_sequence))
            .filter(MakerCheckerWorkItemAction.work_item_id == work_item_id)
            .scalar()
        )
        next_seq = (max_seq or 0) + 1

        action = MakerCheckerWorkItemAction(
            work_item_id=work_item_id,
            action_sequence=next_seq,
            operation_code=operation_code,
            status_code=status_code,
            action_by=action_by,
            remarks=remarks,
            action_date=datetime.utcnow(),
            created_by=action_by,
            created_date=datetime.utcnow(),
            change_summary=change_summary,
        )
        db.add(action)
        db.flush()
        return action

    @staticmethod
    def get_work_item_by_id(
        db: Session,
        work_item_id: int,
        client_id: int,
        lock_for_update: bool = False,
    ) -> Optional[MakerCheckerWorkItem]:
        query = db.query(MakerCheckerWorkItem).filter(
            MakerCheckerWorkItem.id == work_item_id,
            MakerCheckerWorkItem.client_id == client_id,
            MakerCheckerWorkItem.active == True,
        )
        if lock_for_update:
            query = query.with_for_update()
        return query.first()

    @staticmethod
    def count_pending(db: Session, client_id: int) -> int:
        return (
            db.query(func.count(MakerCheckerWorkItem.id))
            .filter(
                MakerCheckerWorkItem.client_id == client_id,
                MakerCheckerWorkItem.status_code == WorkItemStatus.PENDING,
                MakerCheckerWorkItem.active == True,
            )
            .scalar()
            or 0
        )

    @staticmethod
    def list_pending(db: Session, client_id: int) -> list[MakerCheckerWorkItem]:
        return (
            db.query(MakerCheckerWorkItem)
            .filter(
                MakerCheckerWorkItem.client_id == client_id,
                MakerCheckerWorkItem.status_code == WorkItemStatus.PENDING,
                MakerCheckerWorkItem.active == True,
            )
            .order_by(MakerCheckerWorkItem.created_date.desc())
            .all()
        )

    @staticmethod
    def get_payload_by_work_item_id(
        db: Session, work_item_id: int
    ) -> Optional[MakerCheckerWorkItemPayload]:
        return (
            db.query(MakerCheckerWorkItemPayload)
            .filter(MakerCheckerWorkItemPayload.work_item_id == work_item_id)
            .first()
        )

    @staticmethod
    def get_actions_by_work_item_id(
        db: Session, work_item_id: int
    ) -> list[MakerCheckerWorkItemAction]:
        return (
            db.query(MakerCheckerWorkItemAction)
            .filter(MakerCheckerWorkItemAction.work_item_id == work_item_id)
            .order_by(MakerCheckerWorkItemAction.action_sequence.asc())
            .all()
        )
