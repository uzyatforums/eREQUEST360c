import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from src.db_models import (
    Client,
    Branch,
    CardProgramme,
    ClientCardPolicy,
    User,
    Role,
    Permission,
    RolePermission,
    CardSegment,
    CardSegmentProgramme,
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

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_data(db: Session):
    # 1. Seed Roles
    logger.info("Seeding roles...")
    roles = [
        {"role_code": "branch_submitter", "role_name": "Branch Submitter", "description": "Branch level request submitter", "is_maker": True, "is_checker": False},
        {"role_code": "branch_authorizer", "role_name": "Branch Authorizer", "description": "Branch level request authorizer", "is_maker": False, "is_checker": True},
        {"role_code": "operations_admin_maker", "role_name": "Operations Admin Maker", "description": "Operations maker", "is_maker": True, "is_checker": False},
        {"role_code": "operations_admin_checker", "role_name": "Operations Admin Checker", "description": "Operations checker", "is_maker": False, "is_checker": True},
        {"role_code": "super_admin", "role_name": "Super Admin", "description": "Super admin access", "is_maker": True, "is_checker": True},
    ]
    roles_added = 0
    for r in roles:
        existing = db.query(Role).filter(Role.role_code == r["role_code"]).first()
        if not existing:
            db.add(Role(**r))
            roles_added += 1
        else:
            for k, v in r.items():
                setattr(existing, k, v)
    db.commit()
    logger.info(f"Roles seeded successfully ({roles_added} new roles added).")

    # 2. Seed Clients / Tenants
    logger.info("Seeding clients...")
    clients = [
        {"tenant_id": 1, "client_name": "System Administrator Tenant", "client_code": "SYSADMIN", "created_by": "system"},
        {"tenant_id": 100, "client_name": "Apex Microfinance Bank", "client_code": "APEX_MFB", "created_by": "system"},
        {"tenant_id": 200, "client_name": "Global Fintech Group", "client_code": "GLOBAL_FT", "created_by": "system"},
    ]
    clients_added = 0
    for c in clients:
        existing = db.query(Client).filter(
            (Client.client_code == c["client_code"]) | (Client.tenant_id == c["tenant_id"])
        ).first()
        if not existing:
            db.add(Client(**c))
            clients_added += 1
    db.commit()
    logger.info(f"Clients seeded successfully ({clients_added} new clients added).")

    # Resolve Client tenant_ids dynamically for FK references
    sys_client = db.query(Client).filter((Client.client_code == "SYSADMIN") | (Client.client_code == "UBN") | (Client.tenant_id == 1)).first()
    apex_client = db.query(Client).filter((Client.client_code == "APEX_MFB") | (Client.tenant_id == 100) | (Client.tenant_id == 2)).first()
    global_client = db.query(Client).filter((Client.client_code == "GLOBAL_FT") | (Client.tenant_id == 200) | (Client.tenant_id == 3)).first()

    sys_tenant_id = sys_client.tenant_id if sys_client else 1
    apex_tenant_id = apex_client.tenant_id if apex_client else 100
    global_tenant_id = global_client.tenant_id if global_client else 200

    # 3. Seed Permissions & Role Permissions before users
    logger.info("Seeding permissions...")
    permissions = [
        {"permission_code": "request.create", "module_name": "REQUEST", "permission_name": "Create Card Request", "description": "Can create new card issuance requests"},
        {"permission_code": "request.authorize", "module_name": "REQUEST", "permission_name": "Authorize Card Request", "description": "Can authorize branch card requests"},
        {"permission_code": "request.approve", "module_name": "REQUEST", "permission_name": "Approve Card Request", "description": "Can approve policy deviations"},
        {"permission_code": "request.view", "module_name": "REQUEST", "permission_name": "View Card Requests", "description": "Can view card requests"},
        {"permission_code": "request.hotlist", "module_name": "REQUEST", "permission_name": "Hotlist Card", "description": "Can hotlist cards"},
        {"permission_code": "config.view", "module_name": "CONFIG", "permission_name": "View System Configuration", "description": "Can view system configurations"},
        {"permission_code": "config.manage", "module_name": "CONFIG", "permission_name": "Manage System Configuration", "description": "Can manage system configurations"},
        {"permission_code": "user.manage", "module_name": "IAM", "permission_name": "Manage Users and Roles", "description": "Can create and modify users and roles"},
    ]
    perms_added = 0
    for p in permissions:
        existing = db.query(Permission).filter(Permission.permission_code == p["permission_code"]).first()
        if not existing:
            db.add(Permission(**p))
            perms_added += 1
        else:
            for k, v in p.items():
                setattr(existing, k, v)
    db.commit()
    logger.info(f"Permissions seeded successfully ({perms_added} new permissions added).")

    logger.info("Seeding role permissions...")
    role_perms = [
        # super_admin
        {"role_code": "super_admin", "permission_code": "request.create"},
        {"role_code": "super_admin", "permission_code": "request.authorize"},
        {"role_code": "super_admin", "permission_code": "request.approve"},
        {"role_code": "super_admin", "permission_code": "request.view"},
        {"role_code": "super_admin", "permission_code": "request.hotlist"},
        {"role_code": "super_admin", "permission_code": "config.view"},
        {"role_code": "super_admin", "permission_code": "config.manage"},
        {"role_code": "super_admin", "permission_code": "user.manage"},
        # branch_submitter
        {"role_code": "branch_submitter", "permission_code": "request.create"},
        {"role_code": "branch_submitter", "permission_code": "request.view"},
        # branch_authorizer
        {"role_code": "branch_authorizer", "permission_code": "request.authorize"},
        {"role_code": "branch_authorizer", "permission_code": "request.view"},
        # operations_admin_maker
        {"role_code": "operations_admin_maker", "permission_code": "request.create"},
        {"role_code": "operations_admin_maker", "permission_code": "request.view"},
        {"role_code": "operations_admin_maker", "permission_code": "config.view"},
        # operations_admin_checker
        {"role_code": "operations_admin_checker", "permission_code": "request.approve"},
        {"role_code": "operations_admin_checker", "permission_code": "request.view"},
        {"role_code": "operations_admin_checker", "permission_code": "config.manage"},
    ]
    rp_added = 0
    for rp in role_perms:
        existing = db.query(RolePermission).filter(
            RolePermission.role_code == rp["role_code"],
            RolePermission.permission_code == rp["permission_code"]
        ).first()
        if not existing:
            db.add(RolePermission(**rp, created_by="system"))
            rp_added += 1
    db.commit()
    logger.info(f"Role permissions seeded successfully ({rp_added} new links added).")

    # 4. Seed Default Users
    logger.info("Seeding users...")
    users = [
        {
            "user_id": "admin",
            "client_id": apex_tenant_id,
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
            "client_id": apex_tenant_id,
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
            "client_id": apex_tenant_id,
            "branch_id": "001",
            "username": "authorizer1",
            "email": "auth1@apexmfb.com",
            "password_hash": hash_password("password123"),
            "role_code": "branch_authorizer",
            "active": True,
            "created_by": "system",
        }
    ]
    users_added = 0
    for u in users:
        existing = db.query(User).filter((User.user_id == u["user_id"]) | (User.username == u["username"])).first()
        if not existing:
            db.add(User(**u))
            users_added += 1
        else:
            for field, val in u.items():
                setattr(existing, field, val)
    db.commit()
    logger.info(f"Users seeded successfully ({users_added} new users added).")

    # 5. Seed Branches
    logger.info("Seeding branches...")
    branches = [
        {"branch_code": "001", "branch_name": "Apex Main Branch", "client_id": apex_tenant_id, "created_by": "system"},
        {"branch_code": "002", "branch_name": "Apex Lekki Branch", "client_id": apex_tenant_id, "created_by": "system"},
        {"branch_code": "201", "branch_name": "Global Primary Branch", "client_id": global_tenant_id, "created_by": "system"},
    ]
    for b in branches:
        if not db.query(Branch).filter(Branch.branch_code == b["branch_code"]).first():
            db.add(Branch(**b))

    # Seed Card Types
    logger.info("Seeding card types...")
    card_types = [
        {"card_type": "VERVE", "description": "Verve Card", "client_id": apex_tenant_id, "active": True},
        {"card_type": "VISA", "description": "Visa Card", "client_id": apex_tenant_id, "active": True},
        {"card_type": "MASTERCARD", "description": "Mastercard Card", "client_id": global_tenant_id, "active": True},
    ]
    for ct in card_types:
        if not db.query(CardType).filter(CardType.card_type == ct["card_type"]).first():
            db.add(CardType(**ct))

    db.commit()

    # 6. Seed Card Programmes
    logger.info("Seeding card programmes...")
    programmes = [
        {
            "id": 1,
            "client_id": apex_tenant_id,
            "card_programme_code": "APEX_VERVE_CLASSIC",
            "card_programme_name": "Apex Verve Classic",
            "card_type": "VERVE",
            "bin": "506118",
            "platform_indicator": "POSTILION_V2",
            "pan_length": 16,
            "service_code": "201",
            "default_validity_years": 3,
            "currency": "NGN",
            "issuance_fee": 1000.0,
            "maintenance_fee": 250.0,
            "account_type_binding": "SAVINGS_CURRENT",
            "created_by": "system",
        },
        {
            "id": 2,
            "client_id": apex_tenant_id,
            "card_programme_code": "APEX_VISA_GOLD",
            "card_programme_name": "Apex Visa Gold",
            "card_type": "VISA",
            "bin": "412345",
            "platform_indicator": "POSTILION_V2",
            "pan_length": 16,
            "service_code": "201",
            "default_validity_years": 3,
            "currency": "NGN",
            "issuance_fee": 1500.0,
            "maintenance_fee": 500.0,
            "account_type_binding": "SAVINGS_CURRENT",
            "created_by": "system",
        },
        {
            "id": 3,
            "client_id": global_tenant_id,
            "card_programme_code": "GLOBAL_MC_PLATINUM",
            "card_programme_name": "Global Mastercard Platinum",
            "card_type": "MASTERCARD",
            "bin": "512345",
            "platform_indicator": "POSTILION_V2",
            "pan_length": 16,
            "service_code": "201",
            "default_validity_years": 5,
            "currency": "USD",
            "issuance_fee": 2500.0,
            "maintenance_fee": 1000.0,
            "account_type_binding": "SAVINGS_CURRENT",
            "created_by": "system",
        },
    ]
    for p in programmes:
        existing = db.query(CardProgramme).filter((CardProgramme.id == p["id"]) | (CardProgramme.card_programme_code == p["card_programme_code"])).first()
        if not existing:
            db.add(CardProgramme(**p))
        else:
            for field, val in p.items():
                setattr(existing, field, val)
    db.commit()

    # 7. Seed Client Card Policies
    logger.info("Seeding client card policies...")
    policies = [
        {"client_id": apex_tenant_id, "card_policy": "one_card_per_account", "requires_approval_for_deviation": True},
        {"client_id": global_tenant_id, "card_policy": "one_card_per_account_per_brand", "requires_approval_for_deviation": True},
    ]
    for pol in policies:
        if not db.query(ClientCardPolicy).filter(ClientCardPolicy.client_id == pol["client_id"]).first():
            db.add(ClientCardPolicy(**pol))

    # 8. Seed Card Segments
    logger.info("Seeding card segments...")
    segments = [
        {"segment_code": "01", "segment_name": "Retail Segment", "client_id": apex_tenant_id, "priority": 1, "created_by": "system"},
        {"segment_code": "02", "segment_name": "HNI Segment", "client_id": apex_tenant_id, "priority": 2, "created_by": "system"},
    ]
    for seg in segments:
        if not db.query(CardSegment).filter(CardSegment.segment_code == seg["segment_code"]).first():
            db.add(CardSegment(**seg))

    db.commit()

    seg1 = db.query(CardSegment).filter(CardSegment.segment_code == "01").first()
    seg2 = db.query(CardSegment).filter(CardSegment.segment_code == "02").first()
    seg1_id = seg1.id if seg1 else 1
    seg2_id = seg2.id if seg2 else 2

    prog1 = db.query(CardProgramme).filter(CardProgramme.card_programme_code == "APEX_VERVE_CLASSIC").first()
    prog2 = db.query(CardProgramme).filter(CardProgramme.card_programme_code == "APEX_VISA_GOLD").first()
    prog1_id = prog1.id if prog1 else 1
    prog2_id = prog2.id if prog2 else 2

    # Card Segment Programmes
    seg_progs = [
        {"segment_id": seg1_id, "card_programme_id": prog1_id, "client_id": apex_tenant_id, "priority": 1, "created_by": "system"},
        {"segment_id": seg2_id, "card_programme_id": prog2_id, "client_id": apex_tenant_id, "priority": 1, "created_by": "system"},
    ]
    for sp in seg_progs:
        if not db.query(CardSegmentProgramme).filter(
            CardSegmentProgramme.segment_id == sp["segment_id"],
            CardSegmentProgramme.card_programme_id == sp["card_programme_id"]
        ).first():
            db.add(CardSegmentProgramme(**sp))

    # 9. Seed Card Charges headers and entries
    logger.info("Seeding card charges...")
    if not db.query(CardChargesHeader).first():
        h1 = CardChargesHeader(client_id=apex_tenant_id, charge_name="Verve Classic Card Charges", created_by="system")
        db.add(h1)
        db.flush()
        db.add(CardChargeEntry(header_id=h1.id, charge_type="ISSUANCE_FEE", amount=1000.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h1.id, charge_type="VAT", amount=75.00, currency="NGN"))

        h2 = CardChargesHeader(client_id=apex_tenant_id, charge_name="Visa Gold Card Charges", created_by="system")
        db.add(h2)
        db.flush()
        db.add(CardChargeEntry(header_id=h2.id, charge_type="ISSUANCE_FEE", amount=1500.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h2.id, charge_type="VAT", amount=112.50, currency="NGN"))

        h3 = CardChargesHeader(client_id=global_tenant_id, charge_name="Mastercard Platinum Card Charges", created_by="system")
        db.add(h3)
        db.flush()
        db.add(CardChargeEntry(header_id=h3.id, charge_type="ISSUANCE_FEE", amount=2500.00, currency="NGN"))
        db.add(CardChargeEntry(header_id=h3.id, charge_type="VAT", amount=187.50, currency="NGN"))

        csp1 = db.query(CardSegmentProgramme).filter(CardSegmentProgramme.card_programme_id == prog1_id).first()
        csp2 = db.query(CardSegmentProgramme).filter(CardSegmentProgramme.card_programme_id == prog2_id).first()
        csp3 = db.query(CardSegmentProgramme).filter(CardSegmentProgramme.card_programme_id == 3).first()
        if csp1:
            db.add(CardSegmentProgrammeCharge(client_id=apex_tenant_id, card_segment_programme_id=csp1.id, charge_header_id=h1.id, created_by="system"))
        if csp2:
            db.add(CardSegmentProgrammeCharge(client_id=apex_tenant_id, card_segment_programme_id=csp2.id, charge_header_id=h2.id, created_by="system"))
        if csp3:
            db.add(CardSegmentProgrammeCharge(client_id=global_tenant_id, card_segment_programme_id=csp3.id, charge_header_id=h3.id, created_by="system"))

    # 10. Seed Lookup and Mapping Tables
    logger.info("Seeding reference and lookup tables...")
    local_accounts = [
        {"client_id": apex_tenant_id, "account_number": "1000000001", "account_name": "Apex Card Operations GL", "branch_code": "001"},
        {"client_id": global_tenant_id, "account_number": "2000000002", "account_name": "Global Card Settlements GL", "branch_code": "201"},
    ]
    for la in local_accounts:
        if not db.query(LocalAccount).filter(LocalAccount.account_number == la["account_number"]).first():
            db.add(LocalAccount(**la))

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

    req_channels = [
        {"channel_code": "PORTAL", "channel_name": "Staff Portal"},
        {"channel_code": "MOBILE", "channel_name": "Mobile Banking App"},
        {"channel_code": "API", "channel_name": "API Integration Gateway"},
    ]
    for rc in req_channels:
        if not db.query(RequestChannel).filter(RequestChannel.channel_code == rc["channel_code"]).first():
            db.add(RequestChannel(**rc))

    req_categories = [
        {"category_code": "ISSUANCE", "category_name": "New Card Issuance"},
        {"category_code": "REISSUE", "category_name": "Card Reissue"},
        {"category_code": "REPLACEMENT", "category_name": "Card Replacement"},
    ]
    for rcat in req_categories:
        if not db.query(RequestCategory).filter(RequestCategory.category_code == rcat["category_code"]).first():
            db.add(RequestCategory(**rcat))

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

    disp_statuses = [
        {"status_code": "PREPARED", "description": "Package prepared"},
        {"status_code": "IN_TRANSIT", "description": "Package in transit"},
        {"status_code": "DELIVERED", "description": "Package delivered to branch"},
    ]
    for ds in disp_statuses:
        if not db.query(DispatchStatus).filter(DispatchStatus.status_code == ds["status_code"]).first():
            db.add(DispatchStatus(**ds))

    disp_types = [
        {"type_code": "BRANCH_PICKUP", "description": "Collect at branch office"},
        {"type_code": "COURIER", "description": "Direct home/office delivery"},
    ]
    for dt in disp_types:
        if not db.query(DispatchType).filter(DispatchType.type_code == dt["type_code"]).first():
            db.add(DispatchType(**dt))

    couriers = [
        {"client_id": apex_tenant_id, "courier_name": "DHL Express Nigeria", "contact_email": "dhl-ops@dhl.com.ng"},
        {"client_id": apex_tenant_id, "courier_name": "FedEx Nigeria", "contact_email": "fedex-ops@fedex.com.ng"},
    ]
    for c in couriers:
        if not db.query(Courier).filter(Courier.courier_name == c["courier_name"]).first():
            db.add(Courier(**c))

    elig_prods = [
        {"client_id": apex_tenant_id, "product_code": "SAVINGS_10", "card_programme_id": prog1_id},
        {"client_id": apex_tenant_id, "product_code": "CURRENT_20", "card_programme_id": prog2_id},
    ]
    for ep in elig_prods:
        if not db.query(EligibleAccountProduct).filter(
            EligibleAccountProduct.product_code == ep["product_code"],
            EligibleAccountProduct.card_programme_id == ep["card_programme_id"]
        ).first():
            db.add(EligibleAccountProduct(**ep))

    nc_prods = [
        {"client_id": apex_tenant_id, "product_code": "STAFF_SAVINGS"},
    ]
    for ncp in nc_prods:
        if not db.query(NochargeAccountProduct).filter(NochargeAccountProduct.product_code == ncp["product_code"]).first():
            db.add(NochargeAccountProduct(**ncp))

    nc_progs = [
        {"client_id": apex_tenant_id, "card_programme_id": prog1_id},
    ]
    for ncpr in nc_progs:
        if not db.query(NochargeProgrammeId).filter(NochargeProgrammeId.card_programme_id == ncpr["card_programme_id"]).first():
            db.add(NochargeProgrammeId(**ncpr))

    inst_statuses = [
        {"status_code": "UNASSIGNED", "description": "Card in stock"},
        {"status_code": "ASSIGNED", "description": "Card linked to account"},
        {"status_code": "DAMAGED", "description": "Card flagged as unusable"},
    ]
    for ics in inst_statuses:
        if not db.query(InstantCardStatus).filter(InstantCardStatus.status_code == ics["status_code"]).first():
            db.add(InstantCardStatus(**ics))

    inst_types = [
        {"type_code": "INSTANT_VERVE", "description": "Verve Instant Card Batch"},
        {"type_code": "INSTANT_VISA", "description": "Visa Instant Card Batch"},
    ]
    for ict in inst_types:
        if not db.query(InstantCardType).filter(InstantCardType.type_code == ict["type_code"]).first():
            db.add(InstantCardType(**ict))

    move_types = [
        {"movement_code": "RECEIPT", "description": "Stock received from vendor"},
        {"movement_code": "BRANCH_TRANSFER", "description": "Stock transferred to branch office"},
    ]
    for mt in move_types:
        if not db.query(InstantInventoryMovementType).filter(InstantInventoryMovementType.movement_code == mt["movement_code"]).first():
            db.add(InstantInventoryMovementType(**mt))

    recipients = [
        {"client_id": apex_tenant_id, "recipient_role": "internal_control_maker", "email_address": "control-maker@apexmfb.com"},
        {"client_id": apex_tenant_id, "recipient_role": "operations_admin_maker", "email_address": "ops-maker@apexmfb.com"},
    ]
    for er in recipients:
        if not db.query(LocalEmailRecipient).filter(
            LocalEmailRecipient.recipient_role == er["recipient_role"],
            LocalEmailRecipient.email_address == er["email_address"]
        ).first():
            db.add(LocalEmailRecipient(**er))

    db.commit()

    # 11. Seed Mock Card Requests for UI demonstration if none exist
    logger.info("Seeding mock card requests...")
    if not db.query(Request).first():
        base_time = datetime.now(timezone.utc) - timedelta(days=2)
        req1 = Request(
            client_id=apex_tenant_id,
            account_number="1011122200",
            programme_id=prog1_id,
            request_status="PENDING",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Verve",
            created_date=base_time,
            status_last_updated=base_time,
            active=True,
            processing_mode_code="NORMAL",
            request_type_code="ISSUANCE",

        )
        db.add(req1)
        db.flush()
        
        db.add(RequestStatusHistory(
            request_id=req1.request_id,
            from_status=None,
            to_status="PENDING",
            action="create",
            performed_by="submitter1",
            performed_date=base_time,
            remarks="Request submitted and active policy verified."
        ))
        
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

        time2_create = base_time + timedelta(hours=1)
        time2_settle = base_time + timedelta(hours=2)
        req2 = Request(
            client_id=apex_tenant_id,
            account_number="1033344400",
            programme_id=prog1_id,
            request_status="PENDING_AUTHORIZATION",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Verve",
            created_date=time2_create,
            status_last_updated=time2_settle,
            active=True,
            processing_mode_code="NORMAL",
            request_type_code="ISSUANCE",

        )
        db.add(req2)
        db.flush()
        
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

        time3_create = base_time + timedelta(hours=3)
        time3_settle = base_time + timedelta(hours=4)
        time3_approve = base_time + timedelta(hours=5)
        req3 = Request(
            client_id=apex_tenant_id,
            account_number="1055566600",
            programme_id=prog2_id,
            request_status="APPROVED",
            request_branch="001",
            pickup_branch="002",
            created_by="submitter1",
            brand="Visa",
            created_date=time3_create,
            status_last_updated=time3_approve,
            active=True,
            processing_mode_code="NORMAL",
            request_type_code="ISSUANCE",

        )
        db.add(req3)
        db.flush()
        
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

        time4_create = base_time + timedelta(hours=6)
        req4 = Request(
            client_id=apex_tenant_id,
            account_number="1077788800",
            programme_id=prog2_id,
            request_status="PENDING_APPROVAL",
            request_branch="001",
            pickup_branch="001",
            created_by="submitter1",
            brand="Visa",
            created_date=time4_create,
            status_last_updated=time4_create,
            active=True,
            processing_mode_code="NORMAL",
            request_type_code="ISSUANCE",

        )

        db.add(req4)
        db.flush()
        
        db.add(RequestStatusHistory(
            request_id=req4.request_id,
            from_status=None,
            to_status="PENDING_APPROVAL",
            action="create",
            performed_by="submitter1",
            performed_date=time4_create,
            remarks="Request created - requires approval for policy deviation."
        ))
        
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
    logger.info("Database seeding process finished successfully.")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    logger.info("=== Starting eREQUEST 360 Database Seeding Process ===")
    from src.db import engine, SessionLocal
    from src.db_models import Base

    logger.info(f"Target Database: {engine.url.database} (driver: {engine.url.drivername})")

    # Ensure missing tables exist
    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    try:
        seed_data(session)
        logger.info("=== Database Seeding Completed Successfully ===")
    except Exception as e:
        logger.error(f"Seeding failed with error: {e}", exc_info=True)
        session.rollback()
        raise
    finally:
        session.close()
