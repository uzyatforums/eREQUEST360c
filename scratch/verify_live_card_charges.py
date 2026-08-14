from src.db import get_db
from src.db_models import CardChargesHeader, CardChargeEntry, MakerCheckerWorkItem, User
from src.models import UserInfo, CardChargesHeaderCreate, CardChargesHeaderUpdate, CardChargeEntryCreate
from src.api.card_charges import create_card_charges, update_card_charges, list_card_charges
from src.api.maker_checker_service import MakerCheckerService

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

import time

print("=== Phase 13: Live SQL Server Card Charges Verification ===")

# 1. Create a new Card Charges Header aggregate via Maker
suffix = int(time.time())
unique_name = f"Verification Gold Charges Profile {suffix}"
payload = CardChargesHeaderCreate(
    charge_name=unique_name,
    description="Verification profile created on SQL Server",
    active=True,
    entries=[
        CardChargeEntryCreate(sequence_no=1, posting_account_type="GL", dr_cr="D", narration="CARD ISSUANCE FEE", posting_entry_type="CISSUANCE", amount=1500.0, currency_code="NGN", active=True),
        CardChargeEntryCreate(sequence_no=2, posting_account_type="GL", dr_cr="C", narration="CARD ISSUANCE INCOME", posting_entry_type="GINC", amount=1500.0, currency_code="NGN", active=True),
    ],
)

res = create_card_charges(payload=payload, db=db, current_user=maker_user)
print(f"1. Create submit result: {res.status} | Work Item ID: {res.work_item_id} | Message: {res.message}")

# Approve the Work Item via Checker
approved_wi = MakerCheckerService.approve(db=db, user=checker_user, work_item_id=res.work_item_id, remarks="Approved live verification")
print(f"   -> Approved Work Item status: {approved_wi.status_code} | Target Entity ID: {approved_wi.entity_id}")

# Verify physical rows in SQL Server
created_header = db.query(CardChargesHeader).filter(CardChargesHeader.id == approved_wi.entity_id).first()
assert created_header is not None, "Header missing in SQL Server!"
print(f"   -> Physical SQL Server Header ID: {created_header.id} | Name: '{created_header.charge_name}' | Active: {created_header.active}")

created_entries = db.query(CardChargeEntry).filter(CardChargeEntry.charge_header_id == created_header.id).all()
assert len(created_entries) == 2, f"Expected 2 entries, got {len(created_entries)}"
for e in created_entries:
    print(f"       -> Entry ID: {e.id} | Header FK: {e.charge_header_id} | Type: {e.posting_entry_type} | {e.dr_cr} {e.amount} {e.currency_code}")

# 2. Update aggregate & soft-retire an entry
update_payload = CardChargesHeaderUpdate(
    charge_name=f"Verification Gold Charges Profile Updated {suffix}",
    description="Updated description on SQL Server",
    active=True,
    entries=[
        CardChargeEntryCreate(id=created_entries[0].id, sequence_no=1, posting_account_type="GL", dr_cr="D", narration="CARD ISSUANCE FEE ADJUSTED", posting_entry_type="CISSUANCE", amount=2000.0, currency_code="NGN", active=True),
        CardChargeEntryCreate(id=created_entries[1].id, sequence_no=2, posting_account_type="GL", dr_cr="C", narration="CARD ISSUANCE INCOME ADJUSTED", posting_entry_type="GINC", amount=2000.0, currency_code="NGN", active=True),
    ],
)

up_res = update_card_charges(id=created_header.id, payload=update_payload, db=db, current_user=maker_user)
print(f"\n2. Update submit result: {up_res.status} | Work Item ID: {up_res.work_item_id}")

up_wi = MakerCheckerService.approve(db=db, user=checker_user, work_item_id=up_res.work_item_id, remarks="Approved live update")
print(f"   -> Approved Update Work Item status: {up_wi.status_code}")

db.refresh(created_header)
print(f"   -> Updated SQL Server Header Name: '{created_header.charge_name}'")

# 3. Verify List endpoint correlation
list_items = list_card_charges(search="Verification Gold", status_filter="ACTIVE", db=db, current_user=maker_user)
print(f"\n3. List endpoint returned {len(list_items)} matching profile(s):")
for item in list_items:
    print(f"   -> ID: {item.id} | Name: '{item.charge_name}' | Lines: {item.entries_count} | Pending: {item.has_pending_change}")

print("\n=== Live SQL Server Verification Completed Successfully! ===")
