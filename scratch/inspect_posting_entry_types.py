from src.db import get_db
from sqlalchemy import text, inspect

db = next(get_db())
inspector = inspect(db.get_bind())

tables = inspector.get_table_names(schema="config")
print("=== All tables in schema 'config' ===")
for t in sorted(tables):
    print(f"  - {t}")

print("\n=== Unique posting_entry_type values in config.card_charge_entries ===")
types = db.execute(text("SELECT DISTINCT posting_entry_type FROM config.card_charge_entries")).scalars().all()
for tp in sorted(types):
    print(f"  - '{tp}'")
