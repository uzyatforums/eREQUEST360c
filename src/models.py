from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserInfo(BaseModel):
    user_id: str
    username: str
    client_id: int
    roles: list[str] = []
    permissions: list[str] = []
    branch_code: Optional[str] = None  # Backward compatibility alias for effective_branch_code
    effective_branch_code: Optional[str] = None
    role_scope: str = "BRANCH"
    is_head_office_user: bool = False

    class Config:
        from_attributes = True


CurrentUserContext = UserInfo


class IAMRoleRead(BaseModel):
    role_code: str
    role_name: str
    description: Optional[str] = None
    is_maker: bool = False
    is_checker: bool = False
    role_scope: str = "BRANCH"
    active: bool = True

    class Config:
        from_attributes = True


class IAMPermissionRead(BaseModel):
    permission_code: str
    module_name: Optional[str] = None
    permission_name: str
    description: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True


class HealthCheckResponse(BaseModel):
    status: str
    message: str


class RequestCreate(BaseModel):
    client_id: int
    account_number: str = Field(..., pattern=r"^\d{10}$", description="Account number must be exactly 10 digits")
    programme_id: int
    request_branch: str
    created_by: str
    pickup_branch: Optional[str] = None
    channel_id: Optional[int] = None
    category_id: Optional[int] = None
    source_type: Optional[str] = None
    source_reference: Optional[int] = None
    brand: Optional[str] = None


class RequestRead(RequestCreate):
    request_id: int
    request_status: str
    approval_required: bool
    created_date: datetime
    status_last_updated: datetime

    class Config:
        from_attributes = True


class ClientRead(BaseModel):
    id: int
    tenant_id: int
    client_name: str
    client_code: str
    active: bool

    class Config:
        from_attributes = True


class BranchRead(BaseModel):
    branch_code: str
    branch_name: str
    client_id: int
    active: bool

    class Config:
        from_attributes = True


class CardProgrammeCreate(BaseModel):
    card_programme_code: str = Field(..., max_length=35)
    card_programme_name: str = Field(..., max_length=100)
    card_type: str = Field(..., max_length=20)
    active: bool = True
    client_id: Optional[int] = None
    description: Optional[str] = None
    service_code: Optional[str] = None
    default_validity_years: Optional[int] = 3
    currency: Optional[str] = "NGN"
    issuance_fee: Optional[float] = 1000.0
    maintenance_fee: Optional[float] = 250.0
    account_type_binding: Optional[str] = "SAVINGS_CURRENT"
    bin: Optional[str] = None
    platform_indicator: Optional[str] = "POSTILION_V2"
    pan_length: Optional[int] = 16
    sequence: Optional[int] = None
    min_random_number: Optional[int] = 100000
    max_random_number: Optional[int] = 999999
    output_path: Optional[str] = None
    table_prefix: Optional[str] = "TBL_CP_"
    fep_programme_id: Optional[str] = None
    instant_card_type: Optional[str] = "INSTANT_STANDARD"
    payment_ref_prefix: Optional[str] = "PAY_REF_"
    assigned_segment_group: Optional[str] = "Retail Segment (01)"
    pp_bin: Optional[str] = "901234"
    segment_count: Optional[int] = 2
    charge_header_count: Optional[int] = 1
    charge_header_name: Optional[str] = None


class CardProgrammeUpdate(BaseModel):
    card_programme_name: Optional[str] = Field(None, max_length=100)
    card_type: Optional[str] = Field(None, max_length=20)
    active: Optional[bool] = None
    description: Optional[str] = None
    service_code: Optional[str] = None
    default_validity_years: Optional[int] = None
    currency: Optional[str] = None
    issuance_fee: Optional[float] = None
    maintenance_fee: Optional[float] = None
    account_type_binding: Optional[str] = None
    bin: Optional[str] = None
    platform_indicator: Optional[str] = None
    pan_length: Optional[int] = None
    sequence: Optional[int] = None
    min_random_number: Optional[int] = None
    max_random_number: Optional[int] = None
    output_path: Optional[str] = None
    table_prefix: Optional[str] = None
    fep_programme_id: Optional[str] = None
    instant_card_type: Optional[str] = None
    payment_ref_prefix: Optional[str] = None
    assigned_segment_group: Optional[str] = None
    pp_bin: Optional[str] = None
    segment_count: Optional[int] = None
    charge_header_count: Optional[int] = None
    charge_header_name: Optional[str] = None


