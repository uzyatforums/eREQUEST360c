import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.app import app
from src.db import Base, get_db
from src.db_models import (
    CardSegment,
    User,
    Role,
    RolePermission,
    ApprovalPolicy,
    MakerCheckerStatus,
    MakerCheckerOperation,
    MakerCheckerEntityType,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
    MakerCheckerWorkItemAction,
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
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Clear work items & card segments
    db.query(MakerCheckerWorkItemAction).delete()
    db.query(MakerCheckerWorkItemPayload).delete()
    db.query(MakerCheckerWorkItem).delete()
    db.query(CardSegment).delete()
    db.commit()

    # Seed roles & users & role_permissions
    db.merge(Role(role_code="control_maker", role_name="Control Maker", is_maker=True, is_checker=False, role_scope="HEAD_OFFICE", active=True))
    db.merge(Role(role_code="control_checker", role_name="Control Checker", is_maker=False, is_checker=True, role_scope="HEAD_OFFICE", active=True))
    db.merge(User(user_id="controlm", username="controlm", client_id=1, branch_id="001", role_code="control_maker", password_hash=hash_password("password123"), active=True))
    db.merge(User(user_id="controlc", username="controlc", client_id=1, branch_id="001", role_code="control_checker", password_hash=hash_password("password123"), active=True))
    db.merge(User(user_id="controlm_t2", username="controlm_t2", client_id=2, branch_id="001", role_code="control_maker", password_hash=hash_password("password123"), active=True))
    db.merge(RolePermission(role_code="control_maker", permission_code="config.manage", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_maker", permission_code="config.view", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_checker", permission_code="config.view", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="control_checker", permission_code="request.approve", active=True, created_by="INIT"))

    # Lookup tables
    for s_code in ["PENDING", "APPROVED", "REJECTED", "CANCELLED"]:
        db.merge(MakerCheckerStatus(status_code=s_code, status_name=s_code, created_by="INIT"))
    for op_code in ["CREATE", "UPDATE", "ACTIVATE", "DEACTIVATE", "APPROVE", "REJECT", "CANCEL"]:
        db.merge(MakerCheckerOperation(operation_code=op_code, operation_name=op_code, created_by="INIT"))
    db.merge(MakerCheckerEntityType(entity_type_code="CARD_SEGMENT", entity_type_name="Card Segment", created_by="INIT"))

    # Approval policies for client_id 1 and client_id 2 (require approval)
    for cid in [1, 2]:
        for op in ["ACTIVATE", "DEACTIVATE", "UPDATE"]:
            pol = db.query(ApprovalPolicy).filter(ApprovalPolicy.client_id == cid, ApprovalPolicy.entity_type_code == "CARD_SEGMENT", ApprovalPolicy.operation_code == op).first()
            if pol:
                pol.approval_required = True
            else:
                db.add(ApprovalPolicy(client_id=cid, entity_type_code="CARD_SEGMENT", operation_code=op, approval_required=True, active=True, created_by="INIT"))

    # Seed test Card Segments for client_id 1 and client_id 2
    db.merge(CardSegment(id=101, client_id=1, segment_code="SEG101", segment_name="Segment 101", priority=1, active=True, created_by="INIT"))
    db.merge(CardSegment(id=102, client_id=1, segment_code="SEG102", segment_name="Segment 102", priority=2, active=True, created_by="INIT"))
    db.merge(CardSegment(id=103, client_id=2, segment_code="SEG101_T2", segment_name="Segment 101 Tenant 2", priority=1, active=True, created_by="INIT"))

    db.commit()
    db.close()
    yield


def test_duplicate_deactivate_while_pending_rejected():
    headers = get_auth_header("controlm", client_id=1)
    
    # 1. First DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=headers)
    assert res1.status_code == 200
    assert res1.json()["status"] == "PENDING_APPROVAL"
    wi_id = res1.json()["work_item_id"]

    # Verify GET Card Segment exposes has_pending_change, pending_work_item_id, and pending_work_item_number
    res_seg = client.get("/config/card-segments/101", headers=headers)
    assert res_seg.status_code == 200
    assert res_seg.json()["has_pending_change"] is True
    assert res_seg.json()["pending_work_item_id"] == wi_id
    assert res_seg.json()["pending_work_item_number"] == f"MC-{wi_id:08d}"

    # 2. Duplicate DEACTIVATE -> 409 Conflict
    res2 = client.post("/config/card-segments/101/deactivate", headers=headers)
    assert res2.status_code == 409
    assert "pending configuration change already exists" in res2.json()["detail"]


def test_activate_while_deactivate_pending_rejected():
    headers = get_auth_header("controlm", client_id=1)

    # 1. First DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=headers)
    assert res1.status_code == 200

    # 2. Conflicting ACTIVATE -> 409 Conflict
    res2 = client.post("/config/card-segments/101/activate", headers=headers)
    assert res2.status_code == 409
    assert "pending configuration change already exists" in res2.json()["detail"]


def test_duplicate_activate_while_pending_rejected():
    headers = get_auth_header("controlm", client_id=1)

    # Set segment inactive first directly in DB
    db = TestingSessionLocal()
    seg = db.query(CardSegment).filter_by(id=101, client_id=1).first()
    seg.active = False
    db.commit()
    db.close()

    # 1. First ACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/activate", headers=headers)
    assert res1.status_code == 200

    # 2. Duplicate ACTIVATE -> 409 Conflict
    res2 = client.post("/config/card-segments/101/activate", headers=headers)
    assert res2.status_code == 409
    assert "pending configuration change already exists" in res2.json()["detail"]


def test_entity_released_after_approved():
    maker_headers = get_auth_header("controlm", client_id=1)
    checker_headers = get_auth_header("controlc", client_id=1)

    # 1. Submit DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=maker_headers)
    work_item_id = res1.json()["work_item_id"]

    # 2. Checker approves work item
    app_res = client.post(f"/maker-checker/{work_item_id}/approve", headers=checker_headers)
    assert app_res.status_code == 200
    assert app_res.json()["status_code"] == "APPROVED"

    # 3. Submit new ACTIVATE -> Succeeded!
    res2 = client.post("/config/card-segments/101/activate", headers=maker_headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "PENDING_APPROVAL"


def test_entity_released_after_rejected():
    maker_headers = get_auth_header("controlm", client_id=1)
    checker_headers = get_auth_header("controlc", client_id=1)

    # 1. Submit DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=maker_headers)
    work_item_id = res1.json()["work_item_id"]

    # 2. Checker rejects work item
    rej_res = client.post(f"/maker-checker/{work_item_id}/reject", json={"remarks": "Rejected by checker"}, headers=checker_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["status_code"] == "REJECTED"

    # 3. Submit new DEACTIVATE -> Succeeded!
    res2 = client.post("/config/card-segments/101/deactivate", headers=maker_headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "PENDING_APPROVAL"


def test_entity_released_after_cancelled():
    maker_headers = get_auth_header("controlm", client_id=1)

    # 1. Submit DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=maker_headers)
    work_item_id = res1.json()["work_item_id"]

    # 2. Maker cancels work item
    can_res = client.post(f"/maker-checker/{work_item_id}/cancel", json={"remarks": "Cancelled by maker"}, headers=maker_headers)
    assert can_res.status_code == 200
    assert can_res.json()["status_code"] == "CANCELLED"

    # 3. Submit new DEACTIVATE -> Succeeded!
    res2 = client.post("/config/card-segments/101/deactivate", headers=maker_headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "PENDING_APPROVAL"


def test_independent_entities_can_have_pending_changes():
    headers = get_auth_header("controlm", client_id=1)

    # 1. Entity #101 DEACTIVATE -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=headers)
    assert res1.status_code == 200

    # 2. Entity #102 DEACTIVATE -> PENDING_APPROVAL (Succeeded!)
    res2 = client.post("/config/card-segments/102/deactivate", headers=headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "PENDING_APPROVAL"


def test_multitenant_pending_isolation():
    m1_headers = get_auth_header("controlm", client_id=1)
    m2_headers = get_auth_header("controlm_t2", client_id=2)

    # 1. Tenant 1 submits DEACTIVATE for entity #101 -> PENDING_APPROVAL
    res1 = client.post("/config/card-segments/101/deactivate", headers=m1_headers)
    assert res1.status_code == 200

    # 2. Tenant 2 submits DEACTIVATE for entity #103 -> PENDING_APPROVAL (Succeeded!)
    res2 = client.post("/config/card-segments/103/deactivate", headers=m2_headers)
    assert res2.status_code == 200
    assert res2.json()["status"] == "PENDING_APPROVAL"

    # Clean up work items so entity 101 is clear for subsequent tests
    db = TestingSessionLocal()
    db.query(MakerCheckerWorkItemPayload).delete()
    db.query(MakerCheckerWorkItem).delete()
    db.commit()
    db.close()


def test_concurrent_submissions_prevent_duplicate_pending_items():
    import concurrent.futures
    headers = get_auth_header("controlm", client_id=1)

    def submit_deactivate():
        return client.post("/config/card-segments/101/deactivate", headers=headers)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(submit_deactivate) for _ in range(10)]
        results = [f.result() for f in concurrent.futures.as_completed(futures)]

    status_codes = [r.status_code for r in results]
    success_count = status_codes.count(200)
    conflict_count = status_codes.count(409)

    # Invariant: At least 1 succeeds, remaining fail with 409 Conflict, total is 10
    assert success_count >= 1
    assert success_count + conflict_count == 10

    # Invariant: Database has strictly at most/exactly ONE PENDING work item for (client_id, entity_type_code, entity_id)
    db = TestingSessionLocal()
    pending_items = (
        db.query(MakerCheckerWorkItem)
        .filter_by(client_id=1, entity_type_code="CARD_SEGMENT", entity_id=101, status_code="PENDING")
        .all()
    )
    assert len(pending_items) == 1
    db.close()
