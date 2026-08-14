from src.db import get_db
from src.models import UserInfo, CardChargesHeaderUpdate, CardChargeEntryCreate
from src.api.card_charges import update_card_charges
from src.db_models import MakerCheckerWorkItem
from fastapi import HTTPException

db = next(get_db())

test_maker = UserInfo(
    username="controlm",
    user_id="controlm",
    client_id=1,
    roles=["control_maker", "super_admin"],
)

print("=== Live SQL Server: Verifying Invalid User Payload Rejection ===")

# 1. Invalid payload with duplicate CISSUANCE
invalid_payload = CardChargesHeaderUpdate(
    charge_name="CHG-VV-NGN-RO---",
    description="Verve Naira (Royalty) Charges",
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
    ]
)

before_count = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == 11).count()

try:
    update_card_charges(id=11, payload=invalid_payload, db=db, current_user=test_maker)
    print("ERROR: Invalid payload with duplicate CISSUANCE was NOT rejected!")
except HTTPException as exc:
    print(f"1. Invalid Payload Rejection Verified! Status: {exc.status_code} | Detail: '{exc.detail}'")

after_count = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_id == 11).count()
assert before_count == after_count, f"Work Item was created on failed validation! (Before: {before_count}, After: {after_count})"
print(f"   -> Confirmed ZERO Work Items created. (Count remains {after_count})")

# 2. Valid payload with unique entry types (CISSUANCE & GINC)
valid_payload = CardChargesHeaderUpdate(
    charge_name="CHG-VV-NGN-RO-VALID",
    description="Verve Naira Royalty Charges Validated",
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
            posting_entry_type="GINC",
            amount=20.0,
            currency_code="NGN",
            active=True,
        ),
    ]
)

res = update_card_charges(id=11, payload=valid_payload, db=db, current_user=test_maker)
print(f"\n2. Valid Payload Submission Verified! Status: {res.status} | Work Item ID: {res.work_item_id} | Message: {res.message}")

from src.api.maker_checker_repository import MakerCheckerRepository

p = MakerCheckerRepository.get_payload_by_work_item_id(db, res.work_item_id)
if p:
    print(f"   -> Generated Maker/Checker Summary:\n      '{p.change_summary}'")

print("\n=== Live Verification Passed 100%! ===")
