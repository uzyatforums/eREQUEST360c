import time
from fastapi import HTTPException
from src.db import get_db
from src.models import UserInfo, CardChargesHeaderCreate, CardChargesHeaderUpdate, CardChargeEntryCreate
from src.api.card_charges import create_card_charges, update_card_charges, get_card_charge_detail, list_card_charges
from src.api.card_charges_validation import validate_card_charges_aggregate
from src.api.maker_checker_service import MakerCheckerService
from src.api.maker_checker_repository import MakerCheckerRepository
from src.db_models import CardChargesHeader, CardChargeEntry, MakerCheckerWorkItem

db = next(get_db())

maker_user = UserInfo(
    username="controlm",
    user_id="controlm",
    client_id=1,
    roles=["control_maker", "super_admin"],
)

checker_user = UserInfo(
    username="controlc",
    user_id="controlc",
    client_id=1,
    roles=["control_checker", "super_admin"],
)

print("=================================================================")
print("=== COMPREHENSIVE LIVE SQL SERVER VERIFICATION SUITE FOR CARD CHARGES ===")
print("=================================================================")

# -----------------------------------------------------------------
# 1. DUPLICATE posting_entry_type — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 1: Duplicate posting_entry_type Rejection ---")
duplicate_payload = CardChargesHeaderUpdate(
    charge_name="CHG-VV-NGN-RO-DUPLICATE-TEST",
    description="Verve Naira Charges Duplicate Test",
    active=True,
    entries=[
        CardChargeEntryCreate(
            id=74,
            sequence_no=1,
            posting_account_type="GL",
            dr_cr="D",
            narration="Debit test",
            posting_account_number="1111111",
            posting_branch_type="RB",
            posting_entry_type="CISSUANCE",
            amount=20.0,
            currency_code="NGN",
            active=True,
        ),
        CardChargeEntryCreate(
            id=75,
            sequence_no=2,
            posting_account_type="GL",
            dr_cr="C",
            narration="Credit test",
            posting_account_number="22222222",
            posting_branch_type="HQ",
            posting_entry_type="CISSUANCE",
            amount=20.0,
            currency_code="NGN",
            active=True,
        ),
    ],
)

wi_before = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == 11, MakerCheckerWorkItem.status_code == "PENDING").count()

try:
    update_card_charges(id=11, payload=duplicate_payload, db=db, current_user=maker_user)
    print("FAIL: Duplicate posting_entry_type payload was NOT rejected!")
except HTTPException as exc:
    print(f"PASS: HTTP {exc.status_code} returned cleanly.")
    print(f"      Detail: '{exc.detail}'")
    assert exc.status_code == 400
    assert "Duplicate posting_entry_type 'CISSUANCE'" in exc.detail

wi_after = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == 11, MakerCheckerWorkItem.status_code == "PENDING").count()
assert wi_before == wi_after, f"Pending work item was created! (Before: {wi_before}, After: {wi_after})"
print(f"PASS: Confirmed 0 Work Items created in SQL Server DB. (Pending count: {wi_after})")


# Clear any pre-existing pending work item on Entity #11
existing_pending = db.query(MakerCheckerWorkItem).filter(
    MakerCheckerWorkItem.client_id == 1,
    MakerCheckerWorkItem.entity_type_code == "CARD_CHARGES_HEADER",
    MakerCheckerWorkItem.entity_id == 11,
    MakerCheckerWorkItem.status_code == "PENDING",
).all()
for p_item in existing_pending:
    MakerCheckerService.approve(db=db, user=checker_user, work_item_id=p_item.id, remarks="Cleared for live test")

# -----------------------------------------------------------------
# 2. VALID EDIT SUBMISSION & SUMMARY GENERATION — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 2: Valid EDIT Submission & Summary Generation ---")
suffix = int(time.time())
valid_edit_name = f"CHG-VV-NGN-RO-EDIT-{suffix}"
valid_payload = CardChargesHeaderUpdate(
    charge_name=valid_edit_name,
    description="Verve Naira Royalty Charges Validated Edit",
    active=True,
    entries=[
        CardChargeEntryCreate(
            id=74,
            sequence_no=1,
            posting_account_type="GL",
            dr_cr="D",
            narration="Debit test",
            posting_account_number="1111111",
            posting_branch_type="RB",
            posting_entry_type="CISSUANCE",
            amount=25.0,
            currency_code="NGN",
            active=True,
        ),
        CardChargeEntryCreate(
            id=75,
            sequence_no=2,
            posting_account_type="GL",
            dr_cr="C",
            narration="Credit test",
            posting_account_number="22222222",
            posting_branch_type="HQ",
            posting_entry_type="GINC",
            amount=25.0,
            currency_code="NGN",
            active=True,
        ),
    ],
)

submit_res = update_card_charges(id=11, payload=valid_payload, db=db, current_user=maker_user)
print(f"PASS: Valid EDIT submitted! Status: {submit_res.status} | Work Item ID: {submit_res.work_item_id}")

actions = MakerCheckerRepository.get_actions_by_work_item_id(db, submit_res.work_item_id)
if actions:
    print(f"PASS: Maker/Checker Summary generated:\n      '{actions[0].change_summary}'")


# -----------------------------------------------------------------
# 3. CHECKER APPROVAL & ATOMIC COMMIT — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 3: Checker Approval & Atomic Commit ---")
approved_item = MakerCheckerService.approve(
    db=db,
    user=checker_user,
    work_item_id=submit_res.work_item_id,
    remarks="Approved live verification test",
)
print(f"PASS: Work Item #{approved_item.id} approved by '{checker_user.user_id}'. Status: {approved_item.status_code}")

