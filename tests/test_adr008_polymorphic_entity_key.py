import uuid
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from src.db import Base
from src.db_models import (
    User,
    Permission,
    RolePermission,
    MakerCheckerEntityType,
    MakerCheckerOperation,
    MakerCheckerStatus,
    MakerCheckerWorkItem,
    AuditEvent,
    AuditSnapshot,
    CardProgramme,
)
from src.models import UserInfo, MakerCheckerSubmitRequest
from src.api.maker_checker_service import MakerCheckerService
from src.api.maker_checker_repository import MakerCheckerRepository
from src.api.audit_service import log_audit_event
from src.api.entity_executors.card_programme_executor import CardProgrammeExecutor
from tests.conftest import test_engine, TestingSessionLocal


@pytest.fixture(autouse=True)
def setup_adr008_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()

    # Seed test users
    maker_user = User(
        user_id="maker_adr008",
        username="maker_adr008",
        client_id=1,
        password_hash="hash",
        role_code="branch_submitter",
        active=True,
    )
    checker_user = User(
        user_id="checker_adr008",
        username="checker_adr008",
        client_id=1,
        password_hash="hash",
        role_code="branch_authorizer",
        active=True,
    )
    t2_user = User(
        user_id="maker_t2_adr008",
        username="maker_t2_adr008",
        client_id=2,
        password_hash="hash",
        role_code="branch_submitter",
        active=True,
    )
    db.add_all([maker_user, checker_user, t2_user])

    # Seed permissions
    db.merge(Permission(permission_code="request.approve", permission_name="Approve", active=True, created_by="INIT"))
    db.merge(RolePermission(role_code="branch_authorizer", permission_code="request.approve", active=True, created_by="INIT"))

    # Seed Maker/Checker lookups
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
    ]
    entity_types = [
        MakerCheckerEntityType(entity_type_code="CARD_PROGRAMME", entity_type_name="Card Programme", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="CARD_SEGMENT", entity_type_name="Card Segment", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="BRANCH", entity_type_name="Branch", created_by="INIT"),
        MakerCheckerEntityType(entity_type_code="CUSTOM_ENTITY", entity_type_name="Custom Entity", created_by="INIT"),
    ]
    for s in statuses:
        db.merge(s)
    for o in operations:
        db.merge(o)
    for e in entity_types:
        db.merge(e)

    db.commit()
    db.close()

    yield

    db = TestingSessionLocal()
    db.close()
    Base.metadata.drop_all(bind=test_engine)


def test_01_grandfathered_numeric_entity_key_string_round_trip():
    """1. Grandfathered numeric entity_key round-trips as canonical text."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key="101",
        operation_code="UPDATE",
        after_payload={"name": "Gold Programme"},
    )
    wi = MakerCheckerService.submit(db, user, req)
    db.commit()

    reloaded = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi.id).first()
    assert reloaded.entity_key == "101"
    assert isinstance(reloaded.entity_key, str)
    db.close()


def test_02_natural_key_shared_layer_support():
    """2. Natural-key support in the shared Maker/Checker layer."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req = MakerCheckerSubmitRequest(
        entity_type_code="BRANCH",
        entity_key="BRANCH-HQ-001",
        operation_code="UPDATE",
        after_payload={"branch_name": "Headquarters"},
    )
    wi = MakerCheckerService.submit(db, user, req)
    db.commit()

    reloaded = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi.id).first()
    assert reloaded.entity_key == "BRANCH-HQ-001"
    db.close()


def test_03_uuid_form_shared_layer_support():
    """3. UUID-form key support in the shared Maker/Checker layer."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    test_uuid = str(uuid.uuid4())
    req = MakerCheckerSubmitRequest(
        entity_type_code="CUSTOM_ENTITY",
        entity_key=test_uuid,
        operation_code="UPDATE",
        after_payload={"status": "ACTIVE"},
    )
    wi = MakerCheckerService.submit(db, user, req)
    db.commit()

    reloaded = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi.id).first()
    assert reloaded.entity_key == test_uuid
    db.close()


def test_04_create_stores_entity_key_none():
    """4. CREATE proposals where entity does not exist store entity_key=None."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key=None,
        operation_code="CREATE",
        after_payload={"card_programme_code": "PROG_NEW"},
    )
    wi = MakerCheckerService.submit(db, user, req)
    db.commit()

    reloaded = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.id == wi.id).first()
    assert reloaded.entity_key is None
    db.close()


