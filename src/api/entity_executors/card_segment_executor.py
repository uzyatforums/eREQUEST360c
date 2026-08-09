import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import (
    CardSegment,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
)
from src.api.audit_service import log_audit_event
from src.api.entity_execution_dispatcher import (
    EntityExecutor,
    EntityExecutionDispatcher,
)

logger = logging.getLogger("card_segment_executor")


@EntityExecutionDispatcher.register("CARD_SEGMENT")
class CardSegmentExecutor(EntityExecutor):
    def execute(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        payload: Optional[MakerCheckerWorkItemPayload],
        checker_user_id: str,
    ) -> None:
        op = work_item.operation_code.upper()
        client_id = work_item.client_id
        entity_id = work_item.entity_id

        after_dict: dict = {}
        before_dict: dict = {}
        if payload:
            if payload.after_payload:
                try:
                    after_dict = (
                        json.loads(payload.after_payload)
                        if isinstance(payload.after_payload, str)
                        else payload.after_payload
                    )
                except Exception:
                    after_dict = {}

            if payload.before_payload:
                try:
                    before_dict = (
                        json.loads(payload.before_payload)
                        if isinstance(payload.before_payload, str)
                        else payload.before_payload
                    )
                except Exception:
                    before_dict = {}

        if op == "CREATE":
            self._execute_create(db, work_item, after_dict, checker_user_id)
        elif op == "UPDATE":
            self._execute_update(db, work_item, entity_id, client_id, before_dict, after_dict, checker_user_id)
        elif op == "ACTIVATE":
            self._execute_activate(db, work_item, entity_id, client_id, checker_user_id)
        elif op == "DEACTIVATE":
            self._execute_deactivate(db, work_item, entity_id, client_id, checker_user_id)
        else:
            logger.warning(f"[CardSegmentExecutor] Operation '{op}' not handled by CardSegmentExecutor.")

    def _execute_create(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        after_dict: dict,
        checker_user_id: str,
    ) -> None:
        client_id = work_item.client_id
        segment_code = after_dict.get("segment_code")
        segment_name = after_dict.get("segment_name")

        if not segment_code or not segment_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payload missing required 'segment_code' or 'segment_name' for Card Segment creation.",
            )

        # Unique constraint validations with tenant isolation
        existing_code = (
            db.query(CardSegment)
            .filter(
                CardSegment.client_id == client_id,
                CardSegment.segment_code == segment_code.strip(),
            )
            .first()
        )
        if existing_code:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Card Segment code '{segment_code}' already exists.",
            )

        existing_name = (
            db.query(CardSegment)
            .filter(
                CardSegment.client_id == client_id,
                CardSegment.segment_name == segment_name.strip(),
            )
            .first()
        )
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Card Segment name '{segment_name}' already exists.",
            )

        new_segment = CardSegment(
            client_id=client_id,
            segment_code=segment_code.strip(),
            segment_name=segment_name.strip(),
            priority=after_dict.get("priority", 1),
            active=after_dict.get("active", True),
            created_by=work_item.created_by,
            last_modified_by=checker_user_id,
            last_modified_date=datetime.utcnow(),
        )
        db.add(new_segment)
        db.flush()

        # Link work_item entity_id to newly created CardSegment ID
        work_item.entity_id = new_segment.id

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT",
            entity_id=new_segment.id,
            event_code="CARD_SEGMENT_CREATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Created Card Segment '{new_segment.segment_code}'",
            snapshot_data={
                "id": new_segment.id,
                "segment_code": new_segment.segment_code,
                "segment_name": new_segment.segment_name,
                "priority": new_segment.priority,
                "active": new_segment.active,
            },
            commit=False,
        )

    def _execute_update(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        entity_id: int,
        client_id: int,
        before_dict: dict,
        after_dict: dict,
        checker_user_id: str,
    ) -> None:
        segment = (
            db.query(CardSegment)
            .filter(CardSegment.id == entity_id, CardSegment.client_id == client_id)
            .first()
        )
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Card Segment (ID: {entity_id}) not found for tenant isolation check.",
            )

        new_name = after_dict.get("segment_name")
        if new_name and new_name.strip() != segment.segment_name:
            dup_name = (
                db.query(CardSegment)
                .filter(
                    CardSegment.client_id == client_id,
                    CardSegment.segment_name == new_name.strip(),
                    CardSegment.id != entity_id,
                )
                .first()
            )
            if dup_name:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Card Segment name '{new_name.strip()}' already exists.",
                )
            segment.segment_name = new_name.strip()

        if "priority" in after_dict and after_dict["priority"] is not None:
            segment.priority = after_dict["priority"]

        if "active" in after_dict and after_dict["active"] is not None:
            segment.active = after_dict["active"]

        segment.last_modified_by = checker_user_id
        segment.last_modified_date = datetime.utcnow()

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT",
            entity_id=segment.id,
            event_code="CARD_SEGMENT_UPDATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Updated Card Segment '{segment.segment_code}'",
            changes={
                "segment_name": (before_dict.get("segment_name"), segment.segment_name),
                "priority": (before_dict.get("priority"), segment.priority),
                "active": (before_dict.get("active"), segment.active),
            },
            commit=False,
        )

    def _execute_activate(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        entity_id: int,
        client_id: int,
        checker_user_id: str,
    ) -> None:
        segment = (
            db.query(CardSegment)
            .filter(CardSegment.id == entity_id, CardSegment.client_id == client_id)
            .first()
        )
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Card Segment (ID: {entity_id}) not found for tenant isolation check.",
            )

        segment.active = True
        segment.last_modified_by = checker_user_id
        segment.last_modified_date = datetime.utcnow()

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT",
            entity_id=segment.id,
            event_code="CARD_SEGMENT_ACTIVATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Activated Card Segment '{segment.segment_code}'",
            commit=False,
        )

    def _execute_deactivate(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        entity_id: int,
        client_id: int,
        checker_user_id: str,
    ) -> None:
        segment = (
            db.query(CardSegment)
            .filter(CardSegment.id == entity_id, CardSegment.client_id == client_id)
            .first()
        )
        if not segment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Card Segment (ID: {entity_id}) not found for tenant isolation check.",
            )

        segment.active = False
        segment.last_modified_by = checker_user_id
        segment.last_modified_date = datetime.utcnow()

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT",
            entity_id=segment.id,
            event_code="CARD_SEGMENT_DEACTIVATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Deactivated Card Segment '{segment.segment_code}'",
            commit=False,
        )
