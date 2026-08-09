from datetime import datetime, timedelta, timezone
from typing import Optional
import hashlib

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.db import get_db
from src.models import LoginRequest, TokenResponse, UserInfo, UserCreate, UserRead, RoleRead, UserUpdate, IAMRoleRead, IAMPermissionRead, CurrentUserContext
from src.config import settings
from src.db_models import User, Role, Permission, RolePermission, Branch
from src.api.audit_service import log_audit_event


router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)


class AuthService:
    @staticmethod
    def _create_token(
        username: str,
        client_id: int,
        effective_branch_code: Optional[str] = None,
        roles: Optional[list[str]] = None,
        user_id: Optional[str] = None,
        role_scope: str = "BRANCH",
        is_head_office_user: Optional[bool] = None,
    ) -> str:
        if roles is None:
            roles = []
        if is_head_office_user is None:
            is_head_office_user = (role_scope == "HEAD_OFFICE")

        payload = {
            "sub": username,
            "user_id": user_id or username,
            "client_id": client_id,
            "branch_code": effective_branch_code,  # Backward compatibility alias
            "effective_branch_code": effective_branch_code,
            "role_scope": role_scope,
            "is_head_office_user": is_head_office_user,
            "roles": roles,
            "exp": datetime.now(timezone.utc) + timedelta(hours=8),
        }
        return jwt.encode(payload, settings.database_url, algorithm="HS256")

    @staticmethod
    def authenticate(db: Session, username: str, password: str) -> Optional[dict]:
        user_obj = db.query(User).filter(User.username == username, User.active == True).first()
        if not user_obj:
            return None
        hashed_pass = hashlib.sha256(password.encode("utf-8")).hexdigest()
        if user_obj.password_hash != hashed_pass:
            return None

        roles = [user_obj.role_code]
        if user_obj.username == "admin" and "super_admin" in roles:
            roles = ["branch_submitter", "branch_authorizer", "super_admin"]

        # Fetch Role definition from DB to check role_scope
        role_obj = db.query(Role).filter(Role.role_code == user_obj.role_code).first()
        role_scope = getattr(role_obj, "role_scope", "BRANCH") if role_obj else ("HEAD_OFFICE" if user_obj.role_code in ["super_admin", "operations_admin_maker", "operations_admin_checker"] else "BRANCH")

        if role_scope == "HEAD_OFFICE":
            effective_branch_code = None
            is_head_office_user = True
        else:
            # Branch-scoped user: MUST have an active branch assignment
            if not user_obj.branch_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Branch-scoped user has no active branch assignment"
                )
            branch_obj = db.query(Branch).filter(Branch.branch_code == user_obj.branch_id, Branch.active == True).first()
            if not branch_obj:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Branch-scoped user's assigned branch '{user_obj.branch_id}' is inactive or does not exist"
                )
            effective_branch_code = user_obj.branch_id
            is_head_office_user = False

        return {
            "user_id": user_obj.user_id,
            "username": user_obj.username,
            "client_id": user_obj.client_id or 1,
            "branch_code": effective_branch_code,
            "effective_branch_code": effective_branch_code,
            "role_scope": role_scope,
            "is_head_office_user": is_head_office_user,
            "roles": roles,
        }


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> CurrentUserContext:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        payload = jwt.decode(credentials.credentials, settings.database_url, algorithms=["HS256"])
    except Exception as exc:  # pragma: no cover - defensive path
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    effective_branch = payload.get("effective_branch_code") or payload.get("branch_code")
    role_scope = payload.get("role_scope", "BRANCH")
    is_head_office = payload.get("is_head_office_user", False if role_scope == "BRANCH" else True)

    return CurrentUserContext(
        user_id=str(payload.get("user_id", payload.get("sub", "unknown"))),
        username=str(payload.get("sub", "unknown")),
        client_id=int(payload.get("client_id", 0)),
        branch_code=effective_branch,
        effective_branch_code=effective_branch,
        role_scope=role_scope,
        is_head_office_user=is_head_office,
        roles=list(payload.get("roles", [])),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = AuthService.authenticate(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = AuthService._create_token(
        username=user["username"],
        user_id=user["user_id"],
        client_id=user["client_id"],
        effective_branch_code=user["effective_branch_code"],
        role_scope=user["role_scope"],
        is_head_office_user=user["is_head_office_user"],
        roles=user["roles"],
    )

    try:
        log_audit_event(
            db=db,
            entity_type="USER",
            entity_id=abs(hash(user["user_id"])) % 2147483647,
            event_code="AUTH_LOGIN_SUCCESS",
            performed_by=user["username"],
            branch_code=user["effective_branch_code"],
            remarks=f"User login successful (role_scope: {user['role_scope']}, is_head_office: {user['is_head_office_user']})",
            snapshot_data={
                "user_id": user["user_id"],
                "client_id": user["client_id"],
                "effective_branch_code": user["effective_branch_code"],
                "role_scope": user["role_scope"],
                "is_head_office_user": user["is_head_office_user"],
                "roles": user["roles"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        )
    except Exception:
        pass

    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserInfo)
def me(current_user: UserInfo = Depends(get_current_user)):
    return current_user


@router.get("/roles", response_model=list[IAMRoleRead])
def get_iam_roles(db: Session = Depends(get_db)):
    return db.query(Role).filter(Role.active == True).all()


@router.get("/permissions", response_model=list[IAMPermissionRead])
def get_iam_permissions(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if "super_admin" in current_user.roles:
        return db.query(Permission).filter(Permission.active == True).all()

    # Join role_permissions for user's assigned roles
    permission_codes = (
        db.query(RolePermission.permission_code)
        .filter(RolePermission.role_code.in_(current_user.roles), RolePermission.active == True)
        .all()
    )
    codes = [p[0] for p in permission_codes]
    return db.query(Permission).filter(Permission.permission_code.in_(codes), Permission.active == True).all()


def user_has_permission(db: Session, current_user: UserInfo, permission_code: str) -> bool:
    if "super_admin" in current_user.roles:
        return True
    if not current_user.roles:
        return False
    count = (
        db.query(RolePermission.permission_code)
        .filter(
            RolePermission.role_code.in_(current_user.roles),
            RolePermission.permission_code == permission_code,
            RolePermission.active == True,
        )
        .count()
    )
    return count > 0


def require_permission(db: Session, current_user: UserInfo, permission_code: str):
    if not user_has_permission(db, current_user, permission_code):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: Requires '{permission_code}' permission",
        )


users_router = APIRouter(prefix="/users", tags=["users"])


@users_router.post("/", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Enforce role permission check
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in [
            "operations_admin_maker",
            "operations_admin_checker",
            "internal_control_maker",
            "internal_control_checker",
        ]
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to create users",
        )

    # Enforce tenant isolation for non-super-admins
    if "super_admin" not in current_user.roles and current_user.client_id != payload.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot create user for another tenant",
        )

    # Check if user_id or username already exists
    existing_user_id = db.query(User).filter(User.user_id == payload.user_id).first()
    if existing_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User ID already exists",
        )
    existing_username = db.query(User).filter(User.username == payload.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists",
        )

    hashed_pass = hashlib.sha256(payload.password.encode("utf-8")).hexdigest()

    new_user = User(
        user_id=payload.user_id,
        client_id=payload.client_id,
        branch_id=payload.branch_id,
        username=payload.username,
        email=payload.email,
        password_hash=hashed_pass,
        role_code=payload.role_code,
        phone_1=payload.phone_1,
        active=True,
        created_by=current_user.username,
        created_date=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@users_router.get("/{user_id}", response_model=UserRead)
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    user_obj = db.query(User).filter(User.user_id == user_id).first()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Access Control check
    is_self = current_user.user_id == user_id
    is_super_admin = "super_admin" in current_user.roles
    is_tenant_admin = (
        any(
            r in current_user.roles
            for r in [
                "operations_admin_maker",
                "operations_admin_checker",
                "internal_control_maker",
                "internal_control_checker",
            ]
        )
        and current_user.client_id == user_obj.client_id
    )

    if not (is_self or is_super_admin or is_tenant_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to user profile",
        )

    return user_obj


@users_router.get("/", response_model=list[UserRead])
def list_users(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in [
            "operations_admin_maker",
            "operations_admin_checker",
            "internal_control_maker",
            "internal_control_checker",
        ]
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to view user list",
        )

    if "super_admin" in current_user.roles:
        return db.query(User).all()

    return db.query(User).filter(User.client_id == current_user.client_id).all()


@users_router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: str,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Enforce role permission check
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in [
            "operations_admin_maker",
            "operations_admin_checker",
            "internal_control_maker",
            "internal_control_checker",
        ]
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to update users",
        )

    user_obj = db.query(User).filter(User.user_id == user_id).first()
    if not user_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Enforce tenant isolation for non-super-admins
    if "super_admin" not in current_user.roles and current_user.client_id != user_obj.client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update user of another tenant",
        )

    # Apply updates
    if payload.username is not None:
        # Check if username is taken by another user
        exist = db.query(User).filter(User.username == payload.username, User.user_id != user_id).first()
        if exist:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists",
            )
        user_obj.username = payload.username
    if payload.email is not None:
        user_obj.email = payload.email
    if payload.role_code is not None:
        user_obj.role_code = payload.role_code
    if payload.branch_id is not None:
        user_obj.branch_id = payload.branch_id
    if payload.phone_1 is not None:
        user_obj.phone_1 = payload.phone_1
    if payload.active is not None:
        # Prevent disabling oneself
        if user_id == current_user.user_id and not payload.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate yourself",
            )
        user_obj.active = payload.active

    user_obj.last_modified_by = current_user.username
    user_obj.last_modified_date = datetime.now(timezone.utc)

    db.commit()
    db.refresh(user_obj)
    return user_obj




roles_router = APIRouter(prefix="/roles", tags=["roles"])


@roles_router.get("/", response_model=list[RoleRead])
def list_roles(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    return db.query(Role).filter(Role.active == True).all()

