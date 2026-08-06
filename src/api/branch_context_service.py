"""
BranchContextService (Effective Branch Resolution Framework)

Centralized service for authorization guards and database query scoping
based on the authenticated user's CurrentUserContext.

Phase 1 Architectural Assumption:
- A user belongs to at most ONE primary branch assignment (user.branch_id).
- Multi-branch postings, temporary assignments, or delegation are out-of-scope for Phase 1.
"""
from typing import Optional, Any
from fastapi import HTTPException, status, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session, Query

from src.db import get_db
from src.models import CurrentUserContext
from src.api.auth import get_current_user


class BranchContextService:
    def __init__(self, context: CurrentUserContext, db: Session):
        self.context = context
        self.db = db

    def get_effective_branch(self) -> Optional[str]:
        """Returns the operational branch code, or None for Head Office users."""
        return self.context.effective_branch_code

    def is_head_office_user(self) -> bool:
        """Returns True if the user has unconstrained Head Office access."""
        return self.context.is_head_office_user

    def get_client_id(self) -> int:
        """Returns the tenant client_id."""
        return self.context.client_id

    def can_access_branch(self, target_branch_code: Optional[str]) -> bool:
        """
        Validates access to a target branch.
        - Head Office users: Always True for any branch within client_id.
        - Branch Users: True ONLY if target_branch_code == effective_branch_code.
        """
        if self.context.is_head_office_user:
            return True
        if not target_branch_code:
            return False
        return self.context.effective_branch_code == target_branch_code

    def can_access_request(self, request_branch: str, pickup_branch: Optional[str] = None) -> bool:
        """
        Validates if user can view/process a specific request record.
        - Head Office: Always True.
        - Branch User: True if request originated at effective branch OR is assigned to effective branch for pickup.
        """
        if self.context.is_head_office_user:
            return True
        eff_branch = self.context.effective_branch_code
        return (request_branch == eff_branch) or (pickup_branch == eff_branch)

    def assert_branch_access(self, target_branch_code: Optional[str], action_description: str = "operation"):
        """Raises HTTP 403 Forbidden if branch user attempts cross-branch access."""
        if not self.can_access_branch(target_branch_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Branch Access Violation: User '{self.context.username}' at branch '{self.context.effective_branch_code}' cannot execute '{action_description}' for branch '{target_branch_code}'."
            )

    def apply_branch_scope(
        self,
        query: Query,
        model_class: Any,
        primary_branch_col: str = "request_branch",
        secondary_branch_col: Optional[str] = "pickup_branch"
    ) -> Query:
        """
        Applies tenant and branch filtering to a SQLAlchemy Query.
        1. Always filters by client_id (if model has client_id attribute).
        2. If Head Office: No branch filtering applied.
        3. If Branch User: Filters where (model.primary_branch_col == effective_branch_code)
           OR (model.secondary_branch_col == effective_branch_code).
        """
        # Enforce Tenant Isolation
        if hasattr(model_class, "client_id") and self.context.client_id:
            query = query.filter(getattr(model_class, "client_id") == self.context.client_id)

        # Enforce Branch Scoping for Branch Users
        if not self.context.is_head_office_user:
            eff_branch = self.context.effective_branch_code
            if not eff_branch:
                # Defensive path: branch-scoped user with no branch resolves to empty set
                return query.filter(False)

            p_col = getattr(model_class, primary_branch_col, None)
            s_col = getattr(model_class, secondary_branch_col, None) if secondary_branch_col else None

            if p_col is not None and s_col is not None and hasattr(model_class, secondary_branch_col):
                query = query.filter(or_(p_col == eff_branch, s_col == eff_branch))
            elif p_col is not None:
                query = query.filter(p_col == eff_branch)

        return query


def get_branch_context(
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> BranchContextService:
    """FastAPI Dependency for BranchContextService."""
    return BranchContextService(context=current_user, db=db)
