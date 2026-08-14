import sys
import os
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from src.db import SessionLocal

db = SessionLocal()
try:
    cols = db.execute(text("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'config' AND TABLE_NAME = 'processing_modes'")).mappings().all()
    print("=== LIVE SQL SERVER: config.processing_modes COLUMNS ===")
    for c in cols:
        print(f"Column: {c['COLUMN_NAME']} | Type: {c['DATA_TYPE']} | Nullable: {c['IS_NULLABLE']}")
except Exception as err:
    print("Error querying columns:", err)
db.close()
