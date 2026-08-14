from src.db import get_db
from sqlalchemy import text

db = next(get_db())

print("=== Raw SQL: config.posting_branch_types ===")
types = db.execute(text("SELECT * FROM config.posting_branch_types")).mappings().all()
for t in types:
    print(dict(t))
