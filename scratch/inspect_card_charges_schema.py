from src.db import get_db
from sqlalchemy import inspect
from src.db_models import CardChargesHeader, CardChargeEntry, CardSegmentProgrammeCharge

db = next(get_db())
inspector = inspect(db.get_bind())

for table_name in ["card_charges_headers", "card_charge_entries", "card_segment_programme_charges"]:
    print(f"\n================ Table: config.{table_name} ================")
    columns = inspector.get_columns(table_name, schema="config")
    for col in columns:
        print(f"  Column: {col['name']:<25} Type: {str(col['type']):<20} Nullable: {col['nullable']}")
    
    pks = inspector.get_pk_constraint(table_name, schema="config")
    print(f"  Primary Keys: {pks.get('constrained_columns')}")
    
    fks = inspector.get_foreign_keys(table_name, schema="config")
    for fk in fks:
        print(f"  FK: {fk['constrained_columns']} -> {fk['referred_schema']}.{fk['referred_table']}.{fk['referred_columns']}")

print("\n================ Seeded Charges Data in SQL Server ================")
headers = db.query(CardChargesHeader).all()
for h in headers:
    print(f"\nHeader ID: {h.id} | Name: '{h.charge_name}' | Client ID: {h.client_id} | Active: {h.active} | Created By: {h.created_by}")
    entries = db.query(CardChargeEntry).filter(CardChargeEntry.header_id == h.id).all()
    for e in entries:
        print(f"   -> Entry ID: {e.id} | Type: {e.charge_type:<15} | Amount: {e.amount:>8.2f} {e.currency:<3} | Active: {e.active}")

print("\n================ Segment Programme Charges Mappings ================")
spcs = db.query(CardSegmentProgrammeCharge).all()
for spc in spcs:
    print(f"Mapping ID: {spc.id} | Client ID: {spc.client_id} | CSP ID: {spc.card_segment_programme_id} | Charge Header ID: {spc.charge_header_id} | Mode: {spc.processing_mode_code} | Active: {spc.active}")
