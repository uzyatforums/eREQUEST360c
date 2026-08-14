from src.db import get_db
from src.db_models import MakerCheckerEntityType

db = next(get_db())

existing = db.query(MakerCheckerEntityType).filter(MakerCheckerEntityType.entity_type_code == "CARD_CHARGES_HEADER").first()
if not existing:
    db.add(MakerCheckerEntityType(entity_type_code="CARD_CHARGES_HEADER", entity_type_name="Card Charges Profile", created_by="system"))
    db.commit()
    print("Seeded 'CARD_CHARGES_HEADER' entity type in SQL Server database!")
else:
    print("'CARD_CHARGES_HEADER' entity type already exists in SQL Server database.")
