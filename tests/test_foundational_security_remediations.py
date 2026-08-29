"""
Foundational Security Remediations Test Suite (SEC-PRE-01 through SEC-PRE-05)

Tests covering:
- SEC-PRE-01: Head Office cross-tenant isolation enforcement
- SEC-PRE-02: Request self-approval prevention (Maker/Checker dual control)
- SEC-PRE-03: Dedicated JWT_SECRET_KEY separation from database_url
- SEC-PRE-04: Removal of hardcoded "admin" username role elevation
- SEC-PRE-05: Branch access enforcement on hotlist endpoint
"""

import pytest
import hashlib
import jwt
from fastapi.testclient import TestClient

from src.app import app
from src.db import SessionLocal, init_db
from src.db_models import User, Role, Branch, Request as RequestModel
from src.config import settings

client = TestClient(app)


def hash_pass(p: str) -> str:
    return hashlib.sha256(p.encode("utf-8")).hexdigest()


@pytest.fixture(autouse=True)
def setup_security_test_data():
    init_db()
    db = SessionLocal()
    try:
        # Seed Roles if missing
        for code, name, is_m, is_c, scope in [
            ("super_admin", "Super Admin", True, True, "HEAD_OFFICE"),
            ("branch_submitter", "Branch Submitter", True, False, "BRANCH"),
            ("branch_authorizer", "Branch Authorizer", False, True, "BRANCH"),
        ]:
            if not db.query(Role).filter(Role.role_code == code).first():
                db.add(Role(role_code=code, role_name=name, is_maker=is_m, is_checker=is_c, role_scope=scope, active=True))

        # Seed Branches
        # Tenant 1 Branches
        if not db.query(Branch).filter(Branch.branch_code == "SEC_B01").first():
            db.add(Branch(branch_code="SEC_B01", branch_name="Sec Branch 01", client_id=1, active=True, created_by="test"))
        if not db.query(Branch).filter(Branch.branch_code == "SEC_B02").first():
            db.add(Branch(branch_code="SEC_B02", branch_name="Sec Branch 02", client_id=1, active=True, created_by="test"))

        # Tenant 2 Branch
        if not db.query(Branch).filter(Branch.branch_code == "T2_B01").first():
            db.add(Branch(branch_code="T2_B01", branch_name="Tenant 2 Branch 01", client_id=2, active=True, created_by="test"))
        db.commit()

        # Seed Users
        # 1. Tenant 1 Head Office User
        if not db.query(User).filter(User.username == "t1_ho_admin").first():
            db.add(User(user_id="U_T1_HO", username="t1_ho_admin", password_hash=hash_pass("pass123"), role_code="super_admin", client_id=1, active=True))

        # 2. Tenant 2 Head Office User
        if not db.query(User).filter(User.username == "t2_ho_admin").first():
            db.add(User(user_id="U_T2_HO", username="t2_ho_admin", password_hash=hash_pass("pass123"), role_code="super_admin", client_id=2, active=True))

        # 3. Submitter & Authorizer User in Tenant 1 (Branch SEC_B01)
        if not db.query(User).filter(User.username == "t1_maker_checker").first():
            db.add(User(user_id="U_T1_MC", username="t1_maker_checker", password_hash=hash_pass("pass123"), role_code="branch_authorizer", branch_id="SEC_B01", client_id=1, active=True))

        # 4. Independent Authorizer User in Tenant 1 (Branch SEC_B01)
        if not db.query(User).filter(User.username == "t1_independent_checker").first():
            db.add(User(user_id="U_T1_IND", username="t1_independent_checker", password_hash=hash_pass("pass123"), role_code="branch_authorizer", branch_id="SEC_B01", client_id=1, active=True))

        # 5. Branch SEC_B02 User in Tenant 1
        if not db.query(User).filter(User.username == "t1_b02_user").first():
            db.add(User(user_id="U_T1_B02", username="t1_b02_user", password_hash=hash_pass("pass123"), role_code="branch_submitter", branch_id="SEC_B02", client_id=1, active=True))

        db.commit()

    finally:
        db.close()


