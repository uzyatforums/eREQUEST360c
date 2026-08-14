import json
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.app import app
from src.db import Base, get_db
from src.seed import seed_data
from tests.conftest import test_engine, TestingSessionLocal
from src.db_models import (
    CardSegment,
    CardProgramme,
    CardSegmentProgramme,
    CardChargesHeader,
    CardChargeEntry,
    CardSegmentProgrammeCharge,
    MakerCheckerWorkItem,
)
from src.api.auth import AuthService


def get_auth_header(username: str = "super_admin", client_id: int = 1, is_checker: bool = False):
    roles = ["super_admin", "operations_admin_checker"] if is_checker else ["super_admin", "operations_admin_maker", "branch_submitter"]
    token = AuthService._create_token(
        username=username,
        client_id=client_id,
        effective_branch_code=None,
        roles=roles,
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    return {"Authorization": f"Bearer {token}"}


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
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_data(db)
    db.close()


def seed_test_dependencies(db: Session, client_id: int = 1):
    # Create segment
    segment = CardSegment(
        client_id=client_id,
        segment_code=f"SEG_{client_id}",
        segment_name=f"Test Segment {client_id}",
        active=True,
        created_by="test_setup",
    )
    db.add(segment)

    # Create programme
    programme = CardProgramme(
        client_id=client_id,
        card_programme_code=f"PROG_{client_id}",
        card_programme_name=f"Test Programme {client_id}",
        card_type="Verve",
        active=True,
        created_by="test_setup",
    )
    db.add(programme)
    db.flush()

    # Create Segment Programme mapping
    csp = CardSegmentProgramme(
        client_id=client_id,
        segment_id=segment.id,
        card_programme_id=programme.id,
        priority=1,
        active=True,
        created_by="test_setup",
    )
    db.add(csp)

    # Create Charge Header
    header = CardChargesHeader(
        client_id=client_id,
        charge_name=f"Standard Charge Header {client_id}",
        description="Test fee structure",
        active=True,
        created_by="test_setup",
    )
    db.add(header)
    db.flush()

    # Create Charge Entries
    e1 = CardChargeEntry(
        client_id=client_id,
        charge_header_id=header.id,
        sequence_no=1,
        posting_account_type="GL",
        dr_cr="D",
        narration="Card Issuance Fee",
        posting_entry_type="CISSUANCE",
        amount=1000.00,
        currency_code="NGN",
        active=True,
        created_by="test_setup",
    )
    e2 = CardChargeEntry(
        client_id=client_id,
        charge_header_id=header.id,
        sequence_no=2,
        posting_account_type="GL",
        dr_cr="C",
        narration="Card Issuance Revenue",
        posting_entry_type="GINC",
        amount=1000.00,
        currency_code="NGN",
        active=True,
        created_by="test_setup",
    )
    db.add_all([e1, e2])
    db.commit()

    return csp.id, header.id


def test_list_card_segment_programme_charges():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)

    # Seed initial charge mapping
    spc = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="NORMAL",
        priority=1,
        active=True,
        created_by="test_setup",
    )
    db.add(spc)
    db.commit()
    mapping_id = spc.id
    db.close()

    headers = get_auth_header("controlm", client_id=1)
    res = client.get("/config/card-segment-programme-charges?status_filter=active", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert data["total"] >= 1
    found = any(item["id"] == mapping_id for item in data["items"])
    assert found


def test_get_card_segment_programme_charge_detail():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)

    spc = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="NORMAL",
        priority=2,
        active=True,
        created_by="test_setup",
    )
    db.add(spc)
    db.commit()
    spc_id = spc.id
    db.close()

    headers = get_auth_header("controlm", client_id=1)
    res = client.get(f"/config/card-segment-programme-charges/{spc_id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == spc_id
    assert detail["processing_mode_code"] == "NORMAL"
    assert len(detail["entries"]) == 2


def test_create_and_approve_card_segment_programme_charge():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)
    db.close()

    maker_headers = get_auth_header("controlm", client_id=1, is_checker=False)
    checker_headers = get_auth_header("controlc", client_id=1, is_checker=True)

    # 1. Maker submits creation
    payload = {
        "card_segment_programme_id": csp_id,
        "charge_header_id": header_id,
        "processing_mode_code": "RENEWAL",
        "priority": 5,
    }
    res_submit = client.post("/config/card-segment-programme-charges", json=payload, headers=maker_headers)
    assert res_submit.status_code == 200
    sub_data = res_submit.json()
    assert sub_data["status"] == "PENDING_APPROVAL"
    work_item_id = sub_data["work_item_id"]

    # 2. Checker approves work item
    res_approve = client.post(f"/maker-checker/{work_item_id}/approve", json={"remarks": "Approved"}, headers=checker_headers)
    assert res_approve.status_code == 200
    assert res_approve.json()["status_code"] == "APPROVED"

    # 3. Verify record in DB
    db_verify = TestingSessionLocal()
    created_item = (
        db_verify.query(CardSegmentProgrammeCharge)
        .filter(
            CardSegmentProgrammeCharge.client_id == 1,
            CardSegmentProgrammeCharge.card_segment_programme_id == csp_id,
            CardSegmentProgrammeCharge.processing_mode_code == "RENEWAL",
        )
        .first()
    )
    assert created_item is not None
    assert created_item.charge_header_id == header_id
    assert created_item.priority == 5
    db_verify.close()


