import logging
from typing import Optional, Callable, Any
from sqlalchemy.orm import Session

from src.models import UserInfo, MakerCheckerSubmitRequest, ConfigExecutionResult
from src.api.approval_policy_service import ApprovalPolicyService
from src.api.maker_checker_service import MakerCheckerService

logger = logging.getLogger("config_orchestrator")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


class ConfigurationOrchestrator:
    @staticmethod
    def execute_change(
        db: Session,
        user: UserInfo,
        entity_type_code: str,
        entity_id: int,
        operation_code: str,
        entity_name: Optional[str],
        before_payload: Optional[dict | str],
        after_payload: dict | str,
        commit_callback: Optional[Callable[[Session, Any], Any]] = None,
    ) -> ConfigExecutionResult:
        approval_req = ApprovalPolicyService.requires_approval(
            db, user.client_id, entity_type_code, operation_code
        )

        if not approval_req:
            logger.info(
                f"[ConfigurationOrchestrator] Direct execution for entity_type={entity_type_code}, "
                f"entity_id={entity_id}, operation={operation_code}, user_id={user.user_id}"
            )
            if commit_callback:
                commit_callback(db, after_payload)

            return ConfigExecutionResult(
                status="COMMITTED",
                entity_id=entity_id,
                message=f"{entity_type_code} change executed and committed immediately.",
            )

        logger.info(
            f"[ConfigurationOrchestrator] Submitting to MakerChecker for entity_type={entity_type_code}, "
            f"entity_id={entity_id}, operation={operation_code}, user_id={user.user_id}"
        )

        submit_req = MakerCheckerSubmitRequest(
            entity_type_code=entity_type_code,
            entity_key=entity_id,
            operation_code=operation_code,
            entity_name=entity_name,
            before_payload=before_payload,
            after_payload=after_payload,
        )

        work_item = MakerCheckerService.submit(db, user, submit_req)

        return ConfigExecutionResult(
            status="PENDING_APPROVAL",
            work_item_id=work_item.id,
            work_item_number=work_item.work_item_number,
            entity_id=entity_id,
            message=f"{entity_type_code} change submitted for approval. Work item ID: {work_item.id}",
        )
