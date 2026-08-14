import sys
from src.db import get_db
from src.db_models import CardSegment, CardSegmentProgramme

db = next(get_db())

segments = db.query(CardSegment).all()
print("=== Card Segments in DB ===")
for seg in segments:
    count_sql = db.query(CardSegmentProgramme).filter(
        CardSegmentProgramme.segment_id == seg.id,
        CardSegmentProgramme.active == True
    ).count()
    total_sql = db.query(CardSegmentProgramme).filter(
        CardSegmentProgramme.segment_id == seg.id
    ).count()
    print(f"Segment ID: {seg.id}, Code: '{seg.segment_code}', Name: '{seg.segment_name}', Client ID: {seg.client_id}")
    print(f"  -> CardSegmentProgramme active count in DB: {count_sql}")
    print(f"  -> CardSegmentProgramme total count in DB: {total_sql}")

print("\n=== All CardSegmentProgrammes in DB ===")
sp_rows = db.query(CardSegmentProgramme).all()
for sp in sp_rows:
    print(f"ID: {sp.id}, Segment ID: {sp.segment_id}, Programme ID: {sp.card_programme_id}, Active: {sp.active}, Client ID: {sp.client_id}")
