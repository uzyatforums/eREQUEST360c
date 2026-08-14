import sys
import os
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from src.db import SessionLocal

db = SessionLocal()
try:
    events = db.execute(text("SELECT event_type_id, event_code, description FROM audit.audit_event_types")).mappings().all()
    print("=== LIVE SQL SERVER: audit.audit_event_types ===")
    for e in events[:30]:
        print(f"Code ({len(e['event_code'])}): '{e['event_code']}' | Description: '{e['description']}'")
except Exception as err:
    print("Error querying audit.audit_event_types:", err)
db.close()
