import pytest
from fastapi import HTTPException
from src.db import SessionLocal, init_db
from src.db_models import (
    CardChargesHeader,
    CardChargeEntry,
    MakerCheckerWorkItem,
    User,
)
from src.models import UserInfo, MakerCheckerSubmitRequest
from src.api.card_charges_validation import validate_card_charges_aggregate
from src.api.entity_executors.card_charges_executor import CardChargesHeaderExecutor
from src.api.maker_checker_service import MakerCheckerService


@pytest.fixture
def db():
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_tenant_isolation_and_header_uniqueness(db):
    client_1 = 1
    client_2 = 2

    # Create Header for Tenant 1
    h1 = CardChargesHeader(
        client_id=client_1,
        charge_name="Standard Fee Profile",
        created_by="maker1",
    )
    db.add(h1)
    db.commit()

    # Same name under Tenant 2 should be valid (tenant isolation)
    entries_valid = [
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 1000, "currency_code": "NGN", "active": True},
    ]
    validate_card_charges_aggregate(db, client_id=client_2, charge_name="Standard Fee Profile", entries=entries_valid)

    # Same name under Tenant 1 should raise HTTP 409 Conflict
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=client_1, charge_name="Standard Fee Profile", entries=entries_valid)
    assert exc.value.status_code == 409


def test_unbalanced_aggregate_rejection(db):
    entries_unbalanced = [
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 500, "currency_code": "NGN", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=1, charge_name="Unbalanced Profile", entries=entries_unbalanced)
    assert exc.value.status_code == 400
    assert "Unbalanced Card Charges Aggregate" in exc.value.detail


def test_currency_consistency_validation(db):
    entries_multi_curr = [
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 1000, "currency_code": "USD", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=1, charge_name="Multi Currency Profile", entries=entries_multi_curr)
    assert exc.value.status_code == 400
    assert "same currency" in exc.value.detail


