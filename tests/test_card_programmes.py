import pytest
from fastapi.testclient import TestClient

from src.app import app
from src.db import Base, get_db
from src.seed import seed_data
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


def get_auth_header(username="admin", password="password123"):
    response = client.post("/auth/login", json={"username": username, "password": password})
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_get_card_programmes():
    headers = get_auth_header()
    res = client.get("/config/card-programmes", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    codes = [item["card_programme_code"] for item in data]
    assert "APEX_VERVE_CLASSIC" in codes


def test_get_card_programme_by_id():
    headers = get_auth_header()
    res = client.get("/config/card-programmes/1", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == 1
    assert data["card_programme_code"] == "APEX_VERVE_CLASSIC"


def test_create_card_programme():
    headers = get_auth_header()
    payload = {
        "card_programme_code": "TEST_CARD_PROG",
        "card_programme_name": "Test Card Programme",
        "card_type": "VERVE",
        "bin": "506119",
        "issuance_fee": 1200.0,
        "currency": "NGN",
        "active": True
    }
    res = client.post("/config/card-programmes", json=payload, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert data["card_programme_code"] == "TEST_CARD_PROG"
    assert data["issuance_fee"] == 1200.0


def test_update_card_programme():
    headers = get_auth_header()
    payload = {
        "card_programme_name": "Apex Verve Classic Updated",
        "issuance_fee": 1300.0,
        "active": True
    }
    res = client.put("/config/card-programmes/1", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["card_programme_name"] == "Apex Verve Classic Updated"
    assert data["issuance_fee"] == 1300.0
