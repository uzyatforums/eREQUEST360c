"""
Tests for Card Programmes Master Governance, Authorization, Maker/Checker, Pending Protection, and SoD.
"""

import os
import sys
sys.path.insert(0, os.path.abspath("."))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.app import app
from src.db import SessionLocal, init_db
from src.db_models import (
    CardProgramme,
    User,
    Role,
    Permission,
    RolePermission,
    MakerCheckerWorkItem,
    MakerCheckerWorkItemPayload,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    ApprovalPolicy,
    CardType,
)
from src.api.auth import AuthService
from src.api.maker_checker_constants import WorkItemStatus

client = TestClient(app)


def get_auth_header(username: str, client_id: int = 1) -> dict:
    if username == "submitter1":
        roles = ["branch_submitter"]
    elif username == "controlm":
        roles = ["control_maker"]
    elif username == "controlc":
        roles = ["control_checker"]
    else:
        roles = ["control_maker"]

    token = AuthService._create_token(
        username=username,
        user_id=username,
        client_id=client_id,
        effective_branch_code=None if username in ["controlm", "controlc", "admin"] else "001",
        roles=roles,
        role_scope="HEAD_OFFICE" if username in ["controlm", "controlc", "admin"] else "BRANCH",
        is_head_office_user=True if username in ["controlm", "controlc", "admin"] else False,
    )
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_governance_db():
    """Seed users, roles, permissions, entity types, and initial data for governance tests."""
    init_db()
    db_session = SessionLocal()
    try:
        # Ensure CardType exists
        if not db_session.query(CardType).filter(CardType.card_type == "VERVE").first():
            db_session.add(CardType(card_type="VERVE", description="Verve Card Scheme", client_id=1))
        if not db_session.query(CardType).filter(CardType.card_type == "VISA").first():
            db_session.add(CardType(card_type="VISA", description="Visa Card Scheme", client_id=1))

        # Entity types & operations
        mc_entities = [
            {"entity_type_code": "CARD_PROGRAMME", "entity_type_name": "Card Programme", "created_by": "system"},
            {"entity_type_code": "CARD_SEGMENT", "entity_type_name": "Card Segment", "created_by": "system"},
        ]
        for me in mc_entities:
            if not db_session.query(MakerCheckerEntityType).filter(MakerCheckerEntityType.entity_type_code == me["entity_type_code"]).first():
                db_session.add(MakerCheckerEntityType(**me))

        mc_operations = [
            {"operation_code": "CREATE", "operation_name": "Create Record", "created_by": "system"},
            {"operation_code": "UPDATE", "operation_name": "Update Record", "created_by": "system"},
            {"operation_code": "ACTIVATE", "operation_name": "Activate Record", "created_by": "system"},
            {"operation_code": "DEACTIVATE", "operation_name": "Deactivate Record", "created_by": "system"},
        ]
        for mo in mc_operations:
            if not db_session.query(MakerCheckerOperation).filter(MakerCheckerOperation.operation_code == mo["operation_code"]).first():
                db_session.add(MakerCheckerOperation(**mo))

        # Permissions
        p_view = db_session.query(Permission).filter(Permission.permission_code == "config.view").first()
        if not p_view:
            p_view = Permission(permission_code="config.view", permission_name="View Config")
            db_session.add(p_view)

        p_manage = db_session.query(Permission).filter(Permission.permission_code == "config.manage").first()
        if not p_manage:
            p_manage = Permission(permission_code="config.manage", permission_name="Manage Config")
            db_session.add(p_manage)

        p_approve = db_session.query(Permission).filter(Permission.permission_code == "request.approve").first()
        if not p_approve:
            p_approve = Permission(permission_code="request.approve", permission_name="Approve Work Items")
            db_session.add(p_approve)

        # Roles
        r_sub = db_session.query(Role).filter(Role.role_code == "branch_submitter").first()
        if not r_sub:
            r_sub = Role(role_code="branch_submitter", role_name="Branch Submitter")
            db_session.add(r_sub)

        r_maker = db_session.query(Role).filter(Role.role_code == "control_maker").first()
        if not r_maker:
            r_maker = Role(role_code="control_maker", role_name="Control Maker")
            db_session.add(r_maker)

        r_checker = db_session.query(Role).filter(Role.role_code == "control_checker").first()
        if not r_checker:
            r_checker = Role(role_code="control_checker", role_name="Control Checker")
            db_session.add(r_checker)

        db_session.flush()

        # Role Permissions
        rps = [
            ("branch_submitter", "config.view"),
            ("control_maker", "config.view"),
            ("control_maker", "config.manage"),
            ("control_checker", "config.view"),
            ("control_checker", "request.approve"),
        ]
        for role_code, perm_code in rps:
            if not db_session.query(RolePermission).filter(RolePermission.role_code == role_code, RolePermission.permission_code == perm_code).first():
                db_session.add(RolePermission(role_code=role_code, permission_code=perm_code, created_by="system"))

        # Initial Card Programme
        prog1 = db_session.query(CardProgramme).filter(CardProgramme.card_programme_code == "GOV_PROG_01").first()
        if not prog1:
            prog1 = CardProgramme(
                client_id=1,
                card_programme_code="GOV_PROG_01",
                card_programme_name="Governance Test Programme 01",
                card_type="VERVE",
                active=True,
                priority=1,
                created_by="system",
            )
            db_session.add(prog1)

        prog2_tenant2 = db_session.query(CardProgramme).filter(CardProgramme.card_programme_code == "TENANT2_PROG").first()
        if not prog2_tenant2:
            prog2_tenant2 = CardProgramme(
                client_id=2,
                card_programme_code="TENANT2_PROG",
                card_programme_name="Tenant 2 Test Programme",
                card_type="VISA",
                active=True,
                priority=1,
                created_by="system",
            )
            db_session.add(prog2_tenant2)

        db_session.commit()

        # Clean up leftover work items & restore initial active status
        for payload in db_session.query(MakerCheckerWorkItemPayload).all():
            db_session.delete(payload)
        for wi in db_session.query(MakerCheckerWorkItem).all():
            db_session.delete(wi)
        if prog1:
            prog1.active = True
        db_session.commit()
        db_session.refresh(prog1)
        return prog1
    finally:
        db_session.close()


