"""
Authoritative Branch / Checker Approval Security Matrix Test Suite (BR-023)

Validates the universal approval authorization rule:
A request/action initiated by Branch A can only be approved by:
1. A Checker belonging to Branch A, OR
2. A Head Office Checker belonging to the SAME TENANT/CLIENT.

Universal Denials:
3. Branch B Checker -> DENIED (HTTP 403 Cross-branch violation)
4. Other-Tenant Head Office Checker -> DENIED (HTTP 404 / 403 Cross-tenant violation)
5. Request Creator/Maker -> DENIED (HTTP 403 Maker cannot self-approve)
"""

import pytest
import hashlib
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.db_models import User, Role, Branch, Request as RequestModel
from tests.conftest import test_engine, TestingSessionLocal

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def hash_pass(p: str) -> str:
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


@pytest.fixture(autouse=True)
def setup_matrix_test_data():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        # 1. Seed Roles
        for code, name, is_m, is_c, scope in [
            ("super_admin", "Super Admin", True, True, "HEAD_OFFICE"),
            ("branch_submitter", "Branch Submitter", True, False, "BRANCH"),
            ("branch_authorizer", "Branch Authorizer", False, True, "BRANCH"),
        ]:
            if not db.query(Role).filter(Role.role_code == code).first():
                db.add(Role(role_code=code, role_name=name, is_maker=is_m, is_checker=is_c, role_scope=scope, active=True))

        # 2. Seed Branches (Tenant 1: BRA_01, BRA_02; Tenant 2: T2_BRA)
        if not db.query(Branch).filter(Branch.branch_code == "BRA_01").first():
            db.add(Branch(branch_code="BRA_01", branch_name="Branch A01", client_id=1, active=True, created_by="test"))
        if not db.query(Branch).filter(Branch.branch_code == "BRA_02").first():
            db.add(Branch(branch_code="BRA_02", branch_name="Branch B02", client_id=1, active=True, created_by="test"))
        if not db.query(Branch).filter(Branch.branch_code == "T2_BRA").first():
            db.add(Branch(branch_code="T2_BRA", branch_name="Tenant 2 Branch", client_id=2, active=True, created_by="test"))
        db.commit()

        # 3. Seed Users
        # Tenant 1 - Branch A01 Maker
        if not db.query(User).filter(User.username == "t1_bra01_maker").first():
            db.add(User(user_id="U_T1_M01", username="t1_bra01_maker", password_hash=hash_pass("pass123"), role_code="branch_submitter", branch_id="BRA_01", client_id=1, active=True))

        # Tenant 1 - Branch A01 Checker
        if not db.query(User).filter(User.username == "t1_bra01_checker").first():
            db.add(User(user_id="U_T1_C01", username="t1_bra01_checker", password_hash=hash_pass("pass123"), role_code="branch_authorizer", branch_id="BRA_01", client_id=1, active=True))

        # Tenant 1 - Branch B02 Checker (Cross-branch)
        if not db.query(User).filter(User.username == "t1_bra02_checker").first():
            db.add(User(user_id="U_T1_C02", username="t1_bra02_checker", password_hash=hash_pass("pass123"), role_code="branch_authorizer", branch_id="BRA_02", client_id=1, active=True))

        # Tenant 1 - Head Office Checker (Same tenant)
        if not db.query(User).filter(User.username == "t1_ho_checker").first():
            db.add(User(user_id="U_T1_HOC", username="t1_ho_checker", password_hash=hash_pass("pass123"), role_code="super_admin", client_id=1, active=True))

        # Tenant 2 - Head Office Checker (Other tenant)
        if not db.query(User).filter(User.username == "t2_ho_checker").first():
            db.add(User(user_id="U_T2_HOC", username="t2_ho_checker", password_hash=hash_pass("pass123"), role_code="super_admin", client_id=2, active=True))

        db.commit()
    finally:
        db.close()


def get_auth_token(username: str) -> str:
    res = client.post("/auth/login", json={"username": username, "password": "pass123"})
    assert res.status_code == 200, f"Login failed for user '{username}': {res.text}"
    return res.json()["access_token"]


def create_branch_a_request(db) -> int:
    """Helper to create a pending approval request originated at Branch BRA_01 by t1_bra01_maker."""
    req = RequestModel(
        client_id=1,
        account_number="1000000001",
        programme_id=1,
        request_status="PENDING_APPROVAL",
        request_branch="BRA_01",
        created_by="t1_bra01_maker",
        active=True
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req.request_id


# ============================================================================
# 1. Branch A Request + Branch A Checker -> ALLOWED (200)
# ============================================================================
def test_branch_a_request_approved_by_branch_a_checker():
    db = TestingSessionLocal()
    try:
        req_id = create_branch_a_request(db)
        token = get_auth_token("t1_bra01_checker")

        res = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200 OK, got {res.status_code}: {res.text}"
        assert res.json()["request_status"] == "PENDING"
    finally:
        db.close()


# ============================================================================
# 2. Branch A Request + Same-Tenant Head Office Checker -> ALLOWED (200)
# ============================================================================
def test_branch_a_request_approved_by_same_tenant_ho_checker():
    db = TestingSessionLocal()
    try:
        req_id = create_branch_a_request(db)
        token = get_auth_token("t1_ho_checker")

        res = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200, f"Expected 200 OK for Same-Tenant HO Checker, got {res.status_code}: {res.text}"
        assert res.json()["request_status"] == "PENDING"
    finally:
        db.close()


# ============================================================================
# 3. Branch A Request + Branch B Checker -> DENIED (403 Forbidden)
# ============================================================================
def test_branch_a_request_rejected_for_cross_branch_checker():
    db = TestingSessionLocal()
    try:
        req_id = create_branch_a_request(db)
        token = get_auth_token("t1_bra02_checker")

        res = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden for cross-branch checker, got {res.status_code}: {res.text}"
        assert "Branch Access Violation" in res.json()["detail"]
    finally:
        db.close()


# ============================================================================
# 4. Branch A Request + Other-Tenant Head Office Checker -> DENIED (404/403)
# ============================================================================
def test_branch_a_request_rejected_for_other_tenant_ho_checker():
    db = TestingSessionLocal()
    try:
        req_id = create_branch_a_request(db)
        token = get_auth_token("t2_ho_checker")

        res = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code in [403, 404], f"Expected 403/404 for other-tenant HO checker, got {res.status_code}: {res.text}"
    finally:
        db.close()


# ============================================================================
# 5. Branch A Request + Maker Attempting Self-Approval -> DENIED (403 Forbidden)
# ============================================================================
def test_branch_a_request_rejected_for_maker_self_approval():
    db = TestingSessionLocal()
    try:
        # User who has checker role but also is the maker of the request
        if not db.query(User).filter(User.username == "t1_bra01_maker_checker").first():
            db.add(User(user_id="U_T1_MC01", username="t1_bra01_maker_checker", password_hash=hash_pass("pass123"), role_code="super_admin", branch_id="BRA_01", client_id=1, active=True))
            db.commit()

        # Create request created by t1_bra01_maker_checker
        req = RequestModel(
            client_id=1,
            account_number="1000000002",
            programme_id=1,
            request_status="PENDING_APPROVAL",
            request_branch="BRA_01",
            created_by="t1_bra01_maker_checker",
            active=True
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        req_id = req.request_id

        token = get_auth_token("t1_bra01_maker_checker")

        res = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403, f"Expected 403 Forbidden for maker self-approval, got {res.status_code}: {res.text}"
        assert "Maker cannot approve" in res.json()["detail"]
    finally:
        db.close()
