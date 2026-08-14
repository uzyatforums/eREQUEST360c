from src.db import get_db
from src.db_models import MakerCheckerWorkItem, CardChargesHeader

db = next(get_db())

print("=== All MakerCheckerWorkItems for CARD_CHARGES_HEADER ===")
items = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_type_code == "CARD_CHARGES_HEADER").all()
for wi in items:
    print(f"ID: {wi.id} | WorkItemNo: {wi.work_item_number} | ClientID: {wi.client_id} | EntityID: {wi.entity_id} | Op: {wi.operation_code} | Status: {wi.status_code} | Active: {wi.active} | CreatedBy: {wi.created_by} | CreatedDate: {wi.created_date}")

print("\n=== All PENDING Work Items across all entity types ===")
pendings = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.status_code == "PENDING").all()
for wi in pendings:
    print(f"ID: {wi.id} | WorkItemNo: {wi.work_item_number} | EntityType: {wi.entity_type_code} | EntityID: {wi.entity_id} | ClientID: {wi.client_id} | Op: {wi.operation_code} | Active: {wi.active} | CreatedBy: {wi.created_by}")
