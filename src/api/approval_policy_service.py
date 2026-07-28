import logging
from typing import Optional
from sqlalchemy.orm import Session
from src.db_models import ApprovalPolicy
from src.models import UserInfo, ApprovalPolicySetRequest
from src.api.approval_policy_repository import ApprovalPolicyRepository

logger = logging.getLogger("approval_policy")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


class ApprovalPolicyService:
    @staticmethod
    def requires_approval(
        db: Session, client_id: int, entity_type_code: str, operation_code: str
    ) -> bool:
        # Mandatory Rule: APPROVAL_POLICY entity type ALWAYS requires approval
        if entity_type_code and entity_type_code.upper() == "APPROVAL_POLICY":
            return True

        policy = ApprovalPolicyRepository.get_policy(
            db, client_id, entity_type_code, operation_code
        )
        # Secure default: If no explicit policy exists, default to True (approval required)
        if policy is None:
            return True

        return policy.approval_required

    @staticmethod
    def get_policy(
        db: Session, user: UserInfo, entity_type_code: str, operation_code: str
    ) -> Optional[ApprovalPolicy]:
        return ApprovalPolicyRepository.get_policy(
            db, user.client_id, entity_type_code, operation_code
        )

    @staticmethod
    def list_policies(db: Session, user: UserInfo) -> list[ApprovalPolicy]:
        return ApprovalPolicyRepository.list_policies(db, user.client_id)

    @staticmethod
    def set_policy(
        db: Session, user: UserInfo, req: ApprovalPolicySetRequest
    ) -> ApprovalPolicy:
        policy = ApprovalPolicyRepository.upsert_policy(
            db,
            client_id=user.client_id,
            entity_type_code=req.entity_type_code,
            operation_code=req.operation_code,
            approval_required=req.approval_required,
            user_id=user.user_id,
        )
        db.commit()
        db.refresh(policy)
        logger.info(
            f"[ApprovalPolicyService] set_policy: client_id={user.client_id}, entity_type={req.entity_type_code}, "
            f"operation={req.operation_code}, approval_required={req.approval_required}, user_id={user.user_id}"
        )
        return policy
