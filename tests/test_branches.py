import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.db_models import (
    User,
    Branch,
    State,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    MakerCheckerStatus,
    ApprovalPolicy,
)
from src.models import UserInfo
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

    # Seed Users
    admin_user = User(
        user_id="admin_01",
        username="admin_01",
        client_id=1,
        password_hash="hash",
        role_code="super_admin",
        active=True,
    )
    tenant2_user = User(
        user_id="admin_tenant2",
        username="admin_tenant2",
        client_id=2,
        password_hash="hash",
        role_code="super_admin",
        active=True,
    )
    db.add_all([admin_user, tenant2_user])

    # Seed States
    state_la = State(state_code="LA", state_name="Lagos", active=True, created_by="INIT")
    state_ab = State(state_code="AB", state_name="Abuja", active=True, created_by="INIT")
    db.add_all([state_la, state_ab])

    # Seed MakerChecker lookups
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
    ]
    entity_types = [
        MakerCheckerEntityType(entity_type_code="BRANCH", entity_type_name="Branch", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="APPROVAL_POLICY", entity_type_name="Approval Policy", created_by="INIT"),
    ]
    db.add_all(statuses + operations + entity_types)
    db.commit()

    yield

    db.close()
    Base.metadata.drop_all(bind=test_engine)


def get_auth_header(username: str, client_id: int = 1, roles: list = None):
    if roles is None:
        roles = ["super_admin"]
    token = AuthService._create_token(username, client_id, "BR001", roles)
    return {"Authorization": f"Bearer {token}"}


def test_create_branch_direct_commit():
    db = TestingSessionLocal()
    headers = get_auth_header("admin_01", client_id=1)

    # Set approval_required = False for BRANCH CREATE
    db.add(ApprovalPolicy(client_id=1, entity_type_code="BRANCH", operation_code="CREATE", approval_required=False, active=True, created_by="INIT"))
    db.commit()
    db.close()

    payload = {
        "branch_code": "BR001",
        "branch_name": "Lagos Island Branch",
        "state_code": "LA",
    }
    res = client.post("/config/branches", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMMITTED"

    # Verify branch is persisted in DB
    get_res = client.get("/config/branches/BR001", headers=headers)
    assert get_res.status_code == 200
    b_data = get_res.json()
    assert b_data["branch_name"] == "Lagos Island Branch"
    assert b_data["state_code"] == "LA"


def test_create_branch_maker_checker_approval():
    headers = get_auth_header("admin_01", client_id=1)
    # Default policy when unconfigured evaluates requires_approval == True
    payload = {
        "branch_code": "BR002",
        "branch_name": "Ikeja Branch",
        "state_code": "LA",
    }
    res = client.post("/config/branches", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PENDING_APPROVAL"
    assert data["work_item_id"] is not None


def test_create_branch_duplicate_code_fails():
    db = TestingSessionLocal()
    headers = get_auth_header("admin_01", client_id=1)
    db.add(Branch(branch_code="BR003", branch_name="Victoria Island", client_id=1, active=True, created_by="INIT"))
    db.commit()
    db.close()

    payload = {
        "branch_code": "BR003",
        "branch_name": "Duplicate VI Branch",
        "state_code": "LA",
    }
    res = client.post("/config/branches", json=payload, headers=headers)
    assert res.status_code == 400
    assert "already exists" in res.json()["detail"]


def test_create_branch_invalid_state_code_fails():
    headers = get_auth_header("admin_01", client_id=1)
    payload = {
        "branch_code": "BR004",
        "branch_name": "Kano Branch",
        "state_code": "XX",
    }
    res = client.post("/config/branches", json=payload, headers=headers)
    assert res.status_code == 400
    assert "Invalid or inactive state_code" in res.json()["detail"]


def test_update_branch_direct_commit():
    db = TestingSessionLocal()
    headers = get_auth_header("admin_01", client_id=1)

    db.add(Branch(branch_code="BR005", branch_name="Old Branch Name", client_id=1, active=True, created_by="INIT"))
    db.add(ApprovalPolicy(client_id=1, entity_type_code="BRANCH", operation_code="UPDATE", approval_required=False, active=True, created_by="INIT"))
    db.commit()
    db.close()

    update_payload = {
        "branch_name": "New Branch Name",
        "state_code": "AB",
    }
    res = client.put("/config/branches/BR005", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "COMMITTED"

    get_res = client.get("/config/branches/BR005", headers=headers)
    assert get_res.json()["branch_name"] == "New Branch Name"
    assert get_res.json()["state_code"] == "AB"


def test_soft_delete_branch_direct_commit():
    db = TestingSessionLocal()
    headers = get_auth_header("admin_01", client_id=1)

    db.add(Branch(branch_code="BR006", branch_name="To Be Deleted", client_id=1, active=True, created_by="INIT"))
    db.add(ApprovalPolicy(client_id=1, entity_type_code="BRANCH", operation_code="DELETE", approval_required=False, active=True, created_by="INIT"))
    db.commit()
    db.close()

    del_res = client.delete("/config/branches/BR006", headers=headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "COMMITTED"

    # Verify branch active flag is False
    get_res = client.get("/config/branches/BR006", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["active"] is False



def test_tenant_isolation_branches():
    db = TestingSessionLocal()
    tenant1_headers = get_auth_header("admin_01", client_id=1)
    tenant2_headers = get_auth_header("admin_tenant2", client_id=2)

    db.add(Branch(branch_code="BR007", branch_name="Tenant 1 Branch", client_id=1, active=True, created_by="INIT"))
    db.commit()
    db.close()

    # Tenant 2 attempts to get Tenant 1 branch -> 404 Not Found
    res = client.get("/config/branches/BR007", headers=tenant2_headers)
    assert res.status_code == 404
