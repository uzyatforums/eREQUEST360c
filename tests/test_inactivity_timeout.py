import time
import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.seed import seed_data
from src.config import settings
from src.api.auth import AuthService, SessionActivityTracker
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
def setup_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    seed_data(db)
    db.close()
    SessionActivityTracker.clear_all()


def test_default_inactivity_timeout_config():
    """1. Prove configured default is 5 minutes."""
    assert settings.session_inactivity_timeout_minutes == 5
    res = client.get("/auth/session-config")
    assert res.status_code == 200
    data = res.json()
    assert data["inactivity_timeout_minutes"] == 5
    assert data["inactivity_timeout_seconds"] == 300


def test_active_session_remains_valid_before_threshold():
    """2. Prove an active authenticated session remains valid before inactivity threshold."""
    token = AuthService._create_token(
        username="admin",
        client_id=1,
        roles=["super_admin", "operations_admin_maker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Immediate call succeeds
    res = client.get("/config/branches", headers=headers)
    assert res.status_code == 200


def test_inactive_session_rejected_after_threshold(monkeypatch):
    """3. Prove an inactive session is rejected with HTTP 401 after the threshold (>=300s)."""
    token = AuthService._create_token(
        username="admin",
        client_id=1,
        roles=["super_admin", "operations_admin_maker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Simulate passage of 305 seconds
    real_time = time.time()
    monkeypatch.setattr("time.time", lambda: real_time + 305)

    res = client.get("/config/branches", headers=headers)
    assert res.status_code == 401
    assert "Session expired due to inactivity" in res.json()["detail"]


def test_qualifying_activity_resets_inactivity_window(monkeypatch):
    """4. Prove qualifying user activity resets/extends the inactivity window."""
    token = AuthService._create_token(
        username="admin",
        client_id=1,
        roles=["super_admin", "operations_admin_maker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    headers = {"Authorization": f"Bearer {token}"}

    start_time = time.time()

    # T=0s: Initial request
    res1 = client.get("/config/branches", headers=headers)
    assert res1.status_code == 200

    # T=200s: Qualifying API request occurs (extends window by 300s to T=500s)
    monkeypatch.setattr("time.time", lambda: start_time + 200)
    res2 = client.get("/config/branches", headers=headers)
    assert res2.status_code == 200

    # T=450s: Still valid because activity at T=200s extended window to T=500s (elapsed = 250s < 300s)
    monkeypatch.setattr("time.time", lambda: start_time + 450)
    res3 = client.get("/config/branches", headers=headers)
    assert res3.status_code == 200

    # T=760s: Elapsed > 300s since last activity at T=450s -> REJECTED
    monkeypatch.setattr("time.time", lambda: start_time + 760)
    res4 = client.get("/config/branches", headers=headers)
    assert res4.status_code == 401
    assert "Session expired due to inactivity" in res4.json()["detail"]


def test_background_activity_does_not_extend_inactivity_window(monkeypatch):
    """5. Prove background polling (/maker-checker/pending/count) does NOT extend inactivity window."""
    token = AuthService._create_token(
        username="admin",
        client_id=1,
        roles=["super_admin", "operations_admin_maker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    headers = {"Authorization": f"Bearer {token}"}

    start_time = time.time()

    # T=0s: Initial qualifying request
    res1 = client.get("/config/branches", headers=headers)
    assert res1.status_code == 200

    # T=200s: Background polling call occurs
    monkeypatch.setattr("time.time", lambda: start_time + 200)
    res_bg = client.get("/maker-checker/pending/count", headers=headers)
    assert res_bg.status_code == 200

    # T=310s: Elapsed = 310s since last QUALIFYING activity at T=0s -> REJECTED
    # (Background call at T=200s did not reset the timer!)
    monkeypatch.setattr("time.time", lambda: start_time + 310)
    res_qual = client.get("/config/branches", headers=headers)
    assert res_qual.status_code == 401
    assert "Session expired due to inactivity" in res_qual.json()["detail"]


def test_maker_checker_authorization_with_inactivity_timeout(monkeypatch):
    """6. Prove Maker/Checker authorization operates correctly under inactivity policy."""
    maker_token = AuthService._create_token(
        username="controlm",
        client_id=1,
        roles=["super_admin", "operations_admin_maker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    maker_headers = {"Authorization": f"Bearer {maker_token}"}

    start_time = time.time()

    # 1. Maker submits branch creation
    res_submit = client.post(
        "/config/branches",
        json={"branch_code": "999", "branch_name": "Inactivity Test Branch", "sort_code": "999999", "active": True},
        headers=maker_headers,
    )
    assert res_submit.status_code == 200
    work_item_id = res_submit.json()["work_item_id"]

    # 2. Simulate 310s passing for Maker (Maker session expires)
    monkeypatch.setattr("time.time", lambda: start_time + 310)

    # Maker tries to perform action -> Rejected 401
    res_maker_late = client.get("/config/branches", headers=maker_headers)
    assert res_maker_late.status_code == 401

    # 3. Checker logs in at T=310s and approves work item -> Succeeded 200
    checker_token = AuthService._create_token(
        username="controlc",
        client_id=1,
        roles=["super_admin", "operations_admin_checker"],
        role_scope="HEAD_OFFICE",
        is_head_office_user=True,
    )
    checker_headers = {"Authorization": f"Bearer {checker_token}"}

    res_approve = client.post(
        f"/maker-checker/{work_item_id}/approve",
        json={"remarks": "Approved"},
        headers=checker_headers,
    )
    assert res_approve.status_code == 200
    assert res_approve.json()["status_code"] == "APPROVED"
