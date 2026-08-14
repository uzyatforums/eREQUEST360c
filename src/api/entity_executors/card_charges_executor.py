import json
import logging
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import (
    CardChargesHeader,
    CardChargeEntry,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
)
from src.api.audit_service import log_audit_event
from src.api.entity_execution_dispatcher import (
    EntityExecutor,
    EntityExecutionDispatcher,
)
from src.api.card_charges_validation import validate_card_charges_aggregate

logger = logging.getLogger("card_charges_executor")


@EntityExecutionDispatcher.register("CARD_CHARGES_HEADER")
class CardChargesHeaderExecutor(EntityExecutor):
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
            logger.warning(f"[CardChargesHeaderExecutor] Unhandled operation '{op}'.")

    def _execute_create(
        self,
        db: Session,
        work_item: MakerCheckerWorkItem,
        after_dict: dict,
        checker_user_id: str,
    ) -> None:
        client_id = work_item.client_id
        charge_name = after_dict.get("charge_name", "")
        description = after_dict.get("description")
        active = after_dict.get("active", True)
        entries = after_dict.get("entries", [])

        # Validate complete aggregate
        validate_card_charges_aggregate(
            db=db,
            client_id=client_id,
            charge_name=charge_name,
            entries=entries,
            is_update=False,
        )

        new_header = CardChargesHeader(
            client_id=client_id,
            charge_name=charge_name.strip(),
            description=description.strip() if description else None,
            active=active,
            created_by=work_item.created_by,
            last_modified_by=checker_user_id,
            last_modified_date=datetime.utcnow(),
        )
        db.add(new_header)
        db.flush()

        # Link work_item entity_id to newly created Header ID
        work_item.entity_id = new_header.id

        # Insert entries
        for idx, e in enumerate(entries, start=1):
            new_entry = CardChargeEntry(
                client_id=client_id,
                charge_header_id=new_header.id,
                sequence_no=idx,
                posting_account_type=e.get("posting_account_type", "GL"),
                dr_cr=str(e.get("dr_cr", "D")).upper().strip(),
                narration=str(e.get("narration", "")).strip(),
                posting_account_number=e.get("posting_account_number"),
                posting_branch_type=e.get("posting_branch_type"),
                posting_entry_type=str(e.get("posting_entry_type", "")).strip(),
                amount=float(e.get("amount", 0.0)),
                currency_code=str(e.get("currency_code", "NGN")).upper().strip(),
                active=e.get("active", True),
                created_by=work_item.created_by,
                last_modified_by=checker_user_id,
                last_modified_date=datetime.utcnow(),
            )
            db.add(new_entry)

        log_audit_event(
            db=db,
            entity_type="CARD_CHARGES_HEADER",
            entity_id=new_header.id,
            event_code="CARD_CHARGES_HEADER_CREATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Created Card Charges Header '{new_header.charge_name}'",
            snapshot_data={
                "id": new_header.id,
                "charge_name": new_header.charge_name,
                "entries_count": len(entries),
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
        header = (
            db.query(CardChargesHeader)
            .filter(CardChargesHeader.id == entity_id, CardChargesHeader.client_id == client_id)
            .first()
        )
        if not header:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Card Charges Header #{entity_id} not found.",
            )

        charge_name = after_dict.get("charge_name", header.charge_name)
        description = after_dict.get("description", header.description)
        active = after_dict.get("active", header.active)
        entries = after_dict.get("entries", [])

        # If entries omitted from update payload, keep existing entries
        if "entries" not in after_dict or entries is None:
            existing_entries = db.query(CardChargeEntry).filter(
                CardChargeEntry.charge_header_id == entity_id
            ).all()
            entries = [
                {
                    "id": e.id,
                    "sequence_no": e.sequence_no,
                    "posting_account_type": e.posting_account_type,
                    "dr_cr": e.dr_cr,
                    "narration": e.narration,
                    "posting_account_number": e.posting_account_number,
                    "posting_branch_type": e.posting_branch_type,
                    "posting_entry_type": e.posting_entry_type,
                    "amount": float(e.amount),
                    "currency_code": e.currency_code,
                    "active": e.active,
                }
                for e in existing_entries
            ]

        # Validate aggregate change
        validate_card_charges_aggregate(
            db=db,
            client_id=client_id,
            charge_name=charge_name,
            entries=entries,
            is_update=True,
            header_id=entity_id,
        )

        # Update Header metadata
        header.charge_name = charge_name.strip()
        header.description = description.strip() if description else None
        header.active = active
        header.last_modified_by = checker_user_id
        header.last_modified_date = datetime.utcnow()

        # Entry Reconciliation
        existing_rows = db.query(CardChargeEntry).filter(
            CardChargeEntry.charge_header_id == entity_id
        ).all()
        existing_map = {e.id: e for e in existing_rows}
        seen_entry_ids = set()

        for idx, e in enumerate(entries, start=1):
            e_id = e.get("id")
            if e_id and e_id in existing_map:
                # Update existing entry
                entry = existing_map[e_id]
                entry.sequence_no = idx
                entry.posting_account_type = e.get("posting_account_type", entry.posting_account_type)
                entry.dr_cr = str(e.get("dr_cr", entry.dr_cr)).upper().strip()
                entry.narration = str(e.get("narration", entry.narration)).strip()
                entry.posting_account_number = e.get("posting_account_number")
                entry.posting_branch_type = e.get("posting_branch_type")
                entry.posting_entry_type = str(e.get("posting_entry_type", entry.posting_entry_type)).strip()
                entry.amount = float(e.get("amount", entry.amount))
                entry.currency_code = str(e.get("currency_code", entry.currency_code)).upper().strip()
                entry.active = e.get("active", True)
                entry.last_modified_by = checker_user_id
                entry.last_modified_date = datetime.utcnow()
                seen_entry_ids.add(e_id)
            else:
                # Insert new entry
                new_entry = CardChargeEntry(
                    client_id=client_id,
                    charge_header_id=entity_id,
                    sequence_no=idx,
                    posting_account_type=e.get("posting_account_type", "GL"),
                    dr_cr=str(e.get("dr_cr", "D")).upper().strip(),
                    narration=str(e.get("narration", "")).strip(),
                    posting_account_number=e.get("posting_account_number"),
                    posting_branch_type=e.get("posting_branch_type"),
                    posting_entry_type=str(e.get("posting_entry_type", "")).strip(),
                    amount=float(e.get("amount", 0.0)),
                    currency_code=str(e.get("currency_code", "NGN")).upper().strip(),
                    active=e.get("active", True),
                    created_by=work_item.created_by,
                    last_modified_by=checker_user_id,
                    last_modified_date=datetime.utcnow(),
                )
                db.add(new_entry)

        # Soft-retire entries omitted from payload (active = False)
        for e_id, entry in existing_map.items():
            if e_id not in seen_entry_ids:
                entry.active = False
                entry.last_modified_by = checker_user_id
                entry.last_modified_date = datetime.utcnow()

        log_audit_event(
            db=db,
            entity_type="CARD_CHARGES_HEADER",
            entity_id=header.id,
            event_code="CARD_CHARGES_HEADER_UPDATED",
            performed_by=checker_user_id,
            remarks=f"Approved & Updated Card Charges Header '{header.charge_name}'",
            snapshot_data={
                "id": header.id,
                "charge_name": header.charge_name,
                "active": header.active,
            },
        )
