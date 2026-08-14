from src.db import get_db
from sqlalchemy import text

db = next(get_db())

print("=== Raw SQL: config.card_charges_headers ===")
headers = db.execute(text("SELECT id, client_id, charge_name, description, active, created_by, created_date FROM config.card_charges_headers")).mappings().all()
for h in headers:
    print(dict(h))

print("\n=== Raw SQL: config.card_charge_entries ===")
entries = db.execute(text("SELECT id, client_id, charge_header_id, sequence_no, posting_account_type, dr_cr, narration, posting_account_number, posting_branch_type, posting_entry_type, amount, currency_code, active FROM config.card_charge_entries")).mappings().all()
for e in entries:
    print(dict(e))

print("\n=== Raw SQL: config.card_segment_programme_charges ===")
mappings = db.execute(text("SELECT id, client_id, card_segment_programme_id, charge_header_id, priority, active, processing_mode_code FROM config.card_segment_programme_charges")).mappings().all()
for m in mappings:
    print(dict(m))
