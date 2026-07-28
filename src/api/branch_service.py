import logging
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.db_models import Branch
from src.models import (
    UserInfo,
    BranchCreateRequest,
    BranchUpdateRequest,
    ConfigExecutionResult,
)
from src.api.branch_repository import BranchRepository
from src.api.config_orchestrator import ConfigurationOrchestrator

logger = logging.getLogger("branch_service")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


class BranchService:
    @staticmethod
    def list_branches(
        db: Session, user: UserInfo, active_only: bool = True
    ) -> list[Branch]:
        return BranchRepository.list_branches(db, user.client_id, active_only=active_only)

    @staticmethod
    def get_branch(db: Session, user: UserInfo, branch_code: str) -> Branch:
        branch = BranchRepository.get_by_code(db, user.client_id, branch_code)
        if not branch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Branch with code '{branch_code}' not found",
            )
        return branch

    @staticmethod
    def create_branch(
        db: Session, user: UserInfo, req: BranchCreateRequest
    ) -> ConfigExecutionResult:
        code_clean = req.branch_code.strip()
        name_clean = req.branch_name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="branch_name cannot be empty",
            )

        # Primary Key uniqueness friendly check
        existing = BranchRepository.get_by_code(db, user.client_id, code_clean)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch with code '{code_clean}' already exists",
            )

        if req.state_code and not BranchRepository.validate_state_code(db, req.state_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or inactive state_code '{req.state_code}'",
            )

        # Business fields ONLY for Maker/Checker payload (exclude audit fields)
        after_dict = {
            "branch_code": code_clean,
            "branch_name": name_clean,
            "state_code": req.state_code.strip() if req.state_code else None,
            "active": True,
        }

        def commit_cb(session: Session, data: dict):
            BranchRepository.create_branch(
                session,
                client_id=user.client_id,
                branch_code=data["branch_code"],
                branch_name=data["branch_name"],
                state_code=data.get("state_code"),
                user_id=user.user_id,
            )

        return ConfigurationOrchestrator.execute_change(
            db=db,
            user=user,
            entity_type_code="BRANCH",
            entity_id=0,
            operation_code="CREATE",
            entity_name=f"Branch {code_clean}",
            before_payload=None,
            after_payload=after_dict,
            commit_callback=commit_cb,
        )

    @staticmethod
    def update_branch(
        db: Session, user: UserInfo, branch_code: str, req: BranchUpdateRequest
    ) -> ConfigExecutionResult:
        branch = BranchService.get_branch(db, user, branch_code)

        name_clean = req.branch_name.strip()
        if not name_clean:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="branch_name cannot be empty",
            )

        if req.state_code and not BranchRepository.validate_state_code(db, req.state_code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or inactive state_code '{req.state_code}'",
            )

        # Business fields ONLY for Maker/Checker payload
        before_dict = {
            "branch_code": branch.branch_code,
            "branch_name": branch.branch_name,
            "state_code": branch.state_code,
            "active": branch.active,
        }

        after_dict = {
            "branch_code": branch.branch_code,  # Immutable
            "branch_name": name_clean,
            "state_code": req.state_code.strip() if req.state_code else None,
            "active": branch.active,
        }

        def commit_cb(session: Session, data: dict):
            BranchRepository.update_branch(
                session,
                client_id=user.client_id,
                branch_code=branch.branch_code,
                branch_name=data["branch_name"],
                state_code=data.get("state_code"),
                user_id=user.user_id,
            )

        return ConfigurationOrchestrator.execute_change(
            db=db,
            user=user,
            entity_type_code="BRANCH",
            entity_id=0,
            operation_code="UPDATE",
            entity_name=f"Branch {branch.branch_code}",
            before_payload=before_dict,
            after_payload=after_dict,
            commit_callback=commit_cb,
        )

    @staticmethod
    def delete_branch(
        db: Session, user: UserInfo, branch_code: str
    ) -> ConfigExecutionResult:
        branch = BranchService.get_branch(db, user, branch_code)

        before_dict = {
            "branch_code": branch.branch_code,
            "branch_name": branch.branch_name,
            "state_code": branch.state_code,
            "active": branch.active,
        }

        after_dict = {
            "branch_code": branch.branch_code,
            "branch_name": branch.branch_name,
            "state_code": branch.state_code,
            "active": False,  # Soft delete
        }

        def commit_cb(session: Session, data: dict):
            BranchRepository.deactivate_branch(
                session,
                client_id=user.client_id,
                branch_code=data["branch_code"],
                user_id=user.user_id,
            )

        return ConfigurationOrchestrator.execute_change(
            db=db,
            user=user,
            entity_type_code="BRANCH",
            entity_id=0,
            operation_code="DELETE",
            entity_name=f"Branch {branch.branch_code}",
            before_payload=before_dict,
            after_payload=after_dict,
            commit_callback=commit_cb,
        )