def test_05_create_never_substitutes_sentinels_for_none():
    """5. CREATE never substitutes 0, '0', '' for None, but legitimate '0' is treated opaquely."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])

    # None remains strictly None
    req_none = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key=None,
        operation_code="CREATE",
        after_payload={"name": "Test"},
    )
    wi_none = MakerCheckerService.submit(db, user, req_none)
    assert wi_none.entity_key is None
    assert wi_none.entity_key != 0
    assert wi_none.entity_key != "0"
    assert wi_none.entity_key != ""

    # Legitimate canonical string '0' is preserved opaquely by shared layer
    req_zero = MakerCheckerSubmitRequest(
        entity_type_code="CUSTOM_ENTITY",
        entity_key="0",
        operation_code="UPDATE",
        after_payload={"name": "Zero Key Entity"},
    )
    wi_zero = MakerCheckerService.submit(db, user, req_zero)
    assert wi_zero.entity_key == "0"
    db.close()


def test_06_generic_shared_layer_does_not_impose_numeric_key_semantics():
    """6. Generic shared layer does not impose numeric semantics on entity_key."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req = MakerCheckerSubmitRequest(
        entity_type_code="CUSTOM_ENTITY",
        entity_key="ALPHA_CODE_99",
        operation_code="UPDATE",
        after_payload={"config": "value"},
    )
    # Does not raise ValueError / TypeError attempting to cast to int
    wi = MakerCheckerService.submit(db, user, req)
    assert wi.entity_key == "ALPHA_CODE_99"
    db.close()


