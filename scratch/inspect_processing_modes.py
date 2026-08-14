import sys
import os
sys.path.insert(0, os.path.abspath("."))

from sqlalchemy import text
from src.db import SessionLocal

db = SessionLocal()
try:
    modes = db.execute(text("SELECT processing_mode_code, processing_mode_name, active FROM config.processing_modes")).mappings().all()
    print("=== LIVE SQL SERVER: config.processing_modes ===")
    for m in modes:
        print(f"Code: '{m['processing_mode_code']}' | Name: '{m['processing_mode_name']}' | Active: {m['active']}")
except Exception as e:
    print("Error querying config.processing_modes:", e)
db.close()
