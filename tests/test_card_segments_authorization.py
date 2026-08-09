import pytest
from fastapi.testclient import TestClient
from src.app import app
from src.db import SessionLocal, init_db
from src.db_models import CardSegment, CardProgramme, RolePermission, User
from src.api.auth import AuthService

client = TestClient(app)


def get_token(username: str, roles: list[str], client_id: int = 1):
    return AuthService._create_token(
        username=username,
        user_id=username,
        client_id=client_id,
        effective_branch_code=None if username in ["controlm", "controlc", "admin"] else "001",
        roles=roles,
        role_scope="HEAD_OFFICE" if username in ["controlm", "controlc", "admin"] else "BRANCH",
        is_head_office_user=True if username in ["controlm", "controlc", "admin"] else False,
    )


@pytest.fixture(autouse=True)
def setup_auth_data():
    init_db()
    db = SessionLocal()
    try:
        # Seed test programmes
        p1 = db.query(CardProgramme).filter(CardProgramme.id == 991).first()
        if not p1:
            db.add(CardProgramme(id=991, client_id=1, card_programme_code="AUTH_PROG_1", card_programme_name="Auth Prog 1", card_type="VERVE", active=True, created_by="test"))

        # Ensure RolePermission mappings exist for test roles
        # control_maker -> config.manage, config.view
        # control_checker -> config.view, request.approve
        # branch_submitter -> request.create, request.view
        mappings = [
            ("control_maker", "config.manage"),
            ("control_maker", "config.view"),
            ("control_checker", "config.view"),
            ("control_checker", "request.approve"),
            ("branch_submitter", "request.create"),
            ("branch_submitter", "request.view"),
        ]
        for role, perm in mappings:
            existing = db.query(RolePermission).filter(
                RolePermission.role_code == role,
                RolePermission.permission_code == perm,
            ).first()
            if not existing:
                db.add(RolePermission(role_code=role, permission_code=perm, active=True, created_by="test"))

        db.commit()
    finally:
        db.close()


def test_submitter1_view_allowed():
    token = get_token("submitter1", ["branch_submitter"])
    headers = {"Authorization": f"Bearer {token}"}
    res = client.get("/config/card-segments", headers=headers)
    assert res.status_code == 200


def test_submitter1_mutations_forbidden():
    token = get_token("submitter1", ["branch_submitter"])
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create segment
    res = client.post("/config/card-segments", json={"segment_code": "SUB1_SEG", "segment_name": "Submitter Seg", "priority": 99}, headers=headers)
    assert res.status_code == 403
    assert "Permission denied" in res.json()["detail"]

    # 2. Update segment
    res = client.put("/config/card-segments/1", json={"segment_name": "Attempt Update"}, headers=headers)
    assert res.status_code == 403

    # 3. Activate segment
    res = client.post("/config/card-segments/1/activate", headers=headers)
    assert res.status_code == 403

    # 4. Deactivate segment
    res = client.post("/config/card-segments/1/deactivate", headers=headers)
    assert res.status_code == 403

    # 5. Assign programme
    res = client.post("/config/card-segments/1/programmes", json={"card_programme_id": 991}, headers=headers)
    assert res.status_code == 403

    # 6. Unassign programme
    res = client.delete("/config/card-segments/1/programmes/991", headers=headers)
    assert res.status_code == 403

    # 7. Reorder programmes
    res = client.post("/config/card-segments/1/programmes/reorder", json={"card_programme_id": 991, "direction": "UP"}, headers=headers)
    assert res.status_code == 403


def test_controlc_mutations_forbidden():
    token = get_token("controlc", ["control_checker"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post("/config/card-segments/1/deactivate", headers=headers)
    assert res.status_code == 403
    assert "Permission denied" in res.json()["detail"]


def test_controlm_mutations_allowed():
    token = get_token("controlm", ["control_maker"])
    headers = {"Authorization": f"Bearer {token}"}

    res = client.post(
        "/config/card-segments",
        json={"segment_code": "CTRLM_SEG", "segment_name": "Control Maker Seg", "priority": 10},
        headers=headers,
    )
    # controlm has config.manage permission so call is accepted (200 OK or 201)
    assert res.status_code in [200, 201]
