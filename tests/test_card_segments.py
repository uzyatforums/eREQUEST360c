import pytest
from fastapi.testclient import TestClient
from src.app import app
from src.db import SessionLocal, init_db
from src.db_models import CardSegment, CardSegmentProgramme, CardProgramme, ApprovalPolicy
from src.api.auth import AuthService

client = TestClient(app)


def get_auth_header(username: str = "super_admin", client_id: int = 1):
    token = AuthService._create_token(
        username=username,
        client_id=client_id,
        effective_branch_code=None,
        roles=["super_admin", "operations_admin_maker", "branch_submitter"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_data():
    init_db()
    db = SessionLocal()
    try:
        # Seed test Card Programmes if missing
        p1 = db.query(CardProgramme).filter(CardProgramme.id == 901).first()
        if not p1:
            db.add(CardProgramme(id=901, client_id=1, card_programme_code="TEST_VERVE_1", card_programme_name="Test Verve 1", card_type="VERVE", active=True, created_by="test"))
        p2 = db.query(CardProgramme).filter(CardProgramme.id == 902).first()
        if not p2:
            db.add(CardProgramme(id=902, client_id=1, card_programme_code="TEST_VERVE_2", card_programme_name="Test Verve 2", card_type="VERVE", active=True, created_by="test"))
        p3 = db.query(CardProgramme).filter(CardProgramme.id == 903).first()
        if not p3:
            db.add(CardProgramme(id=903, client_id=1, card_programme_code="TEST_VISA_1", card_programme_name="Test Visa 1", card_type="VISA", active=True, created_by="test"))
        
        # Disable approval requirement for test operations
        ops = ["CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE", "ASSIGN", "REMOVE", "REORDER"]
        for op in ops:
            for et in ["CARD_SEGMENT", "CARD_SEGMENT_PROGRAMME"]:
                pol = db.query(ApprovalPolicy).filter(ApprovalPolicy.client_id == 1, ApprovalPolicy.entity_type_code == et, ApprovalPolicy.operation_code == op).first()
                if not pol:
                    db.add(ApprovalPolicy(client_id=1, entity_type_code=et, operation_code=op, approval_required=False, active=True, created_by="INIT"))
                else:
                    pol.approval_required = False
        db.commit()
    finally:
        db.close()


def test_create_and_get_card_segment():
    headers = get_auth_header()
    res = client.post(
        "/config/card-segments",
        json={"segment_code": "TS1", "segment_name": "Test Segment One", "priority": 1},
        headers=headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMMITTED"
    seg_id = data["entity_id"]

    res_get = client.get(f"/config/card-segments/{seg_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["segment_code"] == "TS1"


def test_duplicate_segment_code_or_name_rejected():
    headers = get_auth_header()
    # Create segment
    res1 = client.post(
        "/config/card-segments",
        json={"segment_code": "DUP1", "segment_name": "Duplicate Test Name 1", "priority": 2},
        headers=headers,
    )
    assert res1.status_code == 200

    # Attempt duplicate code
    res_dup_code = client.post(
        "/config/card-segments",
        json={"segment_code": "DUP1", "segment_name": "Different Name", "priority": 3},
        headers=headers,
    )
    assert res_dup_code.status_code == 409

    # Attempt duplicate name
    res_dup_name = client.post(
        "/config/card-segments",
        json={"segment_code": "DUP2", "segment_name": "Duplicate Test Name 1", "priority": 3},
        headers=headers,
    )
    assert res_dup_name.status_code == 409


def test_update_and_toggle_card_segment():
    headers = get_auth_header()
    res = client.post(
        "/config/card-segments",
        json={"segment_code": "TOG1", "segment_name": "Toggle Segment Name", "priority": 5},
        headers=headers,
    )
    assert res.status_code == 200
    seg_id = res.json()["entity_id"]

    # Update
    res_upd = client.put(
        f"/config/card-segments/{seg_id}",
        json={"segment_name": "Updated Toggle Segment Name", "priority": 10},
        headers=headers,
    )
    assert res_upd.status_code == 200

    # Deactivate
    res_deact = client.post(f"/config/card-segments/{seg_id}/deactivate", headers=headers)
    assert res_deact.status_code == 200

    # Activate
    res_act = client.post(f"/config/card-segments/{seg_id}/activate", headers=headers)
    assert res_act.status_code == 200


def test_programme_assignment_and_reorder_and_unassign():
    headers = get_auth_header()
    # 1. Create segment
    res_seg = client.post(
        "/config/card-segments",
        json={"segment_code": "PAS1", "segment_name": "Programme Assign Segment", "priority": 1},
        headers=headers,
    )
    assert res_seg.status_code == 200
    seg_id = res_seg.json()["entity_id"]

    # 2. Assign Programme 901 (Verve 1)
    res_a1 = client.post(
        f"/config/card-segments/{seg_id}/programmes",
        json={"card_programme_id": 901},
        headers=headers,
    )
    assert res_a1.status_code == 200

    # 3. Assign Programme 902 (Verve 2)
    res_a2 = client.post(
        f"/config/card-segments/{seg_id}/programmes",
        json={"card_programme_id": 902},
        headers=headers,
    )
    assert res_a2.status_code == 200

    # Attempt duplicate assignment (901 again) -> 409 Conflict
    res_dup = client.post(
        f"/config/card-segments/{seg_id}/programmes",
        json={"card_programme_id": 901},
        headers=headers,
    )
    assert res_dup.status_code == 409

    # List assigned programmes
    res_list = client.get(f"/config/card-segments/{seg_id}/programmes", headers=headers)
    assert res_list.status_code == 200
    progs = res_list.json()
    assert len(progs) >= 2
    
    p901 = next(p for p in progs if p["card_programme_id"] == 901)
    p902 = next(p for p in progs if p["card_programme_id"] == 902)
    assert p901["priority"] == 1
    assert p902["priority"] == 2

    # Reorder (Move 902 UP to priority 1)
    res_reorder = client.post(
        f"/config/card-segments/{seg_id}/programmes/reorder",
        json={"card_programme_id": 902, "direction": "UP"},
        headers=headers,
    )
    assert res_reorder.status_code == 200

    # Verify reordered priority
    res_list2 = client.get(f"/config/card-segments/{seg_id}/programmes", headers=headers)
    progs2 = res_list2.json()
    p901_2 = next(p for p in progs2 if p["card_programme_id"] == 901)
    p902_2 = next(p for p in progs2 if p["card_programme_id"] == 902)
    assert p902_2["priority"] == 1
    assert p901_2["priority"] == 2

    # Remove Programme 902 (DELETE)
    res_del = client.delete(f"/config/card-segments/{seg_id}/programmes/902", headers=headers)
    assert res_del.status_code == 200

    # Verify remaining programme re-sequenced
    res_list3 = client.get(f"/config/card-segments/{seg_id}/programmes", headers=headers)
    progs3 = res_list3.json()
    p901_3 = next(p for p in progs3 if p["card_programme_id"] == 901)
    assert p901_3["priority"] == 1