def test_unauthorized_user_can_view_but_cannot_mutate(setup_governance_db):
    """submitter1 has config.view, so list/get works, but mutations return 403."""
    prog = setup_governance_db
    headers = get_auth_header("submitter1")

    # GET list -> 200 OK
    res = client.get("/config/card-programmes", headers=headers)
    assert res.status_code == 200
    assert any(p["card_programme_code"] == "GOV_PROG_01" for p in res.json())

    # GET single -> 200 OK
    res = client.get(f"/config/card-programmes/{prog.id}", headers=headers)
    assert res.status_code == 200

    # POST create -> 403 Forbidden
    res = client.post("/config/card-programmes", headers=headers, json={
        "card_programme_code": "UNAUTH_CREATE",
        "card_programme_name": "Unauthorized Create",
        "card_type": "VERVE",
    })
    assert res.status_code == 403

    # PUT update -> 403 Forbidden
    res = client.put(f"/config/card-programmes/{prog.id}", headers=headers, json={"card_programme_name": "New Name"})
    assert res.status_code == 403

    # POST activate -> 403 Forbidden
    res = client.post(f"/config/card-programmes/{prog.id}/activate", headers=headers)
    assert res.status_code == 403

    # POST deactivate -> 403 Forbidden
    res = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=headers)
    assert res.status_code == 403


def test_checker_cannot_initiate_mutation(setup_governance_db):
    """controlc has request.approve & config.view but lacks config.manage -> 403 Forbidden on mutations."""
    prog = setup_governance_db
    headers = get_auth_header("controlc")

    res = client.post("/config/card-programmes", headers=headers, json={
        "card_programme_code": "CHECKER_INIT",
        "card_programme_name": "Checker Init Attempt",
        "card_type": "VERVE",
    })
    assert res.status_code == 403

    res = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=headers)
    assert res.status_code == 403


def test_maker_can_initiate_deactivate_and_pending_exposed(setup_governance_db):
    """controlm initiates deactivate -> creates PENDING work item -> exposed via API."""
    prog = setup_governance_db
    maker_headers = get_auth_header("controlm")

    res = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "PENDING_APPROVAL"
    work_item_id = data["work_item_id"]

    # Verify GET list exposes has_pending_change and work_item_id
    res = client.get("/config/card-programmes", headers=maker_headers)
    assert res.status_code == 200
    item = next(p for p in res.json() if p["id"] == prog.id)
    assert item["has_pending_change"] is True
    assert item["pending_work_item_id"] == work_item_id
    assert item["pending_operation_code"] == "DEACTIVATE"

    # Clean up pending item for next tests
    db_session = SessionLocal()
    try:
        wi = db_session.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == work_item_id).first()
        if wi:
            db_session.delete(wi)
            db_session.commit()
    finally:
        db_session.close()


def test_duplicate_mutation_returns_409_conflict(setup_governance_db):
    """Attempting a second mutation while one is PENDING returns 409 Conflict."""
    prog = setup_governance_db
    maker_headers = get_auth_header("controlm")

    # First mutation -> PENDING_APPROVAL
    res1 = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res1.status_code == 200
    wi_id = res1.json()["work_item_id"]

    # Second mutation -> 409 Conflict
    res2 = client.post(f"/config/card-programmes/{prog.id}/activate", headers=maker_headers)
    assert res2.status_code == 409

    # Clean up pending item
    db_session = SessionLocal()
    try:
        wi = db_session.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi_id).first()
        if wi:
            db_session.delete(wi)
            db_session.commit()
    finally:
        db_session.close()


