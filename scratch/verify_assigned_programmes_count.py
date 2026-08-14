from src.db import get_db
from src.api.card_segments import list_card_segments

db = next(get_db())

class MockBranchService:
    def __init__(self, tenant_id):
        self.tenant_id = tenant_id
    def get_client_id(self):
        return self.tenant_id

# Tenant 1
service1 = MockBranchService(1)
segments1 = list_card_segments(q=None, active=None, branch_service=service1, db=db)
print("=== Verification of Tenant 1 GET /config/card-segments Response ===")
for seg in segments1:
    print(f"ID: {seg.id} | Code: '{seg.segment_code}' | Name: '{seg.segment_name}' | assigned_programmes_count: {seg.assigned_programmes_count}")

by_code1 = {seg.segment_code: seg.assigned_programmes_count for seg in segments1}
assert by_code1.get('BZ') == 4, f"Expected 4 for BZ, got {by_code1.get('BZ')}"
assert by_code1.get('RO') == 8, f"Expected 8 for RO, got {by_code1.get('RO')}"
print("-> Business Banking (BZ):", by_code1.get('BZ'), "(Expected: 4) - PASSED")
print("-> Royalty Banking (RO):", by_code1.get('RO'), "(Expected: 8) - PASSED")

# Tenant 2
service2 = MockBranchService(2)
segments2 = list_card_segments(q=None, active=None, branch_service=service2, db=db)
print("\n=== Verification of Tenant 2 GET /config/card-segments Response ===")
for seg in segments2:
    print(f"ID: {seg.id} | Code: '{seg.segment_code}' | Name: '{seg.segment_name}' | assigned_programmes_count: {seg.assigned_programmes_count}")

by_code2 = {seg.segment_code: seg.assigned_programmes_count for seg in segments2}
assert by_code2.get('01') == 1, f"Expected 1 for 01, got {by_code2.get('01')}"
print("-> Retail Segment (01):", by_code2.get('01'), "(Expected: 1) - PASSED")

print("\nALL BACKEND & SQL SERVER VERIFICATIONS PASSED CLEANLY!")
