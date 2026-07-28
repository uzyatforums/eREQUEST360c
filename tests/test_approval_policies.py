import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.db_models import (
    User,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    MakerCheckerStatus,
    ApprovalPolicy,
)
from src.models import (
    UserInfo,
)
from src.api.auth import AuthService
from src.api.approval_policy_service import ApprovalPolicyService
from src.api.config_orchestrator import ConfigurationOrchestrator
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
    maker_user = User(
        user_id="admin_01",
        username="admin_01",
        client_id=1,
        password_hash="hash",
        role_code="super_admin",
        active=True,
    )
    other_tenant_user = User(
        user_id="admin_tenant2",
        username="admin_tenant2",
        client_id=2,
        password_hash="hash",
        role_code="super_admin",
        active=True,
    )
    db.add_all([maker_user, other_tenant_user])

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
        MakerCheckerEntityType(entity_type_code="APPROVAL_POLICY", entity_type_name="Approval Policy", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="BRANCH", entity_type_name="Branch", created_by="INIT"),
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


def test_missing_policy_defaults_to_true():
    db = TestingSessionLocal()
    # No policy configured for BRANCH / CREATE
    req_val = ApprovalPolicyService.requires_approval(db, client_id=1, entity_type_code="BRANCH", operation_code="CREATE")
    assert req_val is True
    db.close()


def test_approval_policy_entity_type_always_requires_approval():
    db = TestingSessionLocal()
    # Explicitly attempt to insert a policy row setting APPROVAL_POLICY / UPDATE to False
    policy = ApprovalPolicy(
        client_id=1,
        entity_type_code="APPROVAL_POLICY",
        operation_code="UPDATE",
        approval_required=False,
        active=True,
        created_by="INIT",
    )
    db.add(policy)
    db.commit()

    # Rule check must STILL return True regardless of row value
    req_val = ApprovalPolicyService.requires_approval(db, client_id=1, entity_type_code="APPROVAL_POLICY", operation_code="UPDATE")
    assert req_val is True
    db.close()


def test_configured_policy_override_to_false():
    db = TestingSessionLocal()
    # Explicitly set BRANCH / CREATE to False
    policy = ApprovalPolicy(
        client_id=1,
        entity_type_code="BRANCH",
        operation_code="CREATE",
        approval_required=False,
        active=True,
        created_by="INIT",
    )
    db.add(policy)
    db.commit()

    req_val = ApprovalPolicyService.requires_approval(db, client_id=1, entity_type_code="BRANCH", operation_code="CREATE")
    assert req_val is False
    db.close()


def test_tenant_isolation_for_policies():
    db = TestingSessionLocal()
    # Tenant 1 sets BRANCH / CREATE to False
    policy = ApprovalPolicy(
        client_id=1,
        entity_type_code="BRANCH",
        operation_code="CREATE",
        approval_required=False,
        active=True,
        created_by="INIT",
    )
    db.add(policy)
    db.commit()

    # Tenant 1 gets False
    assert ApprovalPolicyService.requires_approval(db, client_id=1, entity_type_code="BRANCH", operation_code="CREATE") is False

    # Tenant 2 gets True (missing policy default fallback)
    assert ApprovalPolicyService.requires_approval(db, client_id=2, entity_type_code="BRANCH", operation_code="CREATE") is True
    db.close()


def test_config_orchestrator_pipeline():
    db = TestingSessionLocal()
    user = UserInfo(user_id="admin_01", username="admin_01", client_id=1, roles=["super_admin"])

    # 1. Test direct commit path (approval_required == False)
    db.add(ApprovalPolicy(client_id=1, entity_type_code="BRANCH", operation_code="CREATE", approval_required=False, active=True, created_by="INIT"))
    db.commit()

    committed_flag = False
    def commit_cb(session, data):
        nonlocal committed_flag
        committed_flag = True

    res = ConfigurationOrchestrator.execute_change(
        db, user, "BRANCH", 501, "CREATE", "New Branch", None, {"name": "Direct Branch"}, commit_cb
    )
    assert res.status == "COMMITTED"
    assert committed_flag is True

    # 2. Test Maker/Checker path (approval_required == True)
    res_pending = ConfigurationOrchestrator.execute_change(
        db, user, "APPROVAL_POLICY", 1, "UPDATE", "Policy Change", None, {"approval_required": False}, None
    )
    assert res_pending.status == "PENDING_APPROVAL"
    assert res_pending.work_item_id is not None
    db.close()


def test_set_approval_policy_endpoint_routes_to_maker_checker():
    headers = get_auth_header("admin_01", client_id=1)
    payload = {
        "entity_type_code": "BRANCH",
        "operation_code": "CREATE",
        "approval_required": False,
    }

    res = client.post("/config/approval-policies", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PENDING_APPROVAL"
    assert data["work_item_id"] is not None


def test_check_approval_endpoint():
    headers = get_auth_header("admin_01", client_id=1)
    res = client.get("/config/approval-policies/check?entity_type_code=BRANCH&operation_code=CREATE", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["entity_type_code"] == "BRANCH"
    assert data["operation_code"] == "CREATE"
    assert data["approval_required"] is True