def test_duplicate_charge_mapping_rejected():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)

    spc = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="NORMAL",
        priority=1,
        active=True,
        created_by="test_setup",
    )
    db.add(spc)
    db.commit()
    db.close()

    headers = get_auth_header("controlm", client_id=1)
    payload = {
        "card_segment_programme_id": csp_id,
        "charge_header_id": header_id,
        "processing_mode_code": "NORMAL",
        "priority": 2,
    }
    res = client.post("/config/card-segment-programme-charges", json=payload, headers=headers)
    assert res.status_code == 409
    assert "already exists" in res.json()["detail"]


def test_inactive_parent_charge_header_rejected():
    db = TestingSessionLocal()
    csp_id, _ = seed_test_dependencies(db, client_id=1)

    # Inactive Charge Header
    inactive_header = CardChargesHeader(
        client_id=1,
        charge_name="Disabled Charges Header",
        active=False,
        created_by="test_setup",
    )
    db.add(inactive_header)
    db.commit()
    h_id = inactive_header.id
    db.close()

    headers = get_auth_header("controlm", client_id=1)
    payload = {
        "card_segment_programme_id": csp_id,
        "charge_header_id": h_id,
        "processing_mode_code": "RENEWAL",
        "priority": 1,
    }
    res = client.post("/config/card-segment-programme-charges", json=payload, headers=headers)
    assert res.status_code == 400
    assert "inactive" in res.json()["detail"].lower()


def test_tenant_isolation_prevents_cross_tenant_linkage():
    db = TestingSessionLocal()
    csp_t1, _ = seed_test_dependencies(db, client_id=1)
    _, header_t2 = seed_test_dependencies(db, client_id=2)
    db.close()

    headers_t1 = get_auth_header("controlm", client_id=1)
    payload = {
        "card_segment_programme_id": csp_t1,
        "charge_header_id": header_t2,
        "processing_mode_code": "RENEWAL",
        "priority": 1,
    }
    res = client.post("/config/card-segment-programme-charges", json=payload, headers=headers_t1)
    assert res.status_code == 404
    assert "not found for this tenant" in res.json()["detail"].lower()


def test_lookups_endpoints():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)
    db.close()

    headers = get_auth_header("controlm", client_id=1)

    res_sp = client.get("/config/card-segment-programme-charges/segment-programmes/lookup", headers=headers)
    assert res_sp.status_code == 200
    assert len(res_sp.json()) >= 1

    res_ch = client.get("/config/card-segment-programme-charges/charge-headers/lookup", headers=headers)
    assert res_ch.status_code == 200
    assert len(res_ch.json()) >= 1

    res_pm = client.get("/config/card-segment-programme-charges/processing-modes/lookup", headers=headers)
    assert res_pm.status_code == 200
    assert len(res_pm.json()) >= 5


def test_invalid_and_inactive_processing_modes_rejected():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)

    from src.db_models import ProcessingMode
    inactive_pm = ProcessingMode(
        processing_mode_code="INACTIVE_MODE",
        processing_mode_name="Inactive Mode",
        display_order=99,
        active=False,
        created_by="test_setup",
    )
    db.add(inactive_pm)
    db.commit()
    db.close()

    headers = get_auth_header("controlm", client_id=1)

    # Invalid mode
    res_inv = client.post(
        "/config/card-segment-programme-charges",
        json={
            "card_segment_programme_id": csp_id,
            "charge_header_id": header_id,
            "processing_mode_code": "NONEXISTENT_MODE",
            "priority": 1,
        },
        headers=headers,
    )
    assert res_inv.status_code == 400
    assert "Invalid or inactive processing mode" in res_inv.json()["detail"]

    # Inactive mode
    res_inact = client.post(
        "/config/card-segment-programme-charges",
        json={
            "card_segment_programme_id": csp_id,
            "charge_header_id": header_id,
            "processing_mode_code": "INACTIVE_MODE",
            "priority": 1,
        },
        headers=headers,
    )
    assert res_inact.status_code == 400
    assert "Invalid or inactive processing mode" in res_inact.json()["detail"]