class CardProgrammeRead(BaseModel):
    id: int
    client_id: int
    card_programme_code: str
    card_programme_name: str
    card_type: str
    active: bool
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None
    description: Optional[str] = None
    service_code: Optional[str] = None
    default_validity_years: Optional[int] = 3
    currency: Optional[str] = "NGN"
    issuance_fee: Optional[float] = 1000.0
    maintenance_fee: Optional[float] = 250.0
    account_type_binding: Optional[str] = "SAVINGS_CURRENT"
    bin: Optional[str] = None
    platform_indicator: Optional[str] = "POSTILION_V2"
    pan_length: Optional[int] = 16
    sequence: Optional[int] = None
    min_random_number: Optional[int] = 100000
    max_random_number: Optional[int] = 999999
    output_path: Optional[str] = None
    table_prefix: Optional[str] = "TBL_CP_"
    fep_programme_id: Optional[str] = None
    instant_card_type: Optional[str] = "INSTANT_STANDARD"
    payment_ref_prefix: Optional[str] = "PAY_REF_"
    assigned_segment_group: Optional[str] = "Retail Segment (01)"
    pp_bin: Optional[str] = "901234"
    segment_count: Optional[int] = 2
    charge_header_count: Optional[int] = 1
    charge_header_name: Optional[str] = None
    has_pending_change: Optional[bool] = False
    pending_work_item_id: Optional[int] = None
    pending_operation_code: Optional[str] = None

    class Config:
        from_attributes = True


class CardSegmentCreate(BaseModel):
    segment_code: str = Field(..., max_length=10)
    segment_name: str = Field(..., max_length=100)
    priority: Optional[int] = 0
    active: Optional[bool] = True


class CardSegmentUpdate(BaseModel):
    segment_name: Optional[str] = Field(None, max_length=100)
    priority: Optional[int] = None
    active: Optional[bool] = None


class CardSegmentRead(BaseModel):
    id: int
    client_id: int
    segment_code: str
    segment_name: str
    priority: Optional[int] = 0
    active: bool
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None
    assigned_programmes_count: Optional[int] = 0
    has_pending_change: Optional[bool] = False
    pending_work_item_id: Optional[int] = None
    pending_operation_code: Optional[str] = None

    class Config:
        from_attributes = True


class CardSegmentProgrammeAssign(BaseModel):
    card_programme_id: int
    priority: Optional[int] = None
    description: Optional[str] = None


class CardSegmentProgrammeRead(BaseModel):
    id: int
    client_id: int
    segment_id: int
    card_programme_id: int
    card_programme_code: Optional[str] = None
    card_programme_name: Optional[str] = None
    card_type: Optional[str] = None  # Card Brand
    priority: int
    description: Optional[str] = None
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class CardSegmentProgrammeReorder(BaseModel):
    card_programme_id: int
    direction: str = Field(..., pattern=r"^(UP|DOWN|up|down)$")


class CardSegmentProgrammeChargeRead(BaseModel):
    id: int
    client_id: int
    card_segment_programme_id: int
    charge_header_id: int
    priority: Optional[int] = 0
    active: bool
    processing_mode_code: str
    created_by: Optional[str] = None
    created_date: Optional[datetime] = None
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class DuplicateCheckRequest(BaseModel):
    client_id: int
    account_number: str = Field(..., pattern=r"^\d{10}$", description="Account number must be exactly 10 digits")
    programme_id: int
    brand: Optional[str] = None


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    requires_approval: bool
    message: str


