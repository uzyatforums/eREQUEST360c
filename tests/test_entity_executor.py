import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.db_models import (
    User,
    Permission,
    RolePermission,
    CardSegment,
    MakerCheckerWorkItem,
    MakerCheckerStatus,
    MakerCheckerOperation,
    MakerCheckerEntityType,
)
from tests.conftest import test_engine, TestingSessionLocal
from tests.test_maker_checker import get_auth_header


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
    maker = User(
        user_id="executor_maker",
        username="executor_maker",
        client_id=1,
        password_hash="hash",
        role_code="branch_submitter",
        active=True,
    )
    checker = User(
        user_id="executor_checker",
        username="executor_checker",
        client_id=1,
        password_hash="hash",
        role_code="branch_authorizer",
        active=True,
    )
    tenant2_user = User(
        user_id="tenant2_checker",
        username="tenant2_checker",
        client_id=2,
        password_hash="hash",
        role_code="branch_authorizer",
        active=True,
    )
    db.add_all([maker, checker, tenant2_user])

    # Seed permissions for test checkers
    db.merge(Permission(permission_code="request.approve", permission_name="Approve Requests", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="branch_authorizer", permission_code="request.approve", active=True, created_by="INIT"))

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
        MakerCheckerOperation(operation_code="ACTIVATE", operation_name="Activate", created_by="INIT"),
        MakerCheckerOperation(operation_code="DEACTIVATE", operation_name="Deactivate", created_by="INIT"),
        MakerCheckerOperation(operation_code="APPROVE", operation_name="Approve", created_by="INIT"),
        MakerCheckerOperation(operation_code="REJECT", operation_name="Reject", created_by="INIT"),
        MakerCheckerOperation(operation_code="CANCEL", operation_name="Cancel", created_by="INIT"),
    ]
    entity_types = [
        MakerCheckerEntityType(entity_type_code="CARD_SEGMENT", entity_type_name="Card Segment", created_by="INIT"),
    ]
    for s in statuses:
        db.merge(s)
    for op in operations:
        db.merge(op)
    for et in entity_types:
        db.merge(et)

    # Seed initial CardSegment for client_id 1
    seg1 = CardSegment(
        id=101,
        client_id=1,
        segment_code="EXEC01",
        segment_name="Executor Test Segment 1",
        priority=1,
        active=True,
        created_by="system",
    )
    db.add(seg1)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


def test_approve_deactivate_updates_domain_entity():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    checker_headers = get_auth_header("executor_checker", client_id=1)

    # 1. Maker submits DEACTIVATE request
    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 101,
        "operation_code": "DEACTIVATE",
        "entity_name": "Executor Test Segment 1",
        "before_payload": {"active": True},
        "after_payload": {"active": False},
    }
    sub_res = client.post("/maker-checker/submit", json=payload, headers=maker_headers)
    assert sub_res.status_code == 201
    item_id = sub_res.json()["id"]

    # Verify initial segment active state is True
    db = TestingSessionLocal()
    seg = db.query(CardSegment).get(101)
    assert seg.active is True
    db.close()

    # 2. Checker approves request
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 200
    assert app_res.json()["status_code"] == "APPROVED"

    # 3. Verify domain entity config.card_segments.active is NOW False!
    db = TestingSessionLocal()
    updated_seg = db.query(CardSegment).get(101)
    assert updated_seg.active is False
    assert updated_seg.last_modified_by == "executor_checker"
    db.close()


def test_approve_activate_updates_domain_entity():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    checker_headers = get_auth_header("executor_checker", client_id=1)

    # Deactivate first directly
    db = TestingSessionLocal()
    seg = db.query(CardSegment).get(101)
    seg.active = False
    db.commit()
    db.close()

    # Maker submits ACTIVATE
    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 101,
        "operation_code": "ACTIVATE",
        "entity_name": "Executor Test Segment 1",
        "before_payload": {"active": False},
        "after_payload": {"active": True},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Checker approves
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 200

    # Verify domain entity is active True
    db = TestingSessionLocal()
    seg_after = db.query(CardSegment).get(101)
    assert seg_after.active is True
    db.close()


def test_approve_update_updates_domain_entity():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    checker_headers = get_auth_header("executor_checker", client_id=1)

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 101,
        "operation_code": "UPDATE",
        "entity_name": "Executor Test Segment 1",
        "before_payload": {"segment_name": "Executor Test Segment 1", "priority": 1},
        "after_payload": {"segment_name": "Updated Name By Checker", "priority": 99},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Checker approves
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 200

    # Verify domain entity name and priority updated
    db = TestingSessionLocal()
    seg_after = db.query(CardSegment).get(101)
    assert seg_after.segment_name == "Updated Name By Checker"
    assert seg_after.priority == 99
    db.close()


def test_approve_create_creates_new_domain_entity():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    checker_headers = get_auth_header("executor_checker", client_id=1)

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 0,
        "operation_code": "CREATE",
        "entity_name": "Brand New Segment",
        "before_payload": None,
        "after_payload": {
            "segment_code": "NEWSEG",
            "segment_name": "Brand New Segment",
            "priority": 5,
        },
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Checker approves
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 200

    # Verify new segment created in database
    db = TestingSessionLocal()
    created_seg = db.query(CardSegment).filter(CardSegment.segment_code == "NEWSEG").first()
    assert created_seg is not None
    assert created_seg.segment_name == "Brand New Segment"
    assert created_seg.priority == 5
    assert created_seg.client_id == 1
    db.close()


def test_executor_failure_causes_atomic_rollback():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    checker_headers = get_auth_header("executor_checker", client_id=1)

    # Submit UPDATE with non-existent target entity ID
    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 99999,  # Invalid entity ID
        "operation_code": "UPDATE",
        "entity_name": "Ghost Segment",
        "after_payload": {"segment_name": "Ghost"},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Checker attempts approve -> Should fail HTTP 404 (Entity Not Found)
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 404

    # Verify work item status code WAS NOT changed to APPROVED (atomic rollback)
    db = TestingSessionLocal()
    wi = db.query(MakerCheckerWorkItem).get(item_id)
    assert wi.status_code == "PENDING"
    db.close()


def test_tenant_isolation_prevents_cross_tenant_approval():
    maker_headers = get_auth_header("executor_maker", client_id=1)
    tenant2_headers = get_auth_header("tenant2_checker", client_id=2)

    payload = {
        "entity_type_code": "CARD_SEGMENT",
        "entity_key": 101,
        "operation_code": "DEACTIVATE",
        "after_payload": {"active": False},
    }
    item_id = client.post("/maker-checker/submit", json=payload, headers=maker_headers).json()["id"]

    # Tenant 2 checker attempts to approve Tenant 1 work item -> 404 Not Found
    app_res = client.post(f"/maker-checker/{item_id}/approve", headers=tenant2_headers)
    assert app_res.status_code == 404

    # Verify domain entity active status remains True
    db = TestingSessionLocal()
    seg = db.query(CardSegment).get(101)
    assert seg.active is True
    db.close()