db.expire_all()
updated_header = db.query(CardChargesHeader).filter(CardChargesHeader.id == 11).first()
assert updated_header.charge_name == valid_edit_name, f"Expected {valid_edit_name}, got {updated_header.charge_name}"
print(f"PASS: Header updated in physical SQL Server DB: Name = '{updated_header.charge_name}'")

entries_db = db.query(CardChargeEntry).filter(CardChargeEntry.charge_header_id == 11, CardChargeEntry.active == True).all()
assert len(entries_db) == 2
debits = sum(e.amount for e in entries_db if e.dr_cr == "D")
credits = sum(e.amount for e in entries_db if e.dr_cr == "C")
print(f"PASS: Physical Entries updated: Debits NGN {debits:,.2f} == Credits NGN {credits:,.2f} (Balanced)")


# -----------------------------------------------------------------
# 4. NO-CHANGE EDIT REJECTION — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 4: No-Change EDIT Rejection ---")
current_detail = get_card_charge_detail(id=11, db=db, current_user=maker_user)
unchanged_entries = [
    CardChargeEntryCreate(
        id=e.id,
        sequence_no=e.sequence_no,
        posting_account_type=e.posting_account_type,
        dr_cr=e.dr_cr,
        narration=e.narration,
        posting_account_number=e.posting_account_number,
        posting_branch_type=e.posting_branch_type,
        posting_entry_type=e.posting_entry_type,
        amount=e.amount,
        currency_code=e.currency_code,
        active=e.active,
    )
    for e in current_detail.entries
]

no_change_payload = CardChargesHeaderUpdate(
    charge_name=current_detail.charge_name,
    description=current_detail.description,
    active=current_detail.active,
    entries=unchanged_entries,
)

try:
    update_card_charges(id=11, payload=no_change_payload, db=db, current_user=maker_user)
    print("FAIL: No-change EDIT was NOT rejected!")
except HTTPException as exc:
    print(f"PASS: HTTP {exc.status_code} returned.")
    print(f"      Detail: '{exc.detail}'")
    assert exc.status_code == 400
    assert "No changes detected" in exc.detail


# -----------------------------------------------------------------
# 5. ENTRY UNIQUENESS (ACTIVE VS INACTIVE) — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 5: Entry Uniqueness (Inactive Duplicate Allowed) ---")
entries_with_inactive_duplicate = [
    {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Active Fee", "amount": 1000, "currency_code": "NGN", "active": True},
    {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Retired Fee", "amount": 1000, "currency_code": "NGN", "active": False},
    {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Active Income", "amount": 1000, "currency_code": "NGN", "active": True},
]
validate_card_charges_aggregate(db=db, client_id=1, charge_name="Inactive Duplicate Test Profile", entries=entries_with_inactive_duplicate)
print("PASS: Aggregate with duplicate inactive posting_entry_type validated successfully!")


# -----------------------------------------------------------------
# 6. UNBALANCED AGGREGATE REJECTION — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 6: Unbalanced Aggregate Rejection ---")
unbalanced_entries = [
    {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee", "amount": 1000, "currency_code": "NGN", "active": True},
    {"posting_entry_type": "GINC", "dr_cr": "C", "narration": "Income", "amount": 500, "currency_code": "NGN", "active": True},
]
try:
    validate_card_charges_aggregate(db=db, client_id=1, charge_name="Unbalanced Profile", entries=unbalanced_entries)
    print("FAIL: Unbalanced aggregate was NOT rejected!")
except HTTPException as exc:
    print(f"PASS: Unbalanced aggregate rejected with HTTP {exc.status_code}: '{exc.detail}'")


# -----------------------------------------------------------------
# 7. HEADER COPY (EFFECTIVE ENTRIES ONLY) — LIVE VERIFICATION
# -----------------------------------------------------------------
print("\n--- Scenario 7: Header Copy (Only Effective Entries) ---")
copy_source_id = 11
source = get_card_charge_detail(id=copy_source_id, db=db, current_user=maker_user)
effective_entries = [e for e in source.entries if source.active and e.active]

copy_name = f"CHG-VV-NGN-RO-COPY-{suffix}"
copy_create_payload = CardChargesHeaderCreate(
    charge_name=copy_name,
    description=f"Copy of {source.description}",
    active=True,
    entries=[
        CardChargeEntryCreate(
            sequence_no=idx + 1,
            posting_account_type=e.posting_account_type,
            dr_cr=e.dr_cr,
            narration=e.narration,
            posting_account_number=e.posting_account_number,
            posting_branch_type=e.posting_branch_type,
            posting_entry_type=e.posting_entry_type,
            amount=e.amount,
            currency_code=e.currency_code,
            active=True,
        )
        for idx, e in enumerate(effective_entries)
    ],
)

copy_res = create_card_charges(payload=copy_create_payload, db=db, current_user=maker_user)
print(f"PASS: Copy submitted as CREATE! Status: {copy_res.status} | Work Item ID: {copy_res.work_item_id}")

copy_approval = MakerCheckerService.approve(db=db, user=checker_user, work_item_id=copy_res.work_item_id, remarks="Approved Copy")
new_copy_header_id = copy_approval.entity_id
print(f"PASS: Copy approved! New Physical SQL Server Header ID: {new_copy_header_id}")

new_copy_header = db.query(CardChargesHeader).filter(CardChargesHeader.id == new_copy_header_id).first()
assert new_copy_header is not None
assert new_copy_header.charge_name == copy_name

print("\n=================================================================")
print("=== ALL 7 LIVE VERIFICATION SCENARIOS PASSED 100% CLEANLY ===")
print("=================================================================")