def test_07_duplicate_pending_protection_for_existing_entity_key():
    """7. Duplicate pending protection prevents concurrent changes on same entity_key."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req1 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key="505",
        operation_code="UPDATE",
        after_payload={"name": "First Update"},
    )
    MakerCheckerService.submit(db, user, req1)
    db.commit()

    req2 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key="505",
        operation_code="DEACTIVATE",
        after_payload={"active": False},
    )
    with pytest.raises(HTTPException) as exc:
        MakerCheckerService.submit(db, user, req2)
    assert exc.value.status_code == 409
    assert "pending" in exc.value.detail.lower()
    db.close()


def test_08_null_create_proposals_do_not_collide_generically():
    """8. NULL CREATE proposals do not collide with each other generically."""
    db = TestingSessionLocal()
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])

    req1 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key=None,
        operation_code="CREATE",
        after_payload={"card_programme_code": "PROG_A"},
    )
    wi1 = MakerCheckerService.submit(db, user, req1)
    db.commit()

    req2 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key=None,
        operation_code="CREATE",
        after_payload={"card_programme_code": "PROG_B"},
    )
    wi2 = MakerCheckerService.submit(db, user, req2)
    db.commit()

    assert wi1.id != wi2.id
    assert wi1.entity_key is None
    assert wi2.entity_key is None
    db.close()


def test_09_audit_requires_client_id():
    """9. Audit logging strictly requires client_id."""
    db = TestingSessionLocal()
    with pytest.raises(ValueError) as exc:
        log_audit_event(
            db=db,
            client_id=None,
            entity_type="CARD_PROGRAMME",
            entity_key="101",
            event_code="CARD_PROGRAMME_UPDATED",
            performed_by="maker_adr008",
        )
    assert "client_id is required" in str(exc.value)
    db.close()


def test_10_audit_stores_domain_entity_type_rather_than_event_code():
    """10. Audit stores domain classification in entity_type, NOT the event_code."""
    db = TestingSessionLocal()
    log_audit_event(
        db=db,
        client_id=1,
        entity_type="CARD_PROGRAMME",
        entity_key="101",
        event_code="CARD_PROGRAMME_ACTIVATED",
        performed_by="checker_adr008",
        snapshot_data={"id": 101, "active": True},
    )
    db.commit()

    reloaded = (
        db.query(AuditEvent)
        .filter(AuditEvent.client_id == 1, AuditEvent.entity_key == "101")
        .order_by(AuditEvent.event_id.desc())
        .first()
    )
    assert reloaded is not None
    assert reloaded.entity_type == "CARD_PROGRAMME"
    assert reloaded.entity_type != "CARD_PROGRAMME_ACTIVATED"

    snapshot = (
        db.query(AuditSnapshot)
        .filter(AuditSnapshot.client_id == 1, AuditSnapshot.entity_key == "101")
        .order_by(AuditSnapshot.snapshot_id.desc())
        .first()
    )
    assert snapshot is not None
    assert snapshot.entity_type == "CARD_PROGRAMME"
    assert snapshot.client_id == 1
    db.close()


def test_11_audit_stores_canonical_string_entity_key():
    """11. Audit stores canonical string entity_key."""
    db = TestingSessionLocal()
    log_audit_event(
        db=db,
        client_id=1,
        entity_type="BRANCH",
        entity_key="BRANCH-042",
        event_code="BRANCH_UPDATED",
        performed_by="maker_adr008",
    )
    db.commit()

    reloaded = (
        db.query(AuditEvent)
        .filter(AuditEvent.client_id == 1, AuditEvent.entity_key == "BRANCH-042")
        .first()
    )
    assert reloaded is not None
    assert reloaded.entity_key == "BRANCH-042"
    assert isinstance(reloaded.entity_key, str)
    db.close()


def test_12_request_audit_works_with_str_request_id():
    """12. Request audit works with str(request_id) and client_id isolation."""
    db = TestingSessionLocal()
    req_id = 9876543210
    log_audit_event(
        db=db,
        client_id=1,
        entity_type="request",
        entity_key=str(req_id),
        event_code="REQUEST_CREATED",
        performed_by="maker_adr008",
        remarks="Created test request",
    )
    db.commit()

    queried = (
        db.query(AuditEvent)
        .filter(
            AuditEvent.client_id == 1,
            AuditEvent.entity_type == "request",
            AuditEvent.entity_key == str(req_id),
        )
        .first()
    )
    assert queried is not None
    assert queried.entity_key == str(req_id)
    db.close()


def test_13_numeric_executors_parse_integer_keys_at_domain_boundary():
    """13. Grandfathered numeric domain executors parse int(entity_key) at domain boundary."""
    db = TestingSessionLocal()
    executor = CardProgrammeExecutor()

    # Create programme
    prog = CardProgramme(
        client_id=1,
        card_programme_code="NUM_EXEC_TEST",
        card_programme_name="Numeric Exec Test",
        card_type="VERVE",
        active=True,
        created_by="init",
    )
    db.add(prog)
    db.commit()

    # Valid numeric string inside work_item
    user = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    req = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key=str(prog.id),
        operation_code="DEACTIVATE",
        after_payload={"active": False},
    )
    wi = MakerCheckerService.submit(db, user, req)
    executor.execute(db, wi, None, checker_user_id="checker_adr008")
    db.commit()

    db.refresh(prog)
    assert prog.active is False

    # Non-numeric entity_key passed to numeric domain executor raises 400 at boundary
    wi_invalid = MakerCheckerWorkItem(
        work_item_number="MC-TEST-INVALID",
        client_id=1,
        entity_type_code="CARD_PROGRAMME",
        entity_key="NON-NUMERIC-KEY",
        operation_code="DEACTIVATE",
        status_code="PENDING",
        created_by="maker_adr008",
    )
    db.add(wi_invalid)
    db.commit()

    with pytest.raises(HTTPException) as exc:
        executor.execute(db, wi_invalid, None, checker_user_id="checker_adr008")
    assert exc.value.status_code == 400
    assert "Invalid entity_key 'NON-NUMERIC-KEY'" in exc.value.detail
    db.close()


def test_14_tenant_isolation_remains_enforced():
    """14. Tenant isolation remains strictly enforced across shared polymorphic keys."""
    db = TestingSessionLocal()
    user_t1 = UserInfo(user_id="maker_adr008", username="maker_adr008", client_id=1, roles=["branch_submitter"])
    user_t2 = UserInfo(user_id="maker_t2_adr008", username="maker_t2_adr008", client_id=2, roles=["branch_submitter"])

    # Tenant 1 submits entity_key="SAME_KEY_123"
    req_t1 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key="SAME_KEY_123",
        operation_code="UPDATE",
        after_payload={"name": "Tenant 1 Programme"},
    )
    wi_t1 = MakerCheckerService.submit(db, user_t1, req_t1)
    db.commit()

    # Tenant 2 can submit with the SAME entity_key without colliding with Tenant 1
    req_t2 = MakerCheckerSubmitRequest(
        entity_type_code="CARD_PROGRAMME",
        entity_key="SAME_KEY_123",
        operation_code="UPDATE",
        after_payload={"name": "Tenant 2 Programme"},
    )
    wi_t2 = MakerCheckerService.submit(db, user_t2, req_t2)
    db.commit()

    assert wi_t1.id != wi_t2.id
    assert wi_t1.client_id == 1
    assert wi_t2.client_id == 2
    assert wi_t1.entity_key == wi_t2.entity_key == "SAME_KEY_123"

    # Pending check repository query is tenant isolated
    assert MakerCheckerRepository.has_pending_for_entity(db, 1, "CARD_PROGRAMME", "SAME_KEY_123") is True
    assert MakerCheckerRepository.has_pending_for_entity(db, 2, "CARD_PROGRAMME", "SAME_KEY_123") is True
    assert MakerCheckerRepository.has_pending_for_entity(db, 3, "CARD_PROGRAMME", "SAME_KEY_123") is False
    db.close()
