from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session
from src.db_models import Branch, State


class BranchRepository:
    @staticmethod
    def get_by_code(
        db: Session, client_id: int, branch_code: str
    ) -> Optional[Branch]:
        return (
            db.query(Branch)
            .filter(
                Branch.client_id == client_id,
                Branch.branch_code == branch_code,
            )
            .first()
        )

    @staticmethod
    def list_branches(
        db: Session, client_id: int, active_only: bool = True
    ) -> list[Branch]:
        query = db.query(Branch).filter(Branch.client_id == client_id)
        if active_only:
            query = query.filter(Branch.active == True)
        return query.order_by(Branch.branch_code.asc()).all()

    @staticmethod
    def create_branch(
        db: Session,
        client_id: int,
        branch_code: str,
        branch_name: str,
        state_code: Optional[str],
        user_id: str,
    ) -> Branch:
        branch = Branch(
            branch_code=branch_code.strip(),
            branch_name=branch_name.strip(),
            client_id=client_id,
            state_code=state_code.strip() if state_code else None,
            active=True,
            created_by=user_id,
            created_date=datetime.utcnow(),
        )
        db.add(branch)
        db.flush()
        return branch

    @staticmethod
    def update_branch(
        db: Session,
        client_id: int,
        branch_code: str,
        branch_name: str,
        state_code: Optional[str],
        user_id: str,
    ) -> Optional[Branch]:
        branch = BranchRepository.get_by_code(db, client_id, branch_code)
        if branch:
            branch.branch_name = branch_name.strip()
            branch.state_code = state_code.strip() if state_code else None
            branch.last_modified_by = user_id
            branch.last_modified_date = datetime.utcnow()
            db.flush()
        return branch

    @staticmethod
    def deactivate_branch(
        db: Session, client_id: int, branch_code: str, user_id: str
    ) -> Optional[Branch]:
        branch = BranchRepository.get_by_code(db, client_id, branch_code)
        if branch:
            branch.active = False
            branch.last_modified_by = user_id
            branch.last_modified_date = datetime.utcnow()
            db.flush()
        return branch

    @staticmethod
    def validate_state_code(db: Session, state_code: str) -> bool:
        if not state_code:
            return True
        state = (
            db.query(State.state_code)
            .filter(
                State.state_code == state_code.strip(),
                State.active == True,
            )
            .first()
        )
        return state is not None
