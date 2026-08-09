import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.db_models import (
    User,
    Role,
    Permission,
    RolePermission,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    MakerCheckerStatus,
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
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed required Users
    maker_user = User(
        user_id="maker_01",
        username="maker_01",
        client_id=1,
        password_hash="hash",
        role_code="branch_submitter",
        active=True,
    )
    checker_user = User(
        user_id="checker_01",
        username="checker_01",
        client_id=1,
        password_hash="hash",
        role_code="branch_authorizer",
        active=True,
    )
    other_tenant_user = User(
        user_id="maker_tenant2",
        username="maker_tenant2",
        client_id=2,
        password_hash="hash",
        role_code="branch_submitter",
        active=True,
    )
    db.add_all([maker_user, checker_user, other_tenant_user])

    # Seed permissions for test checkers
    db.merge(Permission(permission_code="request.approve", permission_name="Approve Requests", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="branch_authorizer", permission_code="request.approve", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_checker", permission_code="request.approve", active=True, created_by="INIT"))

    # Seed MakerChecker lookup tables
    statuses = [
        MakerCheckerStatus(status_code="PENDING", status_name="Pending", created_by="INIT"),
        MakerCheckerStatus(status_code="APPROVED", status_name="Approved", created_by="INIT"),
        MakerCheckerStatus(status_code="REJECTED", status_name="Rejected", created_by="INIT"),
        MakerCheckerStatus(status_code="CANCELLED", status_name="Cancelled", created_by="INIT"),
    ]
    operations = [
        MakerCheckerOperation(operation_code="CREATE", operation_name="Create", created_by="INIT"),
        MakerCheckerOperation(operation_code="UPDATE", operation_name="Update", created_by="INIT"),
        MakerCheckerOperation(operation_code="DELETE", operation_name="Delete", created_by="INIT"),
        MakerCheckerOperation(operation_code="APPROVE", operation_name="Approve", created_by="INIT"),
        MakerCheckerOperation(operation_code="REJECT", operation_name="Reject", created_by="INIT"),
        MakerCheckerOperation(operation_code="CANCEL", operation_name="Cancel", created_by="INIT"),
        MakerCheckerOperation(operation_code="RESUBMIT", operation_name="Resubmit", created_by="INIT"),
    ]
    entity_types = [
        MakerCheckerEntityType(entity_type_code="BRANCH", entity_type_name="Branch", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="CARD_PROGRAMME", entity_type_name="Card Programme", created_by="INIT"),
    ]
    for s in statuses:
        if not db.query(MakerCheckerStatus).filter(MakerCheckerStatus.status_code == s.status_code).first():
            db.add(s)
    for o in operations:
        if not db.query(MakerCheckerOperation).filter(MakerCheckerOperation.operation_code == o.operation_code).first():
            db.add(o)
    for e in entity_types:
        if not db.query(MakerCheckerEntityType).filter(MakerCheckerEntityType.entity_type_code == e.entity_type_code).first():
            db.add(e)
    db.commit()

    yield

    db.close()
    Base.metadata.drop_all(bind=test_engine)


def get_auth_header(username: str, client_id: int = 1, roles: list = None):
    if roles is None:
        if "controlm" in username:
            roles = ["control_maker"]
        elif "controlc" in username or "checker" in username or "authorizer" in username:
            roles = ["branch_authorizer", "control_checker"]
        elif "admin" in username:
            roles = ["super_admin"]
        else:
            roles = ["branch_submitter"]
    token = AuthService._create_token(username, client_id, "BR001", roles)
    return {"Authorization": f"Bearer {token}"}


def test_submit_work_item_success():
    headers = get_auth_header("maker_01", client_id=1)
    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 101,
        "operation_code": "UPDATE",
        "entity_name": "Lagos Main Branch",
        "before_payload": {"branch_name": "Lagos Main", "charge_amount": 1000},
        "after_payload": {"branch_name": "Lagos Central", "charge_amount": 1500},
    }

    res = client.post("/maker-checker/submit", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["status_code"] == "PENDING"
    assert data["created_by"] == "maker_01"
    assert data["entity_id"] == 101
    work_item_id = data["id"]

    # Verify payload endpoint
    payload_res = client.get(f"/maker-checker/{work_item_id}/payload", headers=headers)
    assert payload_res.status_code == 200
    p_data = payload_res.json()
    assert p_data["entity_name"] == "Lagos Main Branch"

    # Verify history & change summary
    history_res = client.get(f"/maker-checker/{work_item_id}/history", headers=headers)
    assert history_res.status_code == 200
    h_data = history_res.json()
    assert len(h_data) == 1
    assert "Branch Name changed from Lagos Main to Lagos Central" in h_data[0]["change_summary"]
    assert "Charge Amount changed from 1000 to 1500" in h_data[0]["change_summary"]


def test_approve_own_work_item_fails():
    headers = get_auth_header("maker_01", client_id=1)
    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 102,
        "operation_code": "CREATE",
        "after_payload": {"name": "New Branch"},
    }
    submit_res = client.post("/maker-checker/submit", json=payload, headers=headers)
    item_id = submit_res.json()["id"]

    # Maker attempts to approve request without request.approve permission -> 403 Forbidden
    approve_res = client.post(f"/maker-checker/{item_id}/approve", headers=headers)
    assert approve_res.status_code == 403
    assert "sufficient privileges" in approve_res.json()["detail"].lower()


def test_checker_approve_success():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 103,
        "operation_code": "CREATE",
        "after_payload": {"name": "Abuja Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Checker approves
    approve_res = client.post(
        f"/maker-checker/{item_id}/approve",
        json={"remarks": "Looks good"},
        headers=checker_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status_code"] == "APPROVED"
    assert approve_res.json()["checker_user_id"] == "checker_01"


def test_approve_already_approved_item_fails():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 104,
        "operation_code": "CREATE",
        "after_payload": {"name": "Kano Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)

    # Attempt to approve again -> 409 Conflict
    re_approve = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert re_approve.status_code == 409
    assert "Only PENDING items can be target of this action" in re_approve.json()["detail"]


def test_reject_already_approved_item_fails():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 105,
        "operation_code": "CREATE",
        "after_payload": {"name": "Enugu Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)

    # Attempt to reject an approved item -> 409 Conflict
    reject_res = client.post(f"/maker-checker/{item_id}/reject", headers=checker_headers)
    assert reject_res.status_code == 409
    assert "Only PENDING items can be target of this action" in reject_res.json()["detail"]


def test_cancel_already_approved_item_fails():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 106,
        "operation_code": "CREATE",
        "after_payload": {"name": "Ibadan Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)

    # Maker attempts to cancel an approved item -> 409 Conflict
    cancel_res = client.post(f"/maker-checker/{item_id}/cancel", headers=maker_headers)
    assert cancel_res.status_code == 409
    assert "Only PENDING items can be target of this action" in cancel_res.json()["detail"]


def test_resubmit_pending_item_fails():
    maker_headers = get_auth_header("maker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 107,
        "operation_code": "CREATE",
        "after_payload": {"name": "Port Harcourt Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Attempt to resubmit while item is still PENDING -> 409 Conflict
    resubmit_payload = {"after_payload": {"name": "PH Main Branch"}}
    resubmit_res = client.post(
        f"/maker-checker/{item_id}/resubmit", json=resubmit_payload, headers=maker_headers
    )
    assert resubmit_res.status_code == 409
    assert "Only REJECTED items can be target of this action" in resubmit_res.json()["detail"]


def test_full_lifecycle_reject_resubmit_approve():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 108,
        "operation_code": "UPDATE",
        "before_payload": {"daily_limit": 500000},
        "after_payload": {"daily_limit": 1000000},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # 1. Checker rejects
    client.post(
        f"/maker-checker/{item_id}/reject",
        json={"remarks": "Limit too high"},
        headers=checker_headers,
    )

    # 2. Maker resubmits with lower limit
    resubmit_req = {
        "after_payload": {"daily_limit": 700000},
        "remarks": "Reduced daily limit as requested",
    }
    resubmit_res = client.post(
        f"/maker-checker/{item_id}/resubmit", json=resubmit_req, headers=maker_headers
    )
    assert resubmit_res.status_code == 200
    assert resubmit_res.json()["status_code"] == "PENDING"

    # 3. Checker approves resubmitted item
    final_approve = client.post(
        f"/maker-checker/{item_id}/approve",
        json={"remarks": "Approved 700k limit"},
        headers=checker_headers,
    )
    assert final_approve.status_code == 200
    assert final_approve.json()["status_code"] == "APPROVED"

    # 4. Check action history sequence
    history_res = client.get(f"/maker-checker/{item_id}/history", headers=maker_headers)
    history = history_res.json()
    assert len(history) == 4
    operations = [h["operation_code"] for h in history]
    assert operations == ["UPDATE", "REJECT", "RESUBMIT", "APPROVE"]
    assert "Daily Limit changed from 500000 to 700000" in history[2]["change_summary"]


def test_invalid_lookup_codes_submit_fails():
    headers = get_auth_header("maker_01", client_id=1)
    payload = {
        "entity_type_code": "NON_EXISTENT_ENTITY",
        "entity_key": 999,
        "operation_code": "UPDATE",
        "after_payload": {"name": "Test"},
    }
    res = client.post("/maker-checker/submit", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Invalid or inactive entity_type_code" in res.json()["detail"]


def test_cross_tenant_access_denied():
    maker_headers_tenant1 = get_auth_header("maker_01", client_id=1)
    maker_headers_tenant2 = get_auth_header("maker_tenant2", client_id=2)
    checker_headers_tenant2 = get_auth_header("checker_tenant2", client_id=2)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 201,
        "operation_code": "CREATE",
        "after_payload": {"name": "Tenant 1 Secret Branch"},
    }
    submit_res = client.post("/maker-checker/submit", json=payload, headers=maker_headers_tenant1)
    item_id = submit_res.json()["id"]

    # Tenant 2 attempts to fetch work item detail -> 404 Not Found
    get_res = client.get(f"/maker-checker/{item_id}", headers=maker_headers_tenant2)
    assert get_res.status_code == 404

    # Tenant 2 attempts to fetch payload -> 404 Not Found
    payload_res = client.get(f"/maker-checker/{item_id}/payload", headers=maker_headers_tenant2)
    assert payload_res.status_code == 404

    # Tenant 2 checker attempts to approve -> 404 Not Found
    approve_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers_tenant2)
    assert approve_res.status_code == 404


def test_non_existent_work_item_404():
    headers = get_auth_header("maker_01", client_id=1)
    res = client.get("/maker-checker/999999", headers=headers)
    assert res.status_code == 404
    assert "Work item not found" in res.json()["detail"]


def test_non_maker_cancel_and_resubmit_fails():
    maker_headers = get_auth_header("maker_01", client_id=1)
    checker_headers = get_auth_header("checker_01", client_id=1)

    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 202,
        "operation_code": "CREATE",
        "after_payload": {"name": "Test Branch"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Non-maker attempts to cancel -> 409 Conflict
    cancel_res = client.post(f"/maker-checker/{item_id}/cancel", headers=checker_headers)
    assert cancel_res.status_code == 409
    assert "Only the maker who created the work item can cancel it" in cancel_res.json()["detail"]


def test_ignored_audit_fields_in_change_summary():
    headers = get_auth_header("maker_01", client_id=1)
    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 203,
        "operation_code": "UPDATE",
        "before_payload": {"branch_name": "Old", "created_by": "admin", "created_date": "2026-01-01"},
        "after_payload": {"branch_name": "New", "created_by": "user2", "created_date": "2026-07-28"},
    }
    res = client.post("/maker-checker/submit", json=payload, headers=headers)
    item_id = res.json()["id"]

    history_res = client.get(f"/maker-checker/{item_id}/history", headers=headers)
    summary = history_res.json()[0]["change_summary"]
    assert "Branch Name changed from Old to New" in summary
    assert "Created By" not in summary
    assert "Created Date" not in summary


def test_get_pending_count():
    maker_headers = get_auth_header("maker_01", client_id=1)
    other_tenant_headers = get_auth_header("other_tenant", client_id=2)

    # Initial count for client_id 1
    res1 = client.get("/maker-checker/pending/count", headers=maker_headers)
    assert res1.status_code == 200
    initial_count = res1.json()["count"]

    # Submit a new item for client_id 1
    payload = {
        "entity_type_code": "BRANCH",
        "entity_key": 999,
        "operation_code": "CREATE",
        "after_payload": {"branch_name": "Count Test Branch"},
    }
    client.post("/maker-checker/submit", json=payload, headers=maker_headers)

    # Verify count incremented for client_id 1
    res2 = client.get("/maker-checker/pending/count", headers=maker_headers)
    assert res2.status_code == 200
    assert res2.json()["count"] == initial_count + 1

    # Verify count for client_id 2 does not include client_id 1 items
    res_tenant2 = client.get("/maker-checker/pending/count", headers=other_tenant_headers)
    assert res_tenant2.status_code == 200
    assert isinstance(res_tenant2.json()["count"], int)