class NochargeCheckRequest(BaseModel):
    client_id: int
    account_number: str = Field(..., pattern=r"^\d{10}$", description="Account number must be exactly 10 digits")
    programme_id: int
    account_product_code: Optional[str] = None


class NochargeCheckResponse(BaseModel):
    is_nocharge: bool
    message: str


class UserCreate(BaseModel):
    user_id: str
    username: str
    password: str
    email: Optional[str] = None
    role_code: str
    branch_id: Optional[str] = None
    client_id: int
    phone_1: Optional[str] = None


class UserRead(BaseModel):
    user_id: str
    client_id: Optional[int] = None
    branch_id: Optional[str] = None
    username: str
    email: Optional[str] = None
    role_code: str
    phone_1: Optional[str] = None
    active: bool
    created_by: Optional[str] = None
    created_date: datetime
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class RoleRead(BaseModel):
    role_code: str
    role_name: str
    description: Optional[str] = None
    is_maker: bool
    is_checker: bool
    active: bool

    class Config:
        from_attributes = True


class ClientCardPolicyRead(BaseModel):
    client_id: int
    card_policy: str
    requires_approval_for_deviation: bool

    class Config:
        from_attributes = True


class ClientCardPolicyUpdate(BaseModel):
    card_policy: str
    requires_approval_for_deviation: bool


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role_code: Optional[str] = None
    branch_id: Optional[str] = None
    phone_1: Optional[str] = None
    active: Optional[bool] = None


class LinkAccountRequest(BaseModel):
    account_number: str = Field(..., pattern=r"^\d{10}$", description="Account number must be exactly 10 digits")


class CardTypeRead(BaseModel):
    card_type: str
    description: Optional[str] = None
    client_id: Optional[int] = None
    active: bool

    class Config:
        from_attributes = True


class CardChargeEntryRead(BaseModel):
    id: int
    header_id: int
    charge_type: str
    amount: float
    currency: str
    active: bool

    class Config:
        from_attributes = True


class CardChargesHeaderRead(BaseModel):
    id: int
    client_id: int
    charge_name: str
    active: bool
    created_by: str
    created_date: datetime
    entries: list[CardChargeEntryRead] = []

    class Config:
        from_attributes = True


class CardSegmentProgrammeChargeRead(BaseModel):
    id: int
    client_id: int
    card_seg_grp: str
    card_programme_id: int
    charge_header_id: int
    active: bool

    class Config:
        from_attributes = True


class LocalAccountRead(BaseModel):
    id: int
    client_id: int
    account_number: str
    account_name: str
    branch_code: str
    active: bool

    class Config:
        from_attributes = True


class RequestStatusRead(BaseModel):
    status_code: str
    status_name: str
    active: bool

    class Config:
        from_attributes = True


class RequestChannelRead(BaseModel):
    channel_code: str
    channel_name: str
    active: bool

    class Config:
        from_attributes = True


class RequestCategoryRead(BaseModel):
    category_code: str
    category_name: str
    active: bool

    class Config:
        from_attributes = True


class RequestStatusTransitionRead(BaseModel):
    id: int
    from_status: str
    to_status: str
    allowed_role: str
    active: bool

    class Config:
        from_attributes = True


class DispatchStatusRead(BaseModel):
    status_code: str
    description: str
    active: bool

    class Config:
        from_attributes = True


class DispatchTypeRead(BaseModel):
    type_code: str
    description: str
    active: bool

    class Config:
        from_attributes = True


class CourierRead(BaseModel):
    id: int
    client_id: int
    courier_name: str
    contact_email: str
    active: bool

    class Config:
        from_attributes = True


class EligibleAccountProductRead(BaseModel):
    id: int
    client_id: int
    product_code: str
    card_programme_id: int
    active: bool

    class Config:
        from_attributes = True


