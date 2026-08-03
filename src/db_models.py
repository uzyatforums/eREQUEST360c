import os
from sqlalchemy import Column, Integer, String, DateTime, BigInteger, Boolean, Numeric, func, ForeignKey
from src.db import Base

def schema_args(schema_name: str):
    db_url = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    if db_url.startswith("sqlite"):
        return {}
    return {"schema": schema_name}


def fk_ref(target: str) -> str:
    db_url = os.getenv("DATABASE_URL", "sqlite:///./dev.db")
    if db_url.startswith("sqlite"):
        if "." in target:
            parts = target.split(".")
            if len(parts) == 3:
                return f"{parts[1]}.{parts[2]}"
    return target



class ClientCardPolicy(Base):
    __tablename__ = "client_card_policies"
    __table_args__ = schema_args("request")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False, unique=True)
    card_policy = Column(String(50), nullable=False, default="one_card_per_account")
    requires_approval_for_deviation = Column(Boolean, nullable=False, default=True)


class Request(Base):
    __tablename__ = "requests"
    __table_args__ = schema_args("request")

    request_id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    account_number = Column(String(30), nullable=False)
    programme_id = Column(Integer, nullable=False)
    request_status = Column(String(30), nullable=False)
    request_branch = Column(String(10), nullable=False)
    pickup_branch = Column(String(10), nullable=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    status_last_updated = Column(DateTime, nullable=False, server_default=func.now())
    channel_id = Column(Integer, nullable=True)
    category_id = Column(Integer, nullable=True)
    source_type = Column(String(20), nullable=True)
    source_reference = Column(BigInteger, nullable=True)
    brand = Column(String(50), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    processing_mode_code = Column(String(30), nullable=True, default="NORMAL")
    request_type_code = Column(String(30), nullable=True, default="ISSUANCE")




class User(Base):
    __tablename__ = "users"
    __table_args__ = schema_args("iam")

    user_id = Column(String(31), primary_key=True)
    client_id = Column(Integer, nullable=True)
    branch_id = Column(String(10), nullable=True)
    username = Column(String(100), nullable=False)
    email = Column(String(64), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role_code = Column(String(50), nullable=False)
    phone_1 = Column(String(20), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = schema_args("iam")

    role_code = Column(String(50), primary_key=True)
    role_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    is_maker = Column(Boolean, nullable=False, default=False)
    is_checker = Column(Boolean, nullable=False, default=False)
    active = Column(Boolean, nullable=False, default=True)


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = schema_args("iam")

    permission_code = Column(String(100), primary_key=True)
    module_name = Column(String(50), nullable=True)
    permission_name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = schema_args("iam")

    role_code = Column(String(50), primary_key=True)
    permission_code = Column(String(100), primary_key=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)



class Client(Base):
    __tablename__ = "clients"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    tenant_id = Column(Integer, nullable=False, unique=True)
    client_name = Column(String(255), nullable=False)
    client_code = Column(String(50), nullable=False, unique=True)
    parent_client_id = Column(Integer, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    contact_email = Column(String(255), nullable=True)
    contact_phone = Column(String(20), nullable=True)
    address = Column(String(255), nullable=True)
    country = Column(String(50), nullable=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class Branch(Base):
    __tablename__ = "branches"
    __table_args__ = schema_args("config")

    branch_code = Column(String(10), primary_key=True)
    branch_name = Column(String(100), nullable=False)
    client_id = Column(Integer, nullable=False)
    state_code = Column(String(10), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class State(Base):
    __tablename__ = "states"
    __table_args__ = schema_args("config")

    state_code = Column(String(10), primary_key=True)
    state_name = Column(String(50), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class CardProgramme(Base):
    __tablename__ = "card_programmes"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    card_programme_code = Column(String(35), nullable=False)
    card_programme_name = Column(String(100), nullable=False)
    card_type = Column(String(20), ForeignKey(fk_ref("config.card_types.card_type")), nullable=False)
    priority = Column(Integer, nullable=True, default=1)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)
    description = Column(String(255), nullable=True)
    service_code = Column(String(10), nullable=True)
    default_validity_years = Column(Integer, nullable=True, default=3)
    currency = Column(String(3), nullable=True, default="NGN")
    issuance_fee = Column(Numeric(18, 2), nullable=True, default=1000.0)
    maintenance_fee = Column(Numeric(18, 2), nullable=True, default=250.0)
    account_type_binding = Column(String(50), nullable=True, default="SAVINGS_CURRENT")
    bin = Column(String(10), nullable=True)
    platform_indicator = Column(String(35), nullable=True, default="POSTILION_V2")
    pan_length = Column(Integer, nullable=True, default=16)
    sequence = Column(Integer, nullable=True)
    min_random_number = Column(Integer, nullable=True, default=100000)
    max_random_number = Column(Integer, nullable=True, default=999999)
    output_path = Column(String(255), nullable=True, default=None)
    table_prefix = Column(String(35), nullable=True, default="TBL_CP_")
    fep_programme_id = Column(String(50), nullable=True)
    instant_card_type = Column(String(50), nullable=True, default="INSTANT_STANDARD")
    payment_ref_prefix = Column(String(35), nullable=True, default="PAY_REF_")
    assigned_segment_group = Column(String(100), nullable=True, default="Retail Segment (01)")
    pp_bin = Column(String(10), nullable=True, default="901234")
    segment_count = Column(Integer, nullable=True, default=2)
    charge_header_count = Column(Integer, nullable=True, default=1)
    charge_header_name = Column(String(100), nullable=True)


class CardSegment(Base):
    __tablename__ = "card_segments"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=True)
    segment_code = Column(String(20), nullable=False)
    segment_name = Column(String(100), nullable=False)
    priority = Column(Integer, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class CardSegmentProgramme(Base):
    __tablename__ = "card_segment_programmes"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    segment_id = Column(Integer, ForeignKey(fk_ref("config.card_segments.id")), nullable=False)
    card_programme_id = Column(Integer, ForeignKey(fk_ref("config.card_programmes.id")), nullable=False)
    priority = Column(Integer, nullable=True)
    description = Column(String(255), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)







class RequestStatusHistory(Base):
    __tablename__ = "request_status_history"
    __table_args__ = schema_args("request")

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, nullable=False)
    from_status = Column(String(30), nullable=True)
    to_status = Column(String(30), nullable=False)
    action = Column(String(50), nullable=True)
    performed_by = Column(String(50), nullable=True)
    performed_date = Column(DateTime, nullable=False, server_default=func.now())
    remarks = Column(String(255), nullable=True)


class RequestSpecialApproval(Base):
    __tablename__ = "request_special_approvals"
    __table_args__ = schema_args("request")

    approval_id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, nullable=True)
    account_number = Column(String(30), nullable=False)
    programme_id = Column(Integer, nullable=False)
    approval_type = Column(String(20), nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")
    requested_by_user = Column(String(50), nullable=False)
    approved_by_user = Column(String(50), nullable=True)
    requested_date = Column(DateTime, nullable=False, server_default=func.now())
    approved_date = Column(DateTime, nullable=True)


class ChargePostingAttempt(Base):
    __tablename__ = "charge_posting_attempts"
    __table_args__ = schema_args("eligibility")

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(BigInteger, nullable=False)
    payment_ref = Column(String(50), nullable=True)
    amount = Column(Numeric(18, 2), nullable=True)
    status = Column(String(25), nullable=False)
    response = Column(String(1000), nullable=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class NochargePolicy(Base):
    __tablename__ = "nocharge_policies"
    __table_args__ = schema_args("eligibility")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    programme_id = Column(Integer, nullable=False)
    account_product_code = Column(String(20), nullable=True)
    is_allowed = Column(Boolean, nullable=False, default=True)
    active = Column(Boolean, nullable=False, default=True)


class AuditEventType(Base):
    __tablename__ = "audit_event_types"
    __table_args__ = schema_args("audit")

    event_type_id = Column(Integer, primary_key=True)
    event_code = Column(String(30), nullable=False, unique=True)
    description = Column(String(100), nullable=True)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = schema_args("audit")

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(BigInteger, nullable=False)
    event_type_id = Column(Integer, nullable=False)
    event_source = Column(String(50), nullable=True)
    performed_by = Column(String(100), nullable=True)
    branch_code = Column(String(3), nullable=True)
    event_time = Column(DateTime, nullable=False, server_default=func.now())
    correlation_id = Column(String(100), nullable=True)
    remarks = Column(String(255), nullable=True)


class AuditEventDetail(Base):
    __tablename__ = "audit_event_details"
    __table_args__ = schema_args("audit")

    detail_id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(BigInteger, nullable=False)
    column_name = Column(String(100), nullable=False)
    old_value = Column(String, nullable=True)
    new_value = Column(String, nullable=True)


class AuditSnapshot(Base):
    __tablename__ = "audit_snapshots"
    __table_args__ = schema_args("audit")

    snapshot_id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(BigInteger, nullable=False)
    snapshot_time = Column(DateTime, nullable=False, server_default=func.now())
    snapshot_data = Column(String, nullable=False)
    event_id = Column(BigInteger, nullable=True)


class ApiLogRequestResponse(Base):
    __tablename__ = "api_log_request_response"
    __table_args__ = schema_args("audit")

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_path = Column(String(255), nullable=False)
    request_method = Column(String(10), nullable=False)
    request_headers = Column(String, nullable=True)
    request_body = Column(String, nullable=True)
    response_status_code = Column(Integer, nullable=False)
    response_body = Column(String, nullable=True)
    performed_by = Column(String(100), nullable=True)
    client_id = Column(Integer, nullable=True)
    created_date = Column(DateTime, nullable=False, server_default=func.now())


class CardType(Base):
    __tablename__ = "card_types"
    __table_args__ = schema_args("config")

    card_type = Column(String(20), primary_key=True)
    description = Column(String(50), nullable=True)
    client_id = Column(Integer, nullable=True)
    active = Column(Boolean, nullable=False, default=True)


class CardChargesHeader(Base):
    __tablename__ = "card_charges_headers"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    charge_name = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())


class CardChargeEntry(Base):
    __tablename__ = "card_charge_entries"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    header_id = Column(Integer, nullable=False)
    charge_type = Column(String(50), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    currency = Column(String(3), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class CardSegmentProgrammeCharge(Base):
    __tablename__ = "card_segment_programme_charges"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    card_segment_programme_id = Column(Integer, ForeignKey(fk_ref("config.card_segment_programmes.id")), nullable=False)
    charge_header_id = Column(Integer, ForeignKey(fk_ref("config.card_charges_headers.id")), nullable=False)
    priority = Column(Integer, nullable=True)
    processing_mode_code = Column(String(30), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(30), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(30), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class LocalAccount(Base):
    __tablename__ = "local_accounts"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    account_number = Column(String(10), nullable=False)
    account_name = Column(String(100), nullable=False)
    branch_code = Column(String(20), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class RequestStatus(Base):
    __tablename__ = "request_statuses"
    __table_args__ = schema_args("request")

    status_code = Column(String(30), primary_key=True)
    status_name = Column(String(50), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class RequestChannel(Base):
    __tablename__ = "request_channels"
    __table_args__ = schema_args("config")

    channel_code = Column(String(20), primary_key=True)
    channel_name = Column(String(50), nullable=False)
    active = Column(Boolean, nullable=False, default=True)



class RequestCategory(Base):
    __tablename__ = "request_categories"
    __table_args__ = schema_args("request")

    category_code = Column(String(20), primary_key=True)
    category_name = Column(String(50), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class RequestStatusTransition(Base):
    __tablename__ = "request_status_transitions"
    __table_args__ = schema_args("request")

    id = Column(Integer, primary_key=True, autoincrement=True)
    from_status = Column(String(30), nullable=False)
    to_status = Column(String(30), nullable=False)
    allowed_role = Column(String(50), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class DispatchStatus(Base):
    __tablename__ = "dispatch_statuses"
    __table_args__ = schema_args("config")

    status_code = Column(String(30), primary_key=True)
    description = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class DispatchType(Base):
    __tablename__ = "dispatch_types"
    __table_args__ = schema_args("config")

    type_code = Column(String(30), primary_key=True)
    description = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class Courier(Base):
    __tablename__ = "couriers"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    courier_name = Column(String(100), nullable=False)
    contact_email = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class EligibleAccountProduct(Base):
    __tablename__ = "eligible_account_products"
    __table_args__ = schema_args("eligibility")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    product_code = Column(String(20), nullable=False)
    card_programme_id = Column(Integer, nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class NochargeAccountProduct(Base):
    __tablename__ = "nocharge_account_products"
    __table_args__ = schema_args("eligibility")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    product_code = Column(String(20), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class NochargeProgrammeId(Base):
    __tablename__ = "nocharge_programme_ids"
    __table_args__ = schema_args("eligibility")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    card_programme_id = Column(Integer, nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class InstantCardStatus(Base):
    __tablename__ = "instant_card_statuses"
    __table_args__ = schema_args("config")

    status_code = Column(String(30), primary_key=True)
    description = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class InstantCardType(Base):
    __tablename__ = "instant_card_types"
    __table_args__ = schema_args("config")

    type_code = Column(String(30), primary_key=True)
    description = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class InstantInventoryMovementType(Base):
    __tablename__ = "instant_inventory_movement_types"
    __table_args__ = schema_args("config")

    movement_code = Column(String(30), primary_key=True)
    description = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class LocalEmailRecipient(Base):
    __tablename__ = "local_email_recipients"
    __table_args__ = schema_args("config")

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    recipient_role = Column(String(50), nullable=False)
    email_address = Column(String(100), nullable=False)
    active = Column(Boolean, nullable=False, default=True)


class MakerCheckerStatus(Base):
    __tablename__ = "statuses"
    __table_args__ = schema_args("maker_checker")

    status_code = Column(String(20), primary_key=True)
    status_name = Column(String(50), nullable=False)
    description = Column(String(200), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(50), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class MakerCheckerOperation(Base):
    __tablename__ = "operations"
    __table_args__ = schema_args("maker_checker")

    operation_code = Column(String(30), primary_key=True)
    operation_name = Column(String(100), nullable=False)
    description = Column(String(200), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(50), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class MakerCheckerEntityType(Base):
    __tablename__ = "entity_types"
    __table_args__ = schema_args("maker_checker")

    entity_type_code = Column(String(50), primary_key=True)
    entity_type_name = Column(String(100), nullable=False)
    description = Column(String(200), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(50), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(50), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class MakerCheckerWorkItem(Base):
    __tablename__ = "work_items"
    __table_args__ = schema_args("maker_checker")

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    work_item_number = Column(String(30), nullable=False, unique=True)
    client_id = Column(Integer, nullable=False)
    entity_type_code = Column(String(50), ForeignKey(fk_ref("maker_checker.entity_types.entity_type_code")), nullable=False)
    entity_id = Column(BigInteger, nullable=False)
    operation_code = Column(String(30), ForeignKey(fk_ref("maker_checker.operations.operation_code")), nullable=False)
    status_code = Column(String(20), ForeignKey(fk_ref("maker_checker.statuses.status_code")), nullable=False)
    checker_user_id = Column(String(31), ForeignKey(fk_ref("iam.users.user_id")), nullable=True)
    approved_date = Column(DateTime, nullable=True)
    rejected_date = Column(DateTime, nullable=True)
    cancelled_date = Column(DateTime, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(31), ForeignKey(fk_ref("iam.users.user_id")), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(31), ForeignKey(fk_ref("iam.users.user_id")), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)


class MakerCheckerWorkItemPayload(Base):
    __tablename__ = "work_item_payloads"
    __table_args__ = schema_args("maker_checker")

    work_item_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey(fk_ref("maker_checker.work_items.id")), primary_key=True)
    entity_name = Column(String(200), nullable=True)
    before_payload = Column(String, nullable=True)
    after_payload = Column(String, nullable=False)
    created_by = Column(String(31), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())


class MakerCheckerWorkItemAction(Base):
    __tablename__ = "work_item_actions"
    __table_args__ = schema_args("maker_checker")

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    work_item_id = Column(BigInteger().with_variant(Integer, "sqlite"), ForeignKey(fk_ref("maker_checker.work_items.id")), nullable=False)
    action_sequence = Column(Integer, nullable=False)
    operation_code = Column(String(30), ForeignKey(fk_ref("maker_checker.operations.operation_code")), nullable=False)
    status_code = Column(String(20), ForeignKey(fk_ref("maker_checker.statuses.status_code")), nullable=False)
    action_by = Column(String(31), ForeignKey(fk_ref("iam.users.user_id")), nullable=False)
    remarks = Column(String(1000), nullable=True)
    action_date = Column(DateTime, nullable=False, server_default=func.now())
    created_by = Column(String(31), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    change_summary = Column(String(1000), nullable=True)


class ApprovalPolicy(Base):
    __tablename__ = "approval_policies"
    __table_args__ = schema_args("config")

    id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    client_id = Column(Integer, nullable=False)
    entity_type_code = Column(String(50), ForeignKey(fk_ref("maker_checker.entity_types.entity_type_code")), nullable=False)
    operation_code = Column(String(30), ForeignKey(fk_ref("maker_checker.operations.operation_code")), nullable=False)
    approval_required = Column(Boolean, nullable=False, default=True)
    active = Column(Boolean, nullable=False, default=True)
    created_by = Column(String(31), nullable=False)
    created_date = Column(DateTime, nullable=False, server_default=func.now())
    last_modified_by = Column(String(31), nullable=True)
    last_modified_date = Column(DateTime, nullable=True)