def get_token(username: str, password: str = "pass123") -> str:
    res = client.post("/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, f"Login failed for {username}: {res.text}"
    return res.json()["access_token"]


# ============================================================================
# SEC-PRE-01: Head Office Cross-Tenant Isolation
# ============================================================================
def test_sec_pre_01_head_office_cross_tenant_isolation():
    db = SessionLocal()
    try:
        # Create a request belonging to Tenant 2
        t2_req = RequestModel(
            client_id=2,
            account_number="2222222222",
            programme_id=1,
            request_status="PENDING_APPROVAL",
            request_branch="T2_B01",
            created_by="t2_ho_admin",
            active=True
        )
        db.add(t2_req)
        db.commit()
        db.refresh(t2_req)
        req_id = t2_req.request_id

        # Authenticate as Tenant 1 Head Office User
        t1_token = get_token("t1_ho_admin")
        headers = {"Authorization": f"Bearer {t1_token}"}

        # 1. GET /requests/{id} must not return Tenant 2's request to Tenant 1 HO User
        res_get = client.get(f"/requests/{req_id}", headers=headers)
        assert res_get.status_code in [404, 403], f"Expected 404 or 403, got {res_get.status_code}"

        # 2. POST /requests/{id}/approve must not allow Tenant 1 HO User to approve Tenant 2's request
        res_approve = client.post(f"/requests/{req_id}/approve", headers=headers)
        assert res_approve.status_code in [404, 403], f"Expected 404 or 403, got {res_approve.status_code}"

    finally:
        db.close()


# ============================================================================
# SEC-PRE-02: Request Self-Approval Prevention
# ============================================================================
def test_sec_pre_02_prevent_request_self_approval():
    db = SessionLocal()
    try:
        # Create a request in Tenant 1 where created_by = "t1_maker_checker"
        req = RequestModel(
            client_id=1,
            account_number="1111111111",
            programme_id=1,
            request_status="PENDING_APPROVAL",
            request_branch="SEC_B01",
            created_by="t1_maker_checker",
            active=True
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        req_id = req.request_id

        # Creator attempts to approve their own request -> Must fail with 403
        maker_token = get_token("t1_maker_checker")
        res_self = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {maker_token}"})
        assert res_self.status_code == 403, f"Expected 403 for self-approval, got {res_self.status_code}: {res_self.text}"
        assert "Maker cannot approve" in res_self.json()["detail"]

        # An independent authorizer can approve the request
        checker_token = get_token("t1_independent_checker")
        res_ok = client.post(f"/requests/{req_id}/approve", headers={"Authorization": f"Bearer {checker_token}"})
        assert res_ok.status_code == 200, f"Independent approval failed: {res_ok.text}"

    finally:
        db.close()


# ============================================================================
# SEC-PRE-03: Separate JWT Secret from Database URL
# ============================================================================
def test_sec_pre_03_jwt_secret_key_decoupled():
    # 1. Forge a token signed with settings.database_url instead of settings.jwt_secret_key
    fake_payload = {
        "sub": "t1_ho_admin",
        "client_id": 1,
        "roles": ["super_admin"],
        "is_head_office_user": True
    }
    invalid_token = jwt.encode(fake_payload, settings.database_url, algorithm="HS256")
    res_bad = client.get("/auth/me", headers={"Authorization": f"Bearer {invalid_token}"})
    assert res_bad.status_code == 401, f"Expected 401 for token signed with database_url, got {res_bad.status_code}"

    # 2. Legitimate token signed with settings.jwt_secret_key succeeds
    valid_token = get_token("t1_ho_admin")
    res_good = client.get("/auth/me", headers={"Authorization": f"Bearer {valid_token}"})
    assert res_good.status_code == 200, f"Valid token failed: {res_good.text}"


# ============================================================================
# SEC-PRE-04: Removal of Hardcoded "admin" Role Elevation
# ============================================================================
def test_sec_pre_04_no_hardcoded_admin_role_elevation():
    token = get_token("admin", password="password123")
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=["HS256"], options={"verify_iat": False})
    # admin user role in DB is super_admin. Roles list should be strictly ['super_admin'], not elevated to ['branch_submitter', 'branch_authorizer', 'super_admin']
    assert payload.get("roles") == ["super_admin"], f"Expected ['super_admin'], got {payload.get('roles')}"


# ============================================================================
# SEC-PRE-05: Branch Access Enforcement on Hotlist
# ============================================================================
def test_sec_pre_05_branch_access_on_hotlist():
    db = SessionLocal()
    try:
        # Create a request at Branch SEC_B01
        req = RequestModel(
            client_id=1,
            account_number="3333333333",
            programme_id=1,
            request_status="PENDING",
            request_branch="SEC_B01",
            created_by="t1_maker_checker",
            active=True
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        req_id = req.request_id

        # Branch SEC_B02 user attempts to hotlist SEC_B01 request -> Must fail with 403
        b02_token = get_token("t1_b02_user")
        res_cross = client.post(f"/requests/{req_id}/hotlist", headers={"Authorization": f"Bearer {b02_token}"})
        assert res_cross.status_code == 403, f"Expected 403 for cross-branch hotlist, got {res_cross.status_code}: {res_cross.text}"
        assert "Branch Access Violation" in res_cross.json()["detail"]

        # Branch SEC_B01 user can hotlist SEC_B01 request
        b01_token = get_token("t1_maker_checker")
        res_ok = client.post(f"/requests/{req_id}/hotlist", headers={"Authorization": f"Bearer {b01_token}"})
        assert res_ok.status_code == 200, f"Same-branch hotlist failed: {res_ok.text}"

    finally:
        db.close()
