import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import (
    CardSegmentProgrammeCharge,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
)
from src.api.audit_service import log_audit_event
from src.api.entity_execution_dispatcher import (
    EntityExecutor,
    EntityExecutionDispatcher,
)
from src.api.card_segment_programme_charges_validation import (
    validate_card_segment_programme_charge_payload,
)

logger = logging.getLogger("card_segment_programme_charge_executor")


@EntityExecutionDispatcher.register("CARD_SEGMENT_PROGRAMME_CHARGE")
class CardSegmentProgrammeChargeExecutor(EntityExecutor):
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
        elif op in ("UPDATE", "EDIT", "ACTIVATE", "DEACTIVATE"):
            self._execute_update(db, work_item, entity_id, client_id, before_dict, after_dict, checker_user_id)
        else:
            logger.warning(
                f"[CardSegmentProgrammeChargeExecutor] Unhandled operation '{op}' for work_item #{work_item.id}."
            )

    def _execute_create(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        after_dict: dict,
        checker_user_id: str,
    ) -> None:
        client_id = work_item.client_id
        card_segment_programme_id = after_dict.get("card_segment_programme_id")
        charge_header_id = after_dict.get("charge_header_id")
        processing_mode_code = after_dict.get("processing_mode_code", "NORMAL")
        priority = after_dict.get("priority", 0)
        active = after_dict.get("active", True)

        validate_card_segment_programme_charge_payload(
            db=db,
            client_id=client_id,
            card_segment_programme_id=card_segment_programme_id,
            charge_header_id=charge_header_id,
            processing_mode_code=processing_mode_code,
            priority=priority,
            is_update=False,
        )

        new_mapping = CardSegmentProgrammeCharge(
            client_id=client_id,
            card_segment_programme_id=card_segment_programme_id,
            charge_header_id=charge_header_id,
            priority=priority,
            processing_mode_code=processing_mode_code.strip().upper(),
            active=active,
            created_by=work_item.created_by,
            created_date=datetime.utcnow(),
            last_modified_by=checker_user_id,
            last_modified_date=datetime.utcnow(),
        )
        db.add(new_mapping)
        db.flush()

        work_item.entity_id = new_mapping.id

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT_PROGRAMME_CHARGE",
            entity_id=new_mapping.id,
            event_code="CARD_SEG_PROG_CHG_CREATED",
            performed_by=checker_user_id,
            branch_code="001",
            remarks=f"Approved creation of Card Segment Programme Charge #{new_mapping.id}",
            snapshot_data={
                "id": new_mapping.id,
                "client_id": client_id,
                "card_segment_programme_id": card_segment_programme_id,
                "charge_header_id": charge_header_id,
                "processing_mode_code": new_mapping.processing_mode_code,
                "priority": priority,
                "active": active,
            },
        )
        logger.info(
            f"[CardSegmentProgrammeChargeExecutor] Created charge mapping id={new_mapping.id} for client={client_id}"
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
        mapping = (
            db.query(CardSegmentProgrammeCharge)
            .filter(
                CardSegmentProgrammeCharge.id == entity_id,
                CardSegmentProgrammeCharge.client_id == client_id,
            )
            .first()
        )
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Card Segment Programme Charge #{entity_id} not found for tenant {client_id}.",
            )

        card_segment_programme_id = after_dict.get(
            "card_segment_programme_id", mapping.card_segment_programme_id
        )
        charge_header_id = after_dict.get("charge_header_id", mapping.charge_header_id)
        processing_mode_code = after_dict.get(
            "processing_mode_code", mapping.processing_mode_code
        )
        priority = after_dict.get("priority", mapping.priority)
        active = after_dict.get("active", mapping.active)

        if work_item.operation_code.upper() not in ("ACTIVATE", "DEACTIVATE"):
            validate_card_segment_programme_charge_payload(
                db=db,
                client_id=client_id,
                card_segment_programme_id=card_segment_programme_id,
                charge_header_id=charge_header_id,
                processing_mode_code=processing_mode_code,
                priority=priority,
                is_update=True,
                current_charge_mapping_id=entity_id,
            )

        mapping.card_segment_programme_id = card_segment_programme_id
        mapping.charge_header_id = charge_header_id
        mapping.processing_mode_code = processing_mode_code.strip().upper()
        mapping.priority = priority
        mapping.active = active
        mapping.last_modified_by = checker_user_id
        mapping.last_modified_date = datetime.utcnow()

        db.flush()

        op_upper = work_item.operation_code.upper()
        event_code_map = {
            "CREATE": "CARD_SEG_PROG_CHG_CREATED",
            "UPDATE": "CARD_SEG_PROG_CHG_UPDATED",
            "ACTIVATE": "CARD_SEG_PROG_CHG_ACTIVATED",
            "DEACTIVATE": "CARD_SEG_PROG_CHG_DEACTIVATED",
        }
        event_code = event_code_map.get(op_upper, f"CARD_SEG_PROG_CHG_{op_upper}")

        log_audit_event(
            db=db,
            entity_type="CARD_SEGMENT_PROGRAMME_CHARGE",
            entity_id=mapping.id,
            event_code=event_code,
            performed_by=checker_user_id,
            branch_code="001",
            remarks=f"Approved {work_item.operation_code.lower()} on Card Segment Programme Charge #{mapping.id}",
            snapshot_data={
                "id": mapping.id,
                "client_id": client_id,
                "card_segment_programme_id": mapping.card_segment_programme_id,
                "charge_header_id": mapping.charge_header_id,
                "processing_mode_code": mapping.processing_mode_code,
                "priority": mapping.priority,
                "active": mapping.active,
            },
        )
        logger.info(
            f"[CardSegmentProgrammeChargeExecutor] Updated charge mapping id={mapping.id} op={work_item.operation_code}"
        )
