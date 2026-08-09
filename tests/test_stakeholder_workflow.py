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
    MakerCheckerStatus,
    MakerCheckerOperation,
    MakerCheckerEntityType,
)
from src.seed import hash_password
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

    # Seed Roles
    r_maker = Role(
        role_code="control_maker",
        role_name="Control Maker",
        description="Control Maker Profile",
        is_maker=True,
        is_checker=False,
        role_scope="HEAD_OFFICE",
        active=True,
    )
    r_checker = Role(
        role_code="control_checker",
        role_name="Control Checker",
        description="Control Checker Profile",
        is_maker=False,
        is_checker=True,
        role_scope="HEAD_OFFICE",
        active=True,
    )
    db.merge(r_maker)
    db.merge(r_checker)

    # Seed Users
    controlm = User(
        user_id="controlm",
        username="controlm",
        client_id=1,
        branch_id="001",
        email="controlm@apexmfb.com",
        password_hash=hash_password("password123"),
        role_code="control_maker",
        active=True,
    )
    controlc = User(
        user_id="controlc",
        username="controlc",
        client_id=1,
        branch_id="001",
        email="controlc@apexmfb.com",
        password_hash=hash_password("password123"),
        role_code="control_checker",
        active=True,
    )
    db.merge(controlm)
    db.merge(controlc)

    db.merge(RolePermission(role_code="control_maker", permission_code="config.manage", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_maker", permission_code="config.view", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_checker", permission_code="config.view", active=True, created_by="INIT"))
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
    seg = CardSegment(
        id=505,
        client_id=1,
        segment_code="STAKE01",
        segment_name="Stakeholder Test Segment",
        priority=1,
        active=True,
        created_by="system",
    )
    db.merge(seg)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=test_engine)


def test_controlm_and_controlc_workflow():
    controlm_headers = get_auth_header("controlm", client_id=1)
    controlc_headers = get_auth_header("controlc", client_id=1)

    # Step 1: controlm submits configuration change (deactivate segment 505)
    deactivate_res = client.post(
        "/config/card-segments/505/deactivate",
        headers=controlm_headers,
    )
    assert deactivate_res.status_code == 200
    res_data = deactivate_res.json()
    assert res_data["status"] == "PENDING_APPROVAL"
    work_item_id = res_data["work_item_id"]

    # Step 2: Submitted work item appears in Maker/Checker pending queue for controlc
    pending_res = client.get("/maker-checker/pending", headers=controlc_headers)
    assert pending_res.status_code == 200
    pending_items = pending_res.json()
    matched = [item for item in pending_items if item["id"] == work_item_id]
    assert len(matched) == 1
    assert matched[0]["created_by"] == "controlm"

    # Pending count is 1 or more
    count_res1 = client.get("/maker-checker/pending/count", headers=controlc_headers)
    assert count_res1.status_code == 200
    count_before = count_res1.json()["count"]
    assert count_before >= 1

    # Step 3: controlm CANNOT approve submission (Lacks request.approve permission -> 403 Forbidden)
    sod_res = client.post(f"/maker-checker/{work_item_id}/approve", headers=controlm_headers)
    assert sod_res.status_code == 403
    assert "permission denied" in sod_res.json()["detail"].lower()

    # Step 4: controlc can approve it
    approve_res = client.post(f"/maker-checker/{work_item_id}/approve", headers=controlc_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status_code"] == "APPROVED"
    assert approve_res.json()["checker_user_id"] == "controlc"

    # Step 5: After approval, underlying configuration entity (config.card_segments.active) is actually changed to False
    db = TestingSessionLocal()
    seg = db.query(CardSegment).get(505)
    assert seg.active is False
    assert seg.last_modified_by == "controlc"
    db.close()

    # Step 6: Pending count decrements
    count_res2 = client.get("/maker-checker/pending/count", headers=controlc_headers)
    assert count_res2.status_code == 200
    assert count_res2.json()["count"] == count_before - 1


def test_seeded_users_use_sys_tenant_id_and_are_idempotent():
    from src.seed import seed_data, Client

    db = TestingSessionLocal()
    # 1. Execute seed_data
    seed_data(db)

    # Resolve sys_tenant_id
    sys_client = db.query(Client).filter((Client.client_code == "SYSADMIN") | (Client.client_code == "UBN") | (Client.tenant_id == 1)).first()
    expected_sys_tenant_id = sys_client.tenant_id if sys_client else 1

    # 2. Verify all five development users have client_id == expected_sys_tenant_id (1)
    target_usernames = ["admin", "submitter1", "authorizer1", "controlm", "controlc"]
    for uname in target_usernames:
        u = db.query(User).filter(User.username == uname).first()
        assert u is not None, f"User {uname} should be seeded"
        assert u.client_id == expected_sys_tenant_id, f"User {uname} client_id expected {expected_sys_tenant_id}, got {u.client_id}"

    # 3. Execute seed_data a second time to verify repeated seeding keeps client_id = expected_sys_tenant_id
    seed_data(db)

    for uname in target_usernames:
        u = db.query(User).filter(User.username == uname).first()
        assert u is not None
        assert u.client_id == expected_sys_tenant_id, f"Re-seeded User {uname} client_id expected {expected_sys_tenant_id}, got {u.client_id}"

    db.close()

