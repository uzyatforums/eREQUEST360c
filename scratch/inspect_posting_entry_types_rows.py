from src.db import get_db
from sqlalchemy import text

db = next(get_db())

print("=== Raw SQL: config.posting_entry_types ===")
rows = db.execute(text("SELECT * FROM config.posting_entry_types")).mappings().all()
for r in rows:
    print(dict(r))