class NochargeAccountProductRead(BaseModel):
    id: int
    client_id: int
    product_code: str
    active: bool

    class Config:
        from_attributes = True


class NochargeProgrammeIdRead(BaseModel):
    id: int
    client_id: int
    card_programme_id: int
    active: bool

    class Config:
        from_attributes = True


class InstantCardStatusRead(BaseModel):
    status_code: str
    description: str
    active: bool

    class Config:
        from_attributes = True


class InstantCardTypeRead(BaseModel):
    type_code: str
    description: str
    active: bool

    class Config:
        from_attributes = True


class InstantInventoryMovementTypeRead(BaseModel):
    movement_code: str
    description: str
    active: bool

    class Config:
        from_attributes = True


class LocalEmailRecipientRead(BaseModel):
    id: int
    client_id: int
    recipient_role: str
    email_address: str
    active: bool

    class Config:
        from_attributes = True





class MakerCheckerSubmitRequest(BaseModel):
    entity_type_code: str
    entity_id: int = Field(..., alias="entity_key")
    operation_code: str
    entity_name: Optional[str] = None
    before_payload: Optional[dict | str] = None
    after_payload: dict | str

    class Config:
        populate_by_name = True


class MakerCheckerActionRequest(BaseModel):
    remarks: Optional[str] = None


class MakerCheckerResubmitRequest(BaseModel):
    after_payload: dict | str
    remarks: Optional[str] = None


class WorkItemRead(BaseModel):
    id: int
    work_item_number: str
    client_id: int
    entity_type_code: str
    entity_id: int
    operation_code: str
    status_code: str
    checker_user_id: Optional[str] = None
    approved_date: Optional[datetime] = None
    rejected_date: Optional[datetime] = None
    cancelled_date: Optional[datetime] = None
    active: bool
    created_by: str
    created_date: datetime
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkItemPayloadRead(BaseModel):
    work_item_id: int
    entity_name: Optional[str] = None
    before_payload: Optional[str] = None
    after_payload: str
    created_by: str
    created_date: datetime

    class Config:
        from_attributes = True


class PendingCountResponse(BaseModel):
    count: int


class WorkItemActionRead(BaseModel):
    id: int
    work_item_id: int
    action_sequence: int
    operation_code: str
    status_code: str
    action_by: str
    remarks: Optional[str] = None
    action_date: datetime
    created_by: str
    created_date: datetime
    change_summary: Optional[str] = None

    class Config:
        from_attributes = True


class ApprovalPolicySetRequest(BaseModel):
    entity_type_code: str
    operation_code: str
    approval_required: bool


class ApprovalPolicyRead(BaseModel):
    id: int
    client_id: int
    entity_type_code: str
    operation_code: str
    approval_required: bool
    active: bool
    created_by: str
    created_date: datetime
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApprovalCheckResponse(BaseModel):
    client_id: int
    entity_type_code: str
    operation_code: str
    approval_required: bool


class ConfigExecutionResult(BaseModel):
    status: str
    work_item_id: Optional[int] = None
    work_item_number: Optional[str] = None
    entity_id: Optional[int] = None
    message: str


class BranchCreateRequest(BaseModel):
    branch_code: str = Field(..., max_length=10)
    branch_name: str = Field(..., max_length=100)
    state_code: Optional[str] = Field(None, max_length=10)


class BranchUpdateRequest(BaseModel):
    branch_name: str = Field(..., max_length=100)
    state_code: Optional[str] = Field(None, max_length=10)


class BranchReadResponse(BaseModel):
    branch_code: str
    branch_name: str
    client_id: int
    state_code: Optional[str] = None
    active: bool
    created_by: Optional[str] = None
    created_date: datetime
    last_modified_by: Optional[str] = None
    last_modified_date: Optional[datetime] = None

    class Config:
        from_attributes = True