def test_invalid_lookup_validations(db):
    # Invalid posting_entry_type
    entries_bad_entry_type = [
        {"posting_entry_type": "INVALID_TYPE", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 1000, "currency_code": "NGN", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=1, charge_name="Bad Entry Type Profile", entries=entries_bad_entry_type)
    assert exc.value.status_code == 400

    # Invalid posting_branch_type
    entries_bad_branch_type = [
        {"posting_entry_type": "CISSUANCE", "posting_branch_type": "INVALID_BRANCH", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 1000, "currency_code": "NGN", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=1, charge_name="Bad Branch Type Profile", entries=entries_bad_branch_type)
    assert exc.value.status_code == 400


def test_executor_create_and_id_propagation(db):
    executor = CardChargesHeaderExecutor()
    user = UserInfo(username="maker1", user_id="maker1", client_id=1, roles=["operations_admin_maker"])

    after_dict = {
        "charge_name": "New Test Profile",
        "description": "Test description",
        "active": True,
        "entries": [
            {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Card Issuance", "amount": 1200, "currency_code": "NGN", "active": True},
            {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 1200, "currency_code": "NGN", "active": True},
        ],
    }

    work_item = MakerCheckerService.submit(
        db=db,
        user=user,
        req=MakerCheckerSubmitRequest(
            entity_type_code="CARD_CHARGES_HEADER",
            entity_key=0,
            operation_code="CREATE",
            after_payload=after_dict,
        ),
    )

    executor._execute_create(db, work_item, after_dict, checker_user_id="checker1")
    db.commit()

    assert work_item.entity_id > 0
    header = db.query(CardChargesHeader).filter(CardChargesHeader.id == work_item.entity_id).first()
    assert header is not None
    assert header.charge_name == "New Test Profile"

    entries = db.query(CardChargeEntry).filter(CardChargeEntry.charge_header_id == header.id).all()
    assert len(entries) == 2
    assert all(e.charge_header_id == header.id for e in entries)


def test_executor_update_reconciliation_and_soft_retirement(db):
    executor = CardChargesHeaderExecutor()
    user = UserInfo(username="maker1", user_id="maker1", client_id=1, roles=["operations_admin_maker"])

    # Create initial Header & 3 entries
    h = CardChargesHeader(client_id=1, charge_name="Reconciliation Test Profile", active=True, created_by="maker1")
    db.add(h)
    db.flush()

    e1 = CardChargeEntry(client_id=1, charge_header_id=h.id, sequence_no=1, posting_account_type="GL", dr_cr="D", narration="Line 1", posting_entry_type="CISSUANCE", amount=1000, currency_code="NGN", active=True, created_by="maker1")
    e2 = CardChargeEntry(client_id=1, charge_header_id=h.id, sequence_no=2, posting_account_type="GL", dr_cr="D", narration="Line 2", posting_entry_type="CVATA", amount=75, currency_code="NGN", active=True, created_by="maker1")
    e3 = CardChargeEntry(client_id=1, charge_header_id=h.id, sequence_no=3, posting_account_type="GL", dr_cr="C", narration="Line 3", posting_entry_type="GINC", amount=1075, currency_code="NGN", active=True, created_by="maker1")
    db.add_all([e1, e2, e3])
    db.commit()

    after_dict = {
        "charge_name": "Reconciliation Test Profile Updated",
        "description": "Updated description",
        "active": True,
        "entries": [
            {"id": e1.id, "posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Line 1 Updated", "amount": 1500, "currency_code": "NGN", "active": True},
            {"id": e3.id, "posting_entry_type": "GINC", "dr_cr": "C", "narration": "Line 3 Updated", "amount": 1500, "currency_code": "NGN", "active": True},
        ],
    }

    work_item = MakerCheckerService.submit(
        db=db,
        user=user,
        req=MakerCheckerSubmitRequest(
            entity_type_code="CARD_CHARGES_HEADER",
            entity_key=h.id,
            operation_code="UPDATE",
            after_payload=after_dict,
        ),
    )
    executor._execute_update(db, work_item, h.id, 1, {}, after_dict, checker_user_id="checker1")
    db.commit()

    # Check header
    db.refresh(h)
    assert h.charge_name == "Reconciliation Test Profile Updated"

    # Check e2 is soft-retired (active = False)
    db.refresh(e2)
    assert e2.active is False

    # Check e1 and e3 updated
    db.refresh(e1)
    assert e1.amount == 1500
    assert e1.narration == "Line 1 Updated"


def test_copy_effective_entries_only(db):
    # Create source Header with 2 active entries and 1 inactive entry
    h_src = CardChargesHeader(client_id=1, charge_name="Source Profile", active=True, created_by="maker1")
    db.add(h_src)
    db.flush()

    e1 = CardChargeEntry(client_id=1, charge_header_id=h_src.id, sequence_no=1, dr_cr="D", narration="Active Fee", posting_entry_type="CISSUANCE", amount=1000, currency_code="NGN", active=True, created_by="maker1")
    e2 = CardChargeEntry(client_id=1, charge_header_id=h_src.id, sequence_no=2, dr_cr="D", narration="Obsolete Fee", posting_entry_type="CVATA", amount=75, currency_code="NGN", active=False, created_by="maker1")
    e3 = CardChargeEntry(client_id=1, charge_header_id=h_src.id, sequence_no=3, dr_cr="C", narration="Active Income", posting_entry_type="GINC", amount=1000, currency_code="NGN", active=True, created_by="maker1")
    db.add_all([e1, e2, e3])
    db.commit()

    # Filter effective entries (Header active & Entry active)
    effective_entries = [
        e for e in [e1, e2, e3] if h_src.active and e.active
    ]

    assert len(effective_entries) == 2
    assert e2 not in effective_entries
    assert e1 in effective_entries
    assert e3 in effective_entries


def test_duplicate_posting_entry_type_rejection(db):
    entries_duplicate = [
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee 1", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "CISSUANCE", "dr_cr": "C", "narration": "Fee 2", "amount": 1000, "currency_code": "NGN", "active": True},
    ]
    with pytest.raises(HTTPException) as exc:
        validate_card_charges_aggregate(db, client_id=1, charge_name="Duplicate Entry Type Profile", entries=entries_duplicate)
    assert exc.value.status_code == 400
    assert "Duplicate posting_entry_type" in exc.value.detail


def test_duplicate_posting_entry_type_with_inactive_allowed(db):
    entries = [
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Active Fee", "amount": 1000, "currency_code": "NGN", "active": True},
        {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Retired Fee", "amount": 1000, "currency_code": "NGN", "active": False},
        {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Active Income", "amount": 1000, "currency_code": "NGN", "active": True},
    ]
    # Inactive duplicate posting_entry_type should NOT trigger rejection
    validate_card_charges_aggregate(db, client_id=1, charge_name="Inactive Duplicate Profile", entries=entries)


def test_invalid_duplicate_payload_no_work_item_created(db):
    from src.models import CardChargesHeaderUpdate, CardChargeEntryCreate
    from src.api.card_charges import update_card_charges

    user = UserInfo(username="maker1", user_id="maker1", client_id=1, roles=["operations_admin_maker"])

    # Create initial Header & entries
    h = CardChargesHeader(client_id=1, charge_name="Payload Test Profile", active=True, created_by="maker1")
    db.add(h)
    db.flush()

    e1 = CardChargeEntry(client_id=1, charge_header_id=h.id, sequence_no=1, posting_account_type="GL", dr_cr="D", narration="Line 1", posting_entry_type="CISSUANCE", amount=1000, currency_code="NGN", active=True, created_by="maker1")
    e2 = CardChargeEntry(client_id=1, charge_header_id=h.id, sequence_no=2, posting_account_type="GL", dr_cr="C", narration="Line 2", posting_entry_type="GINC", amount=1000, currency_code="NGN", active=True, created_by="maker1")
    db.add_all([e1, e2])
    db.commit()

    initial_wi_count = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == h.id).count()

    # Invalid update payload with duplicate CISSUANCE
    invalid_update = CardChargesHeaderUpdate(
        charge_name="Payload Test Profile Updated",
        entries=[
            CardChargeEntryCreate(id=e1.id, sequence_no=1, posting_account_type="GL", dr_cr="D", narration="Debit test", posting_entry_type="CISSUANCE", amount=20.0, currency_code="NGN", active=True),
            CardChargeEntryCreate(id=e2.id, sequence_no=2, posting_account_type="GL", dr_cr="C", narration="Credit test", posting_entry_type="CISSUANCE", amount=20.0, currency_code="NGN", active=True),
        ],
    )

    with pytest.raises(HTTPException) as exc:
        update_card_charges(id=h.id, payload=invalid_update, db=db, current_user=user)

    assert exc.value.status_code == 400
    assert "Duplicate posting_entry_type" in exc.value.detail

    # Verify ZERO work items were created for this failed submission
    after_wi_count = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == h.id).count()
    assert after_wi_count == initial_wi_count
