import hashlib
from sqlalchemy.orm import Session
from src.db_models import (
    Client,
    Branch,
    CardProgramme,
    ClientCardPolicy,
    User,
    Role,
    CardSegment,
    CardSegmentProgramme,
    CardSegmentMember,
    Request,
    RequestStatusHistory,
    AuditEvent,
    AuditEventDetail,
    AuditSnapshot,
    ChargePostingAttempt,
    CardType,
    CardChargesHeader,
    CardChargeEntry,
    CardSegmentProgrammeCharge,
    LocalAccount,
    RequestStatus,
    RequestChannel,
    RequestCategory,
    RequestStatusTransition,
    DispatchStatus,
    DispatchType,
    Courier,
    EligibleAccountProduct,
    NochargeAccountProduct,
    NochargeProgrammeId,
    InstantCardStatus,
    InstantCardType,
    InstantInventoryMovementType,
    LocalEmailRecipient,
)
import json
from datetime import datetime, timedelta, timezone


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_data(db: Session):
    # 1. Seed Roles
    roles = [
        {"role_code": "branch_submitter", "role_name": "Branch Submitter", "description": "Branch level request submitter", "is_maker": True, "is_checker": False},
        {"role_code": "branch_authorizer", "role_name": "Branch Authorizer", "description": "Branch level request authorizer", "is_maker": False, "is_checker": True},
        {"role_code": "operations_admin_maker", "role_name": "Operations Admin Maker", "description": "Operations maker", "is_maker": True, "is_checker": False},
        {"role_code": "operations_admin_checker", "role_name": "Operations Admin Checker", "description": "Operations checker", "is_maker": False, "is_checker": True},
        {"role_code": "super_admin", "role_name": "Super Admin", "description": "Super admin access", "is_maker": True, "is_checker": True},
    ]
    for r in roles:
        if not db.query(Role).filter(Role.role_code == r["role_code"]).first():
            db.add(Role(**r))

    # 2. Seed Clients / Tenants
    clients = [
        {"tenant_id": 1, "client_name": "System Administrator Tenant", "client_code": "SYSADMIN", "created_by": "system"},
        {"tenant_id": 100, "client_name": "Apex Microfinance Bank", "client_code": "APEX_MFB", "created_by": "system"},
        {"tenant_id": 200, "client_name": "Global Fintech Group", "client_code": "GLOBAL_FT", "created_by": "system"},
    ]
    for c in clients:
        if not db.query(Client).filter(Client.tenant_id == c["tenant_id"]).first():
            db.add(Client(**c))

    db.commit()

    # Resolve Client IDs for seeding reference tables
    sys_client = db.query(Client).filter(Client.tenant_id == 1).first()
    apex_client = db.query(Client).filter(Client.tenant_id == 100).first()
    global_client = db.query(Client).filter(Client.tenant_id == 200).first()

    # 3. Seed Branches
    branches = [
        {"branch_code": "001", "branch_name": "Apex Main Branch", "client_id": apex_client.tenant_id, "created_by": "system"},
        {"branch_code": "002", "branch_name": "Apex Lekki Branch", "client_id": apex_client.tenant_id, "created_by": "system"},
        {"branch_code": "201", "branch_name": "Global Primary Branch", "client_id": global_client.tenant_id, "created_by": "system"},
    ]
    for b in branches:
        if not db.query(Branch).filter(Branch.branch_code == b["branch_code"]).first():
            db.add(Branch(**b))

    # Seed Card Types first to satisfy physical Foreign Keys
    card_types = [
        {"card_type": "VERVE", "description": "Verve Card", "client_id": apex_client.tenant_id, "active": True},
        {"card_type": "VISA", "description": "Visa Card", "client_id": apex_client.tenant_id, "active": True},
        {"card_type": "MASTERCARD", "description": "Mastercard Card", "client_id": global_client.tenant_id, "active": True},
    ]
    for ct in card_types:
        if not db.query(CardType).filter(CardType.card_type == ct["card_type"]).first():
            db.add(CardType(**ct))

    db.commit()

    # 4. Seed Card Programmes
    programmes = [
        {"id": 1, "client_id": apex_client.tenant_id, "card_programme_code": "APEX_VERVE_CLASSIC", "card_programme_name": "Apex Verve Classic", "card_type": "VERVE", "created_by": "system"},
        {"id": 2, "client_id": apex_client.tenant_id, "card_programme_code": "APEX_VISA_GOLD", "card_programme_name": "Apex Visa Gold", "card_type": "VISA", "created_by": "system"},
        {"id": 3, "client_id": global_client.tenant_id, "card_programme_code": "GLOBAL_MC_PLATINUM", "card_programme_name": "Global Mastercard Platinum", "card_type": "MASTERCARD", "created_by": "system"},
    ]
    for p in programmes:
        if not db.query(CardProgramme).filter(CardProgramme.id == p["id"]).first():
            db.add(CardProgramme(**p))

    # 5. Seed Client Card Policies
    policies = [
        {"client_id": apex_client.tenant_id, "card_policy": "one_card_per_account", "requires_approval_for_deviation": True},
        {"client_id": global_client.tenant_id, "card_policy": "one_card_per_account_per_brand", "requires_approval_for_deviation": True},
    ]
    for pol in policies:
        if not db.query(ClientCardPolicy).filter(ClientCardPolicy.client_id == pol["client_id"]).first():
            db.add(ClientCardPolicy(**pol))

    # 6. Seed Card Segments
    segments = [
        {"card_seg_grp": "01", "card_seg_name": "Retail Segment", "client_id": apex_client.tenant_id, "created_by": "system"},
        {"card_seg_grp": "02", "card_seg_name": "HNI Segment", "client_id": apex_client.tenant_id, "created_by": "system"},
    ]
    for seg in segments:
        if not db.query(CardSegment).filter(CardSegment.card_seg_grp == seg["card_seg_grp"]).first():
            db.add(CardSegment(**seg))

    db.commit()

    # 7. Seed Card Segment Programmes (linking segments to card programmes)
    seg_progs = [
        {"card_seg_grp": "01", "card_programme_id": 1, "client_id": apex_client.tenant_id, "seq": 1, "created_by": "system"},
        {"card_seg_grp": "02", "card_programme_id": 2, "client_id": apex_client.tenant_id, "seq": 1, "created_by": "system"},
    ]
    for sp in seg_progs:
        if not db.query(CardSegmentProgramme).filter(
            CardSegmentProgramme.card_seg_grp == sp["card_seg_grp"],
            CardSegmentProgramme.card_programme_id == sp["card_programme_id"]
        ).first():
            db.add(CardSegmentProgramme(**sp))

    # 8. Seed Card Segment Members (mocking account number segment mapping)
    # We will map customer account segments for eligibility logic tests
    members = [
        {"card_seg_grp": "01", "acct_seg": "10", "client_id": apex_client.tenant_id, "created_by": "system"}, # segment '10' maps to segment group '01'
        {"card_seg_grp": "02", "acct_seg": "20", "client_id": apex_client.tenant_id, "created_by": "system"}, # segment '20' maps to segment group '02'
    ]
    for m in members:
        if not db.query(CardSegmentMember).filter(
            CardSegmentMember.card_seg_grp == m["card_seg_grp"],
            CardSegmentMember.acct_seg == m["acct_seg"]
        ).first():
            db.add(CardSegmentMember(**m))


    # 8.6. Seed Card Charges headers and entries
    if not db.query(CardChargesHeader).first():
        # Verve Classic Charges
        h1 = CardChargesHeader(client_id=apex_client.tenant_id, charge_name="Verve Classic Card Charges", created_by="system")
        db.add(h1)
        db.flush()
        db.add(CardChargeEntry(header_id=h1.id, charge_type="ISSUANCE_FEE", amount=1000.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h1.id, charge_type="VAT", amount=75.00, currency="NGN"))

        # Visa Gold Charges
        h2 = CardChargesHeader(client_id=apex_client.tenant_id, charge_name="Visa Gold Card Charges", created_by="system")
        db.add(h2)
        db.flush()
        db.add(CardChargeEntry(header_id=h2.id, charge_type="ISSUANCE_FEE", amount=1500.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h2.id, charge_type="VAT", amount=112.50, currency="NGN"))

        # Mastercard Platinum Charges
        h3 = CardChargesHeader(client_id=global_client.tenant_id, charge_name="Mastercard Platinum Card Charges", created_by="system")
        db.add(h3)
        db.flush()
        db.add(CardChargeEntry(header_id=h3.id, charge_type="ISSUANCE_FEE", amount=2500.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h3.id, charge_type="VAT", amount=187.50, currency="NGN"))

        # Map Card Segment Programme Charges
        db.add(CardSegmentProgrammeCharge(client_id=apex_client.tenant_id, card_seg_grp="01", card_programme_id=1, charge_header_id=h1.id))
        db.add(CardSegmentProgrammeCharge(client_id=apex_client.tenant_id, card_seg_grp="02", card_programme_id=2, charge_header_id=h2.id))
        db.add(CardSegmentProgrammeCharge(client_id=global_client.tenant_id, card_seg_grp="02", card_programme_id=3, charge_header_id=h3.id))

    # 8.7. Seed Lookup and Mapping Tables
    # 1. Local Accounts
    local_accounts = [
        {"client_id": apex_client.tenant_id, "account_number": "1000000001", "account_name": "Apex Card Operations GL", "branch_code": "001"},
        {"client_id": global_client.tenant_id, "account_number": "2000000002", "account_name": "Global Card Settlements GL", "branch_code": "201"},
    ]
    for la in local_accounts:
        if not db.query(LocalAccount).filter(LocalAccount.account_number == la["account_number"]).first():
            db.add(LocalAccount(**la))

    # 2. Request Statuses
    req_statuses = [
        {"status_code": "PENDING", "status_name": "Pending Settlement"},
        {"status_code": "PENDING_APPROVAL", "status_name": "Pending Approval"},
        {"status_code": "PENDING_AUTHORIZATION", "status_name": "Pending Authorization"},
        {"status_code": "APPROVED", "status_name": "Approved"},
        {"status_code": "COMPLETED", "status_name": "Completed"},
        {"status_code": "HOTLISTED", "status_name": "Hotlisted"},
        {"status_code": "REJECTED", "status_name": "Rejected"},
        {"status_code": "SETTLEMENT_FAILED", "status_name": "Settlement Failed"},
    ]
    for rs in req_statuses:
        if not db.query(RequestStatus).filter(RequestStatus.status_code == rs["status_code"]).first():
            db.add(RequestStatus(**rs))

    # 3. Request Channels
    req_channels = [
        {"channel_code": "PORTAL", "channel_name": "Staff Portal"},
        {"channel_code": "MOBILE", "channel_name": "Mobile Banking App"},
        {"channel_code": "API", "channel_name": "API Integration Gateway"},
    ]
    for rc in req_channels:
        if not db.query(RequestChannel).filter(RequestChannel.channel_code == rc["channel_code"]).first():
            db.add(RequestChannel(**rc))

    # 4. Request Categories
    req_categories = [
        {"category_code": "ISSUANCE", "category_name": "New Card Issuance"},
        {"category_code": "REISSUE", "category_name": "Card Reissue"},
        {"category_code": "REPLACEMENT", "category_name": "Card Replacement"},
    ]
    for rcat in req_categories:
        if not db.query(RequestCategory).filter(RequestCategory.category_code == rcat["category_code"]).first():
            db.add(RequestCategory(**rcat))

    # 5. Request Status Transitions
    transitions = [
        {"from_status": "PENDING", "to_status": "PENDING_AUTHORIZATION", "allowed_role": "system"},
        {"from_status": "PENDING", "to_status": "PENDING_APPROVAL", "allowed_role": "system"},
        {"from_status": "PENDING_APPROVAL", "to_status": "PENDING_AUTHORIZATION", "allowed_role": "operations_admin_checker"},
        {"from_status": "PENDING_AUTHORIZATION", "to_status": "APPROVED", "allowed_role": "branch_authorizer"},
    ]
    for t in transitions:
        if not db.query(RequestStatusTransition).filter(
            RequestStatusTransition.from_status == t["from_status"],
            RequestStatusTransition.to_status == t["to_status"]
        ).first():
            db.add(RequestStatusTransition(**t))

    # 6. Dispatch Statuses
    disp_statuses = [
        {"status_code": "PREPARED", "description": "Package prepared"},
        {"status_code": "IN_TRANSIT", "description": "Package in transit"},
        {"status_code": "DELIVERED", "description": "Package delivered to branch"},
    ]
    for ds in disp_statuses:
        if not db.query(DispatchStatus).filter(DispatchStatus.status_code == ds["status_code"]).first():
            db.add(DispatchStatus(**ds))

    # 7. Dispatch Types
    disp_types = [
        {"type_code": "BRANCH_PICKUP", "description": "Collect at branch office"},
        {"type_code": "COURIER", "description": "Direct home/office delivery"},
    ]
    for dt in disp_types:
        if not db.query(DispatchType).filter(DispatchType.type_code == dt["type_code"]).first():
            db.add(DispatchType(**dt))

    # 8. Couriers
    couriers = [
        {"client_id": apex_client.tenant_id, "courier_name": "DHL Express Nigeria", "contact_email": "dhl-ops@dhl.com.ng"},
        {"client_id": apex_client.tenant_id, "courier_name": "FedEx Nigeria", "contact_email": "fedex-ops@fedex.com.ng"},
    ]
    for c in couriers:
        if not db.query(Courier).filter(Courier.courier_name == c["courier_name"]).first():
            db.add(Courier(**c))

    # 9. Eligible Account Products
    elig_prods = [
        {"client_id": apex_client.tenant_id, "product_code": "SAVINGS_10", "card_programme_id": 1},
        {"client_id": apex_client.tenant_id, "product_code": "CURRENT_20", "card_programme_id": 2},
    ]
    for ep in elig_prods:
        if not db.query(EligibleAccountProduct).filter(
            EligibleAccountProduct.product_code == ep["product_code"],
            EligibleAccountProduct.card_programme_id == ep["card_programme_id"]
        ).first():
            db.add(EligibleAccountProduct(**ep))

    # 10. No Charge Account Products
    nc_prods = [
        {"client_id": apex_client.tenant_id, "product_code": "STAFF_SAVINGS"},
    ]
    for ncp in nc_prods:
        if not db.query(NochargeAccountProduct).filter(NochargeAccountProduct.product_code == ncp["product_code"]).first():
            db.add(NochargeAccountProduct(**ncp))

    # 11. No Charge Programme IDs
    nc_progs = [
        {"client_id": apex_client.tenant_id, "card_programme_id": 1},
    ]
    for ncpr in nc_progs:
        if not db.query(NochargeProgrammeId).filter(NochargeProgrammeId.card_programme_id == ncpr["card_programme_id"]).first():
            db.add(NochargeProgrammeId(**ncpr))

    # 12. Instant Card Statuses
    inst_statuses = [
        {"status_code": "UNASSIGNED", "description": "Card in stock"},
        {"status_code": "ASSIGNED", "description": "Card linked to account"},
        {"status_code": "DAMAGED", "description": "Card flagged as unusable"},
    ]
    for ics in inst_statuses:
        if not db.query(InstantCardStatus).filter(InstantCardStatus.status_code == ics["status_code"]).first():
            db.add(InstantCardStatus(**ics))

    # 13. Instant Card Types
    inst_types = [
        {"type_code": "INSTANT_VERVE", "description": "Verve Instant Card Batch"},
        {"type_code": "INSTANT_VISA", "description": "Visa Instant Card Batch"},
    ]
    for ict in inst_types:
        if not db.query(InstantCardType).filter(InstantCardType.type_code == ict["type_code"]).first():
            db.add(InstantCardType(**ict))

    # 14. Instant Inventory Movement Types
    move_types = [
        {"movement_code": "RECEIPT", "description": "Stock received from vendor"},
        {"movement_code": "BRANCH_TRANSFER", "description": "Stock transferred to branch office"},
    ]
    for mt in move_types:
        if not db.query(InstantInventoryMovementType).filter(InstantInventoryMovementType.movement_code == mt["movement_code"]).first():
            db.add(InstantInventoryMovementType(**mt))

    # 15. Local Email Recipients
    recipients = [
        {"client_id": apex_client.tenant_id, "recipient_role": "internal_control_maker", "email_address": "control-maker@apexmfb.com"},
        {"client_id": apex_client.tenant_id, "recipient_role": "operations_admin_maker", "email_address": "ops-maker@apexmfb.com"},
    ]
    for er in recipients:
        if not db.query(LocalEmailRecipient).filter(
            LocalEmailRecipient.recipient_role == er["recipient_role"],
            LocalEmailRecipient.email_address == er["email_address"]
        ).first():
            db.add(LocalEmailRecipient(**er))

    db.commit()

    # 9. Seed Default Users
    # Seed our standard "admin" user to match existing test suite credentials (user: admin, pass: password123)
    users = [
        {
            "user_id": "admin",
            "client_id": apex_client.tenant_id,
            "branch_id": "001",
            "username": "admin",
            "email": "admin@apexmfb.com",
            "password_hash": hash_password("password123"),
            "role_code": "super_admin",
            "active": True,
            "created_by": "system",
        },
        {
            "user_id": "submitter1",
            "client_id": apex_client.tenant_id,
            "branch_id": "001",
            "username": "submitter1",
            "email": "sub1@apexmfb.com",
            "password_hash": hash_password("password123"),
            "role_code": "branch_submitter",
            "active": True,
            "created_by": "system",
        },
        {
            "user_id": "authorizer1",
            "client_id": apex_client.tenant_id,
            "branch_id": "001",
            "username": "authorizer1",
            "email": "auth1@apexmfb.com",
            "password_hash": hash_password("password123"),
            "role_code": "branch_authorizer",
            "active": True,
            "created_by": "system",
        }
    ]
    for u in users:
        if not db.query(User).filter(User.user_id == u["user_id"]).first():
            db.add(User(**u))

    db.commit()

    # 10. Seed Mock Card Requests, Status History and Audit Trails for UI demonstration
    if not db.query(Request).first():
        # Setup base times
        base_time = datetime.now(timezone.utc) - timedelta(days=2)
        
        # Request 1: PENDING (ready for settlement callback)
        req1 = Request(
            client_id=apex_client.tenant_id,
            account_number="1011122200",
            programme_id=1,
            request_status="PENDING",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Verve",
            created_date=base_time,
            status_last_updated=base_time,
            active=True
        )
        db.add(req1)
        db.flush()
        
        # History for Req 1
        db.add(RequestStatusHistory(
            request_id=req1.request_id,
            from_status=None,
            to_status="PENDING",
            action="create",
            performed_by="submitter1",
            performed_date=base_time,
            remarks="Request submitted and active policy verified."
        ))
        
        # Audit for Req 1
        ae1 = AuditEvent(
            entity_type="request",
            entity_id=req1.request_id,
            event_type_id=1001,
            event_source="API",
            performed_by="submitter1",
            branch_code="001",
            event_time=base_time,
            remarks="Request created"
        )
        db.add(ae1)
        db.flush()
        
        db.add(AuditSnapshot(
            entity_type="request",
            entity_id=req1.request_id,
            snapshot_time=base_time,
            snapshot_data=json.dumps({
                "request_id": req1.request_id,
                "client_id": req1.client_id,
                "account_number": req1.account_number,
                "programme_id": req1.programme_id,
                "request_status": req1.request_status,
                "request_branch": req1.request_branch,
                "pickup_branch": req1.pickup_branch,
                "brand": req1.brand
            }),
            event_id=ae1.event_id
        ))

        # Request 2: PENDING_AUTHORIZATION (settled, awaiting authorizer approval)
        time2_create = base_time + timedelta(hours=1)
        time2_settle = base_time + timedelta(hours=2)
        req2 = Request(
            client_id=apex_client.tenant_id,
            account_number="1033344400",
            programme_id=1,
            request_status="PENDING_AUTHORIZATION",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Verve",
            created_date=time2_create,
            status_last_updated=time2_settle,
            active=True
        )
        db.add(req2)
        db.flush()
        
        # History for Req 2
        db.add(RequestStatusHistory(
            request_id=req2.request_id,
            from_status=None,
            to_status="PENDING",
            action="create",
            performed_by="submitter1",
            performed_date=time2_create,
            remarks="Request submitted and active policy verified."
        ))
        db.add(RequestStatusHistory(
            request_id=req2.request_id,
            from_status="PENDING",
            to_status="PENDING_AUTHORIZATION",
            action="settle",
            performed_by="system",
            performed_date=time2_settle,
            remarks="Settlement status: SUCCESS"
        ))
        
        # ChargePostingAttempt for Req 2
        db.add(ChargePostingAttempt(
            request_id=req2.request_id,
            payment_ref="PAY-SIM-SEEDED22",
            amount=1500.0,
            status="SUCCESS",
            response="Seeded success response",
            created_by="system",
            created_date=time2_settle,
            last_modified_by="system",
            last_modified_date=time2_settle
        ))
        
        # Audit for Req 2
        ae2_create = AuditEvent(
            entity_type="request",
            entity_id=req2.request_id,
            event_type_id=1001,
            event_source="API",
            performed_by="submitter1",
            branch_code="001",
            event_time=time2_create,
            remarks="Request created"
        )
        db.add(ae2_create)
        db.flush()
        
        ae2_settle = AuditEvent(
            entity_type="request",
            entity_id=req2.request_id,
            event_type_id=1002,
            event_source="SYSTEM",
            performed_by="system",
            branch_code="001",
            event_time=time2_settle,
            remarks="Settlement status: SUCCESS. Charge posting succeeded."
        )
        db.add(ae2_settle)
        db.flush()
        
        db.add(AuditEventDetail(
            event_id=ae2_settle.event_id,
            column_name="request_status",
            old_value="PENDING",
            new_value="PENDING_AUTHORIZATION"
        ))
        
        db.add(AuditSnapshot(
            entity_type="request",
            entity_id=req2.request_id,
            snapshot_time=time2_settle,
            snapshot_data=json.dumps({
                "request_id": req2.request_id,
                "client_id": req2.client_id,
                "account_number": req2.account_number,
                "programme_id": req2.programme_id,
                "request_status": req2.request_status,
                "request_branch": req2.request_branch,
                "pickup_branch": req2.pickup_branch,
                "brand": req2.brand
            }),
            event_id=ae2_settle.event_id
        ))

        # Request 3: APPROVED (fully settled and authorized)
        time3_create = base_time + timedelta(hours=3)
        time3_settle = base_time + timedelta(hours=4)
        time3_approve = base_time + timedelta(hours=5)
        req3 = Request(
            client_id=apex_client.tenant_id,
            account_number="1055566600",
            programme_id=2,
            request_status="APPROVED",
            request_branch="001",
            pickup_branch="002",
            created_by="submitter1",
            brand="Visa",
            created_date=time3_create,
            status_last_updated=time3_approve,
            active=True
        )
        db.add(req3)
        db.flush()
        
        # History for Req 3
        db.add(RequestStatusHistory(
            request_id=req3.request_id,
            from_status=None,
            to_status="PENDING",
            action="create",
            performed_by="submitter1",
            performed_date=time3_create,
            remarks="Request submitted and active policy verified."
        ))
        db.add(RequestStatusHistory(
            request_id=req3.request_id,
            from_status="PENDING",
            to_status="PENDING_AUTHORIZATION",
            action="settle",
            performed_by="system",
            performed_date=time3_settle,
            remarks="Settlement status: SUCCESS"
        ))
        db.add(RequestStatusHistory(
            request_id=req3.request_id,
            from_status="PENDING_AUTHORIZATION",
            to_status="APPROVED",
            action="approve",
            performed_by="authorizer1",
            performed_date=time3_approve,
            remarks="Final branch authorization completed"
        ))
        
        # Audit for Req 3
        ae3_create = AuditEvent(
            entity_type="request",
            entity_id=req3.request_id,
            event_type_id=1001,
            event_source="API",
            performed_by="submitter1",
            branch_code="001",
            event_time=time3_create,
            remarks="Request created"
        )
        db.add(ae3_create)
        db.flush()
        
        ae3_approve = AuditEvent(
            entity_type="request",
            entity_id=req3.request_id,
            event_type_id=1003,
            event_source="API",
            performed_by="authorizer1",
            branch_code="001",
            event_time=time3_approve,
            remarks="Final branch authorization completed"
        )
        db.add(ae3_approve)
        db.flush()
        
        db.add(AuditEventDetail(
            event_id=ae3_approve.event_id,
            column_name="request_status",
            old_value="PENDING_AUTHORIZATION",
            new_value="APPROVED"
        ))
        
        db.add(AuditSnapshot(
            entity_type="request",
            entity_id=req3.request_id,
            snapshot_time=time3_approve,
            snapshot_data=json.dumps({
                "request_id": req3.request_id,
                "client_id": req3.client_id,
                "account_number": req3.account_number,
                "programme_id": req3.programme_id,
                "request_status": req3.request_status,
                "request_branch": req3.request_branch,
                "pickup_branch": req3.pickup_branch,
                "brand": req3.brand
            }),
            event_id=ae3_approve.event_id
        ))

        # Request 4: PENDING_APPROVAL (awaiting policy deviation approval)
        time4_create = base_time + timedelta(hours=6)
        req4 = Request(
            client_id=apex_client.tenant_id,
            account_number="1077788800",
            programme_id=2,
            request_status="PENDING_APPROVAL",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Visa",
            created_date=time4_create,
            status_last_updated=time4_create,
            active=True
        )
        db.add(req4)
        db.flush()
        
        # History for Req 4
        db.add(RequestStatusHistory(
            request_id=req4.request_id,
            from_status=None,
            to_status="PENDING_APPROVAL",
            action="create",
            performed_by="submitter1",
            performed_date=time4_create,
            remarks="Request created - requires approval for policy deviation."
        ))
        
        # Audit for Req 4
        ae4_create = AuditEvent(
            entity_type="request",
            entity_id=req4.request_id,
            event_type_id=1001,
            event_source="API",
            performed_by="submitter1",
            branch_code="001",
            event_time=time4_create,
            remarks="Request created (policy deviation: duplicate card approval pending)"
        )
        db.add(ae4_create)
        db.flush()
        
        db.add(AuditSnapshot(
            entity_type="request",
            entity_id=req4.request_id,
            snapshot_time=time4_create,
            snapshot_data=json.dumps({
                "request_id": req4.request_id,
                "client_id": req4.client_id,
                "account_number": req4.account_number,
                "programme_id": req4.programme_id,
                "request_status": req4.request_status,
                "request_branch": req4.request_branch,
                "pickup_branch": req4.pickup_branch,
                "brand": req4.brand
            }),
            event_id=ae4_create.event_id
        ))

    db.commit()
