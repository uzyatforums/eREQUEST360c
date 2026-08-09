"""
Tests for Maker/Checker Approval Authorization and Segregation of Duties (SoD).
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))

import pytest
from fastapi.testclient import TestClient
from src.app import app
from src.db import Base, get_db
from src.db_models import (
    User,
    Role,
    Permission,
    RolePermission,
    CardSegment,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    MakerCheckerStatus,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
    MakerCheckerWorkItemAction,
)
from src.api.auth import AuthService
from tests.conftest import test_engine, TestingSessionLocal


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_auth_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Clear work items & roles
    db.query(MakerCheckerWorkItemAction).delete()
    db.query(MakerCheckerWorkItemPayload).delete()
    db.query(MakerCheckerWorkItem).delete()
    db.query(RolePermission).delete()
    db.commit()

    # Seed Roles
    db.merge(Role(role_code="control_maker", role_name="Control Maker", is_maker=True, is_checker=False, active=True))
    db.merge(Role(role_code="control_checker", role_name="Control Checker", is_maker=False, is_checker=True, active=True))

    # Seed Permissions
    db.merge(Permission(permission_code="config.manage", permission_name="Manage Config", active=True, created_by="INIT"))
    db.merge(Permission(permission_code="request.approve", permission_name="Approve Requests", active=True, created_by="INIT"))

    # Seed Role Permissions
    db.merge(RolePermission(role_code="control_maker", permission_code="config.manage", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_checker", permission_code="request.approve", active=True, created_by="INIT"))

    # Seed Users
    db.merge(User(user_id="admin_user", username="admin_user", client_id=1, role_code="super_admin", password_hash="hash", active=True))
    db.merge(User(user_id="controlm", username="controlm", client_id=1, role_code="control_maker", password_hash="hash", active=True))
    db.merge(User(user_id="controlc", username="controlc", client_id=1, role_code="control_checker", password_hash="hash", active=True))
    db.merge(User(user_id="dual_user", username="dual_user", client_id=1, role_code="control_checker", password_hash="hash", active=True))

    # Seed Lookup Tables
    for s_code in ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]:
        db.merge(MakerCheckerStatus(status_code=s_code, status_name=s_code, created_by="INIT"))
    for op_code in ["CREATE", "UPDATE", "DEACTIVATE", "APPROVE", "REJECT", "CANCEL"]:
        db.merge(MakerCheckerOperation(operation_code=op_code, operation_name=op_code, created_by="INIT"))
    db.merge(MakerCheckerEntityType(entity_type_code="CARD_SEGMENT", entity_type_name="Card Segment", created_by="INIT"))

    # Seed Card Segments for testing domain execution
    for key in [501, 502, 503, 504, 505]:
        db.merge(CardSegment(id=key, client_id=1, segment_code=f"SEG{key}", segment_name=f"Segment {key}", priority=1, active=True, created_by="INIT"))

    db.commit()
    db.close()


def get_auth_header(username: str, client_id: int = 1, roles: list = None) -> dict:
    if roles is None:
        if username == "admin_user":
            roles = ["super_admin"]
        elif username == "controlm":
            roles = ["control_maker"]
        elif username == "controlc":
            roles = ["control_checker"]
        elif username == "dual_user":
            roles = ["control_maker", "control_checker"]
        else:
            roles = ["branch_submitter"]
    token = AuthService._create_token(username, client_id, "BR001", roles)
    return {"Authorization": f"Bearer {token}"}


def test_user_without_request_approve_cannot_approve_another_users_work_item():
    """controlm (lacks request.approve) attempts to approve admin's work item -> HTTP 403 Forbidden."""
    admin_headers = get_auth_header("admin_user")
    maker_headers = get_auth_header("controlm")

    # 1. admin creates a work item
    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 501,
        "operation_code": "DEACTIVATE",
        "after_payload": {"segment_code": "SEG501"},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=admin_headers)
    assert sub_res.status_code == 201
    wi_id = sub_res.json()["id"]

    # 2. controlm (lacks request.approve) attempts to approve admin's work item -> 403 Forbidden
    app_res = client.post(f"/maker-checker/{wi_id}/approve", json={"remarks": "Approve test"}, headers=maker_headers)
    assert app_res.status_code == 403
    assert "permission denied" in app_res.json()["detail"].lower()


def test_user_without_request_approve_cannot_reject_another_users_work_item():
    """controlm (lacks request.approve) attempts to reject admin's work item -> HTTP 403 Forbidden."""
    admin_headers = get_auth_header("admin_user")
    maker_headers = get_auth_header("controlm")

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 502,
        "operation_code": "DEACTIVATE",
        "after_payload": {"segment_code": "SEG502"},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=admin_headers)
    assert sub_res.status_code == 201
    wi_id = sub_res.json()["id"]

    # controlm attempts to reject -> 403 Forbidden
    rej_res = client.post(f"/maker-checker/{wi_id}/reject", json={"remarks": "Reject test"}, headers=maker_headers)
    assert rej_res.status_code == 403
    assert "permission denied" in rej_res.json()["detail"].lower()


def test_user_with_request_approve_can_approve_another_users_work_item():
    """controlc (has request.approve) approves admin's work item -> HTTP 200 OK & APPROVED status."""
    admin_headers = get_auth_header("admin_user")
    checker_headers = get_auth_header("controlc")

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 503,
        "operation_code": "DEACTIVATE",
        "after_payload": {"segment_code": "SEG503"},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=admin_headers)
    assert sub_res.status_code == 201
    wi_id = sub_res.json()["id"]

    # controlc approves admin's work item -> 200 OK
    app_res = client.post(f"/maker-checker/{wi_id}/approve", json={"remarks": "Checker approval"}, headers=checker_headers)
    assert app_res.status_code == 200
    assert app_res.json()["status_code"] == "APPROVED"


def test_user_with_request_approve_can_reject_another_users_work_item():
    """controlc (has request.approve) rejects admin's work item -> HTTP 200 OK & REJECTED status."""
    admin_headers = get_auth_header("admin_user")
    checker_headers = get_auth_header("controlc")

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 504,
        "operation_code": "DEACTIVATE",
        "after_payload": {"segment_code": "SEG504"},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=admin_headers)
    assert sub_res.status_code == 201
    wi_id = sub_res.json()["id"]

    # controlc rejects admin's work item -> 200 OK
    rej_res = client.post(f"/maker-checker/{wi_id}/reject", json={"remarks": "Checker rejection"}, headers=checker_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["status_code"] == "REJECTED"


def test_maker_cannot_approve_own_work_item_even_with_approval_permission():
    """dual_user (has both maker role and request.approve permission) creates work item and attempts self-approval -> 409 Conflict (SoD rule)."""
    dual_headers = get_auth_header("dual_user")

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 505,
        "operation_code": "DEACTIVATE",
        "after_payload": {"segment_code": "SEG505"},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=dual_headers)
    assert sub_res.status_code == 201
    wi_id = sub_res.json()["id"]

    # Self approval attempt -> 409 Conflict
    app_res = client.post(f"/maker-checker/{wi_id}/approve", json={"remarks": "Self approve attempt"}, headers=dual_headers)
    assert app_res.status_code == 409
    assert "maker cannot approve" in app_res.json()["detail"].lower()