def test_audit_event_codes_fit_physical_constraint():
    from src.api.entity_executors.card_segment_programme_charge_executor import CardSegmentProgrammeChargeExecutor
    codes = [
        "CARD_SEG_PROG_CHG_CREATED",
        "CARD_SEG_PROG_CHG_UPDATED",
        "CARD_SEG_PROG_CHG_ACTIVATED",
        "CARD_SEG_PROG_CHG_DEACTIVATED",
    ]
    for code in codes:
        assert len(code) <= 30, f"Audit event code {code} exceeds 30 characters limit!"
    assert len(set(codes)) == len(codes), "Audit event codes must be unique!"


def test_maker_self_approval_rejected():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)
    db.close()

    maker_headers = get_auth_header("controlm", client_id=1, is_checker=False)

    payload = {
        "card_segment_programme_id": csp_id,
        "charge_header_id": header_id,
        "processing_mode_code": "NYSC",
        "priority": 1,
    }
    res_sub = client.post("/config/card-segment-programme-charges", json=payload, headers=maker_headers)
    assert res_sub.status_code == 200
    wi_id = res_sub.json()["work_item_id"]

    # Self-approval attempt by same maker
    res_app = client.post(f"/maker-checker/{wi_id}/approve", json={"remarks": "Self approve"}, headers=maker_headers)
    assert res_app.status_code == 409
    assert "Maker cannot approve their own work item" in res_app.json()["detail"]


def test_list_card_segment_programme_charges_with_filters():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)
    csp = db.query(CardSegmentProgramme).get(csp_id)
    seg_id = csp.segment_id
    prog_id = csp.card_programme_id

    spc = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="NORMAL",
        priority=1,
        active=True,
        created_by="test_setup",
    )
    db.add(spc)
    db.commit()
    mapping_id = spc.id
    db.close()

    headers = get_auth_header("controlm", client_id=1)

    # 1. Filter by segment_id
    res1 = client.get(f"/config/card-segment-programme-charges?segment_id={seg_id}", headers=headers)
    assert res1.status_code == 200
    assert any(item["id"] == mapping_id for item in res1.json()["items"])

    # 2. Filter by card_programme_id
    res2 = client.get(f"/config/card-segment-programme-charges?card_programme_id={prog_id}", headers=headers)
    assert res2.status_code == 200
    assert any(item["id"] == mapping_id for item in res2.json()["items"])

    # 3. Filter by non-existent IDs -> empty list
    res3 = client.get(f"/config/card-segment-programme-charges?segment_id=99999", headers=headers)
    assert res3.status_code == 200
    assert res3.json()["total"] == 0


def test_list_card_segment_programme_charges_sorting():
    db = TestingSessionLocal()
    csp_id, header_id = seed_test_dependencies(db, client_id=1)

    spc1 = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="NORMAL",
        priority=10,
        active=True,
        created_by="test_setup",
    )
    spc2 = CardSegmentProgrammeCharge(
        client_id=1,
        card_segment_programme_id=csp_id,
        charge_header_id=header_id,
        processing_mode_code="INSTANT",
        priority=2,
        active=True,
        created_by="test_setup",
    )
    db.add_all([spc1, spc2])
    db.commit()
    db.close()

    headers = get_auth_header("controlm", client_id=1)

    # Sort priority asc
    res_asc = client.get("/config/card-segment-programme-charges?sort_by=priority&sort_dir=asc", headers=headers)
    assert res_asc.status_code == 200
    items_asc = res_asc.json()["items"]
    priorities_asc = [i["priority"] for i in items_asc]
    assert priorities_asc == sorted(priorities_asc)

    # Sort priority desc
    res_desc = client.get("/config/card-segment-programme-charges?sort_by=priority&sort_dir=desc", headers=headers)
    assert res_desc.status_code == 200
    items_desc = res_desc.json()["items"]
    priorities_desc = [i["priority"] for i in items_desc]
    assert priorities_desc == sorted(priorities_desc, reverse=True)

