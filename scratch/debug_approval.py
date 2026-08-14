import sys
import os
sys.path.insert(0, os.path.abspath("."))

from src.db import SessionLocal
from src.db_models import MakerCheckerWorkItem, User
from src.models import UserInfo
from src.api.maker_checker_service import MakerCheckerService

db = SessionLocal()
wi = db.query(MakerCheckerWorkItem).filter(MakerCheckerWorkItem.entity_type_code == "CARD_SEGMENT_PROGRAMME_CHARGE", MakerCheckerWorkItem.status_code == "PENDING").order_by(MakerCheckerWorkItem.id.desc()).first()
if wi:
    print(f"Found Pending Work Item: #{wi.id}, entity_id: {wi.entity_id}, created_by: {wi.created_by}")
    checker_user = UserInfo(
        user_id="controlc",
        username="controlc",
        email="controlc@apexmfb.com",
        roles=["control_checker"],
        client_id=wi.client_id
    )
    try:
        res = MakerCheckerService.approve(db, checker_user, wi.id, remarks="Testing approval")
        print("Approval Success:", res)
    except Exception as e:
        import traceback
        print("Approval EXCEPTION:")
        traceback.print_exc()
else:
    print("No pending work item found for CARD_SEGMENT_PROGRAMME_CHARGE")
db.close()
