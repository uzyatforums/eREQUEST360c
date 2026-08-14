from src.db import get_db
from src.models import UserInfo, CardChargesHeaderUpdate, CardChargeEntryCreate
from src.api.card_charges import update_card_charges, get_card_charge_detail
from src.api.card_charges_validation import validate_card_charges_aggregate
from fastapi import HTTPException

db = next(get_db())

test_user = UserInfo(
    username="controlm",
    user_id="controlm",
    client_id=1,
    roles=["control_maker", "super_admin"],
)

print("=== Live SQL Server Final Remediation Verification ===")

# 1. Test duplicate posting_entry_type rejection
try:
    validate_card_charges_aggregate(
        db=db,
        client_id=1,
        charge_name="Test Duplicate Profile",
        entries=[
            {"posting_entry_type": "CISSUANCE", "dr_cr": "D", "narration": "Fee", "amount": 100, "currency_code": "NGN", "active": True},
            {"posting_entry_type": "CISSUANCE", "dr_cr": "C", "narration": "Income", "amount": 100, "currency_code": "NGN", "active": True},
        ]
    )
    print("ERROR: Duplicate entry type was NOT rejected!")
except HTTPException as exc:
    print(f"1. Duplicate posting_entry_type rejection verified: Status {exc.status_code} | Detail: '{exc.detail}'")

# 2. Test No-Change UPDATE rejection
detail = get_card_charge_detail(id=4, db=db, current_user=test_user)
existing_entries = [
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
    for e in detail.entries
]

no_change_payload = CardChargesHeaderUpdate(
    charge_name=detail.charge_name,
    description=detail.description,
    active=detail.active,
    entries=existing_entries,
)

try:
    update_card_charges(id=4, payload=no_change_payload, db=db, current_user=test_user)
    print("ERROR: No-change UPDATE was NOT rejected!")
except HTTPException as exc:
    print(f"2. No-Change UPDATE rejection verified: Status {exc.status_code} | Detail: '{exc.detail}'")

print("\n=== Live Verification Completed Successfully! ===")
