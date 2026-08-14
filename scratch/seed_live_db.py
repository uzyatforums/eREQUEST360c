import sys
import os
sys.path.insert(0, os.path.abspath("."))

from src.db import SessionLocal
from src.db_models import MakerCheckerEntityType

db = SessionLocal()
row = db.query(MakerCheckerEntityType).filter(MakerCheckerEntityType.entity_type_code == "CARD_SEGMENT_PROGRAMME_CHARGE").first()
if not row:
    print("Seeding CARD_SEGMENT_PROGRAMME_CHARGE into live database...")
    db.add(MakerCheckerEntityType(
        entity_type_code="CARD_SEGMENT_PROGRAMME_CHARGE",
        entity_type_name="Card Segment Programme Charge",
        created_by="system",
        active=True
    ))
    db.commit()
    print("Seeded successfully!")
else:
    print("CARD_SEGMENT_PROGRAMME_CHARGE already exists in live database!")
db.close()
