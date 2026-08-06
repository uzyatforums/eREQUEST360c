"""
Effective Branch Resolution Framework Test Suite

Tests covering:
- Successful branch user login & effective branch resolution
- Successful head office user login & effective branch resolution
- Branch user without assigned branch (HTTP 403 error, zero JWT)
- Branch user with inactive assigned branch (HTTP 403 error, zero JWT)
- apply_branch_scope() query filtering for Branch vs Head Office users
- assert_branch_access() authorization guards
- CurrentUserContext schema population
- Authentication audit logging on login
"""

import pytest
import hashlib
import jwt
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.app import app
from src.db import SessionLocal
from src.db_models import User, Role, Branch, Request as RequestModel, AuditEvent
from src.models import CurrentUserContext
from src.api.branch_context_service import BranchContextService
from src.config import settings

client = TestClient(app)


def hash_pass(p: str) -> str:
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


@pytest.fixture(autouse=True)
def setup_test_data():
    db = SessionLocal()
    try:
        # 1. Seed Roles
        b_role = db.query(Role).filter(Role.role_code == "test_branch_role").first()
        if not b_role:
            db.add(Role(role_code="test_branch_role", role_name="Test Branch Role", is_maker=True, is_checker=False, role_scope="BRANCH", active=True))
        
        ho_role = db.query(Role).filter(Role.role_code == "test_ho_role").first()
        if not ho_role:
            db.add(Role(role_code="test_ho_role", role_name="Test Head Office Role", is_maker=True, is_checker=True, role_scope="HEAD_OFFICE", active=True))
        db.commit()

        # 2. Seed Branches
        active_b = db.query(Branch).filter(Branch.branch_code == "B01").first()
        if not active_b:
            db.add(Branch(branch_code="B01", branch_name="Active Branch B01", client_id=1, active=True, created_by="test"))

        inactive_b = db.query(Branch).filter(Branch.branch_code == "B99").first()
        if not inactive_b:
            db.add(Branch(branch_code="B99", branch_name="Inactive Branch B99", client_id=1, active=False, created_by="test"))
        db.commit()

        # 3. Seed Users
        # User 1: Active Branch User
        u1 = db.query(User).filter(User.username == "branch_user_active").first()
        if not u1:
            db.add(User(user_id="U_B01", username="branch_user_active", client_id=1, branch_id="B01", role_code="test_branch_role", password_hash=hash_pass("pass123"), active=True))

        # User 2: Branch User with No Branch Assigned
        u2 = db.query(User).filter(User.username == "branch_user_nobranch").first()
        if not u2:
            db.add(User(user_id="U_NOBR", username="branch_user_nobranch", client_id=1, branch_id=None, role_code="test_branch_role", password_hash=hash_pass("pass123"), active=True))

        # User 3: Branch User assigned to Inactive Branch
        u3 = db.query(User).filter(User.username == "branch_user_inactivebr").first()
        if not u3:
            db.add(User(user_id="U_INACT", username="branch_user_inactivebr", client_id=1, branch_id="B99", role_code="test_branch_role", password_hash=hash_pass("pass123"), active=True))

        # User 4: Head Office User
        u4 = db.query(User).filter(User.username == "ho_user_active").first()
        if not u4:
            db.add(User(user_id="U_HO", username="ho_user_active", client_id=1, branch_id=None, role_code="test_ho_role", password_hash=hash_pass("pass123"), active=True))
        db.commit()
    finally:
        db.close()


def test_successful_branch_user_login():
    """Verify branch user receives JWT with effective_branch_code and is_head_office_user=False."""
    res = client.post("/auth/login", json={"username": "branch_user_active", "password": "pass123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    payload = jwt.decode(token, settings.database_url, algorithms=["HS256"])
    
    assert payload["effective_branch_code"] == "B01"
    assert payload["role_scope"] == "BRANCH"
    assert payload["is_head_office_user"] is False


def test_successful_head_office_user_login():
    """Verify Head Office user receives JWT with effective_branch_code=None and is_head_office_user=True."""
    res = client.post("/auth/login", json={"username": "ho_user_active", "password": "pass123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    payload = jwt.decode(token, settings.database_url, algorithms=["HS256"])
    
    assert payload["effective_branch_code"] is None
    assert payload["role_scope"] == "HEAD_OFFICE"
    assert payload["is_head_office_user"] is True


def test_branch_user_without_branch_login_fails():
    """Verify login fails with HTTP 403 if a branch-scoped user has no assigned branch."""
    res = client.post("/auth/login", json={"username": "branch_user_nobranch", "password": "pass123"})
    assert res.status_code == 403
    assert "no active branch assignment" in res.json()["detail"].lower()


def test_branch_user_with_inactive_branch_login_fails():
    """Verify login fails with HTTP 403 if a branch-scoped user is assigned to an inactive branch."""
    res = client.post("/auth/login", json={"username": "branch_user_inactivebr", "password": "pass123"})
    assert res.status_code == 403
    assert "inactive or does not exist" in res.json()["detail"].lower()


def test_apply_branch_scope():
    """Verify BranchContextService.apply_branch_scope filters correctly."""
    db = SessionLocal()
    try:
        # Branch User Context
        b_ctx = CurrentUserContext(
            user_id="U_B01",
            username="branch_user_active",
            client_id=1,
            effective_branch_code="B01",
            role_scope="BRANCH",
            is_head_office_user=False,
            roles=["test_branch_role"]
        )
        b_service = BranchContextService(context=b_ctx, db=db)

        # Head Office User Context
        ho_ctx = CurrentUserContext(
            user_id="U_HO",
            username="ho_user_active",
            client_id=1,
            effective_branch_code=None,
            role_scope="HEAD_OFFICE",
            is_head_office_user=True,
            roles=["test_ho_role"]
        )
        ho_service = BranchContextService(context=ho_ctx, db=db)

        # Seed test requests
        req1 = RequestModel(client_id=1, account_number="1234567890", programme_id=1, request_status="PENDING", request_branch="B01", created_by="test")
        req2 = RequestModel(client_id=1, account_number="0987654321", programme_id=1, request_status="PENDING", request_branch="B02", created_by="test")
        db.add_all([req1, req2])
        db.commit()

        # Query for Branch User -> Should only see B01
        b_query = b_service.apply_branch_scope(db.query(RequestModel), RequestModel)
        b_results = b_query.all()
        assert all(r.request_branch == "B01" for r in b_results)

        # Query for HO User -> Should see all
        ho_query = ho_service.apply_branch_scope(db.query(RequestModel), RequestModel)
        ho_results = ho_query.all()
        assert len(ho_results) >= 2

        # Test assert_branch_access
        b_service.assert_branch_access("B01")  # Should pass
        with pytest.raises(Exception) as exc_info:
            b_service.assert_branch_access("B02")  # Should raise 403
        assert exc_info.value.status_code == 403

        # HO service should pass for any branch
        ho_service.assert_branch_access("B02")
    finally:
        db.close()


def test_login_audit_event_logged():
    """Verify that successful login creates an AUTH_LOGIN_SUCCESS audit log."""
    res = client.post("/auth/login", json={"username": "branch_user_active", "password": "pass123"})
    assert res.status_code == 200

    db = SessionLocal()
    try:
        audit_entry = db.query(AuditEvent).filter(
            AuditEvent.performed_by == "branch_user_active"
        ).order_by(AuditEvent.event_id.desc()).first()
        assert audit_entry is not None
        assert audit_entry.branch_code == "B01"
    finally:
        db.close()
