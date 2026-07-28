from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from src.db_models import ApprovalPolicy


class ApprovalPolicyRepository:
    @staticmethod
    def get_policy(
        db: Session, client_id: int, entity_type_code: str, operation_code: str
    ) -> Optional[ApprovalPolicy]:
        return (
            db.query(ApprovalPolicy)
            .filter(
                ApprovalPolicy.client_id == client_id,
                ApprovalPolicy.entity_type_code == entity_type_code,
                ApprovalPolicy.operation_code == operation_code,
                ApprovalPolicy.active == True,
            )
            .first()
        )

    @staticmethod
    def list_policies(db: Session, client_id: int) -> list[ApprovalPolicy]:
        return (
            db.query(ApprovalPolicy)
            .filter(
                ApprovalPolicy.client_id == client_id,
                ApprovalPolicy.active == True,
            )
            .order_by(ApprovalPolicy.entity_type_code.asc(), ApprovalPolicy.operation_code.asc())
            .all()
        )

    @staticmethod
    def upsert_policy(
        db: Session,
        client_id: int,
        entity_type_code: str,
        operation_code: str,
        approval_required: bool,
        user_id: str,
    ) -> ApprovalPolicy:
        policy = ApprovalPolicyRepository.get_policy(
            db, client_id, entity_type_code, operation_code
        )
        if policy:
            policy.approval_required = approval_required
            policy.last_modified_by = user_id
            policy.last_modified_date = datetime.utcnow()
            db.flush()
            return policy

        new_policy = ApprovalPolicy(
            client_id=client_id,
            entity_type_code=entity_type_code,
            operation_code=operation_code,
            approval_required=approval_required,
            active=True,
            created_by=user_id,
            created_date=datetime.utcnow(),
        )
        db.add(new_policy)
        db.flush()
        return new_policy
