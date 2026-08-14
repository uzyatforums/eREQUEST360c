from src.db import get_db
from src.models import UserInfo
from src.api.card_charges import list_card_charges, get_card_charge_detail

db = next(get_db())

test_user = UserInfo(
    username="controlm",
    user_id="controlm",
    client_id=1,
    roles=["control_maker", "super_admin"],
)

print("=== Phase 8 & 9 Verification: Canonical GET /config/card-charges ===")

# Test list endpoint
items = list_card_charges(search=None, status_filter="ACTIVE", db=db, current_user=test_user)
print(f"1. Canonical GET /config/card-charges returned {len(items)} item(s):")
for item in items:
    print(f"   -> Header ID: {item.id} | Name: '{item.charge_name}' | Currency: {item.effective_currency} | Lines: {item.entries_count} | Pending: {item.has_pending_change}")

assert len(items) > 0, "No card charge items returned!"

# Test detail endpoint for the first item
first_id = items[0].id
detail = get_card_charge_detail(id=first_id, db=db, current_user=test_user)
print(f"\n2. Canonical GET /config/card-charges/{first_id} returned Detail:")
print(f"   -> Header Name: '{detail.charge_name}' | Description: '{detail.description}' | Active: {detail.active}")
print(f"   -> Entry Lines Count: {len(detail.entries)}")

total_debits = sum(e.amount for e in detail.entries if e.active and e.dr_cr == "D")
total_credits = sum(e.amount for e in detail.entries if e.active and e.dr_cr == "C")
print(f"   -> Total Debits: {detail.effective_currency} {total_debits:,.2f} | Total Credits: {detail.effective_currency} {total_credits:,.2f}")
print(f"   -> Balance Status: {'Balanced (0.00)' if abs(total_debits - total_credits) < 0.01 else 'Unbalanced'}")

for e in detail.entries:
    print(f"       -> Line Seq {e.sequence_no}: {e.posting_entry_type:<12} | {e.dr_cr} {e.amount:>8.2f} {e.currency_code} | Narration: '{e.narration}' | Active: {e.active}")

print("\n=== Verification Successful! No Internal Server Error occurred. ===")
