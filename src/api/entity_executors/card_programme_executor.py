import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import (
    CardProgramme,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
)
from src.api.audit_service import log_audit_event
from src.api.entity_execution_dispatcher import (
    EntityExecutor,
    EntityExecutionDispatcher,
)

logger = logging.getLogger("card_programme_executor")


@EntityExecutionDispatcher.register("CARD_PROGRAMME")
class CardProgrammeExecutor(EntityExecutor):
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
            logger.warning(f"[CardProgrammeExecutor] Operation '{op}' not handled by CardProgrammeExecutor.")

    def _execute_create(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        after_dict: dict,
        checker_user_id: str,
    ) -> None:
        client_id = work_item.client_id
        code = after_dict.get("card_programme_code", "").strip().upper()
        name = after_dict.get("card_programme_name", "").strip()

        # Build CardProgramme object from after_dict
        valid_keys = {
            "card_programme_code", "card_programme_name", "card_type", "description",
            "service_code", "default_validity_years", "currency", "issuance_fee",
            "maintenance_fee", "account_type_binding", "bin", "platform_indicator",
            "pan_length", "sequence", "min_random_number", "max_random_number",
            "output_path", "table_prefix", "priority", "active"
        }
        filtered_data = {k: v for k, v in after_dict.items() if k in valid_keys and v is not None}
        filtered_data["client_id"] = client_id
        filtered_data["card_programme_code"] = code
        filtered_data["card_programme_name"] = name
        filtered_data["created_by"] = work_item.created_by
        filtered_data["created_date"] = datetime.utcnow()

        prog = CardProgramme(**filtered_data)
        db.add(prog)
        db.flush()

        # Update work_item.entity_id with new PK
        work_item.entity_id = prog.id

        log_audit_event(
            db=db,
            entity_type="CARD_PROGRAMME",
            entity_id=prog.id,
            event_code="CARD_PROGRAMME_CREATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Created Card Programme '{code}' - '{name}' (Initiated by '{work_item.created_by}')",
            snapshot_data={
                "id": prog.id,
                "client_id": client_id,
                "card_programme_code": code,
                "card_programme_name": name,
                "card_type": prog.card_type,
                "active": prog.active,
            },
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
        prog = db.query(CardProgramme).filter(CardProgramme.id == entity_id, CardProgramme.client_id == client_id).first()
        if not prog:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Card Programme ID #{entity_id} not found for tenant #{client_id}")

        valid_keys = {
            "card_programme_code", "card_programme_name", "card_type", "description",
            "service_code", "default_validity_years", "currency", "issuance_fee",
            "maintenance_fee", "account_type_binding", "bin", "platform_indicator",
            "pan_length", "sequence", "min_random_number", "max_random_number",
            "output_path", "table_prefix", "priority", "active"
        }

        changes = {}
        for key, new_val in after_dict.items():
            if key in valid_keys and hasattr(prog, key):
                old_val = getattr(prog, key)
                if old_val != new_val:
                    changes[key] = (old_val, new_val)
                    setattr(prog, key, new_val)

        prog.last_modified_by = work_item.created_by
        prog.last_modified_date = datetime.utcnow()
        db.flush()

        log_audit_event(
            db=db,
            entity_type="CARD_PROGRAMME",
            entity_id=prog.id,
            event_code="CARD_PROGRAMME_UPDATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Updated Card Programme '{prog.card_programme_code}' (Initiated by '{work_item.created_by}')",
            changes=changes,
            snapshot_data={
                "id": prog.id,
                "client_id": client_id,
                "card_programme_code": prog.card_programme_code,
                "card_programme_name": prog.card_programme_name,
                "card_type": prog.card_type,
                "active": prog.active,
            },
        )

    def _execute_activate(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        entity_id: int,
        client_id: int,
        checker_user_id: str,
    ) -> None:
        prog = db.query(CardProgramme).filter(CardProgramme.id == entity_id, CardProgramme.client_id == client_id).first()
        if not prog:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Card Programme ID #{entity_id} not found for tenant #{client_id}")

        old_state = prog.active
        prog.active = True
        prog.last_modified_by = work_item.created_by
        prog.last_modified_date = datetime.utcnow()
        db.flush()

        log_audit_event(
            db=db,
            entity_type="CARD_PROGRAMME",
            entity_id=prog.id,
            event_code="CARD_PROGRAMME_ACTIVATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Activated Card Programme '{prog.card_programme_code}' (Initiated by '{work_item.created_by}')",
            changes={"active": (old_state, True)},
            snapshot_data={"id": prog.id, "active": True},
        )

    def _execute_deactivate(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        entity_id: int,
        client_id: int,
        checker_user_id: str,
    ) -> None:
        prog = db.query(CardProgramme).filter(CardProgramme.id == entity_id, CardProgramme.client_id == client_id).first()
        if not prog:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Card Programme ID #{entity_id} not found for tenant #{client_id}")

        old_state = prog.active
        prog.active = False
        prog.last_modified_by = work_item.created_by
        prog.last_modified_date = datetime.utcnow()
        db.flush()

        log_audit_event(
            db=db,
            entity_type="CARD_PROGRAMME",
            entity_id=prog.id,
            event_code="CARD_PROGRAMME_DEACTIVATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Deactivated Card Programme '{prog.card_programme_code}' (Initiated by '{work_item.created_by}')",
            changes={"active": (old_state, False)},
            snapshot_data={"id": prog.id, "active": False},
        )