def test_maker_cannot_self_approve(setup_governance_db):
    """Maker controlm cannot approve their own work item -> 409 Conflict."""
    prog = setup_governance_db
    maker_headers = get_auth_header("controlm")

    res = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res.status_code == 200
    wi_id = res.json()["work_item_id"]

    # controlm lacks request.approve permission -> 403 Forbidden
    res_app = client.post(f"/maker-checker/{wi_id}/approve", headers=maker_headers, json={"remarks": "Self approve"})
    assert res_app.status_code == 403
    assert "sufficient privileges" in res_app.json()["detail"].lower()

    # Clean up
    db_session = SessionLocal()
    try:
        wi = db_session.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi_id).first()
        if wi:
            db_session.delete(wi)
            db_session.commit()
    finally:
        db_session.close()


def test_checker_approval_applies_database_change_and_clears_pending(setup_governance_db):
    """Checker controlc approves deactivate -> DB active becomes False, pending clears."""
    prog = setup_governance_db
    maker_headers = get_auth_header("controlm")
    checker_headers = get_auth_header("controlc")

    assert prog.active is True

    # Maker initiates Deactivate
    res_m = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res_m.status_code == 200
    wi_id = res_m.json()["work_item_id"]

    # Checker approves
    res_c = client.post(f"/maker-checker/{wi_id}/approve", headers=checker_headers, json={"remarks": "Approved deactivation"})
    assert res_c.status_code == 200
    assert res_c.json()["status_code"] == "APPROVED"

    # Refresh DB session & verify domain active state changed to False
    db_session = SessionLocal()
    try:
        updated_prog = db_session.query(CardProgramme).filter(CardProgramme.id == prog.id).first()
        assert updated_prog.active is False
    finally:
        db_session.close()

    # Verify pending state cleared
    res_list = client.get(f"/config/card-programmes/{prog.id}", headers=maker_headers)
    assert res_list.status_code == 200
    assert res_list.json()["has_pending_change"] is False

    # Now Maker initiates Activate
    res_act = client.post(f"/config/card-programmes/{prog.id}/activate", headers=maker_headers)
    assert res_act.status_code == 200
    wi_id2 = res_act.json()["work_item_id"]

    # Checker approves Activate
    res_c2 = client.post(f"/maker-checker/{wi_id2}/approve", headers=checker_headers, json={"remarks": "Approved activation"})
    assert res_c2.status_code == 200

    # Verify active state restored to True
    db_session2 = SessionLocal()
    try:
        updated_prog2 = db_session2.query(CardProgramme).filter(CardProgramme.id == prog.id).first()
        assert updated_prog2.active is True
    finally:
        db_session2.close()


def test_rejection_and_cancellation_clears_pending(setup_governance_db):
    """Rejection or cancellation of work item clears pending state allowing subsequent mutations."""
    prog = setup_governance_db
    maker_headers = get_auth_header("controlm")
    checker_headers = get_auth_header("controlc")

    # 1. Reject flow
    res = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res.status_code == 200
    wi_id = res.json()["work_item_id"]

    res_rej = client.post(f"/maker-checker/{wi_id}/reject", headers=checker_headers, json={"remarks": "Rejected deactivation"})
    assert res_rej.status_code == 200
    assert res_rej.json()["status_code"] == "REJECTED"

    res_check = client.get(f"/config/card-programmes/{prog.id}", headers=maker_headers)
    assert res_check.json()["has_pending_change"] is False

    # 2. Cancel flow
    res2 = client.post(f"/config/card-programmes/{prog.id}/deactivate", headers=maker_headers)
    assert res2.status_code == 200
    wi_id2 = res2.json()["work_item_id"]

    res_can = client.post(f"/maker-checker/{wi_id2}/cancel", headers=maker_headers, json={"remarks": "Cancelling my change"})
    assert res_can.status_code == 200
    assert res_can.json()["status_code"] == "CANCELLED"

    res_check2 = client.get(f"/config/card-programmes/{prog.id}", headers=maker_headers)
    assert res_check2.json()["has_pending_change"] is False


def test_tenant_isolation(setup_governance_db):
    """User in client 1 cannot view or mutate Card Programme in client 2."""
    headers1 = get_auth_header("controlm", client_id=1)
    headers2 = get_auth_header("other_tenant_user", client_id=2)

    # Tenant 1 user cannot see Tenant 2 programme in list
    res = client.get("/config/card-programmes", headers=headers1)
    codes = [p["card_programme_code"] for p in res.json()]
    assert "GOV_PROG_01" in codes
    assert "TENANT2_PROG" not in codes

    # Tenant 1 user GET tenant 2 programme directly -> 404 Not Found
    res2_prog = client.get("/config/card-programmes", headers=headers2).json()
    t2_item = next(p for p in res2_prog if p["card_programme_code"] == "TENANT2_PROG")

    res_cross = client.get(f"/config/card-programmes/{t2_item['id']}", headers=headers1)
    assert res_cross.status_code == 404
