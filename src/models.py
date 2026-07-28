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
    branch_code: Optional[str] = None
    roles: list[str]


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


class CardProgrammeRead(BaseModel):
    id: int
    client_id: int
    card_programme_code: str
    card_programme_name: str
    card_type: str
    active: bool

    class Config:
        from_attributes = True


class CardSegmentRead(BaseModel):
    card_seg_grp: str
    card_seg_name: str
    active: bool
    client_id: Optional[int] = None

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


class CardSegmentMemberRead(BaseModel):
    card_seg_grp: str
    acct_seg: str
    active: bool
    client_id: int
    created_by: str
    created_date: datetime

    class Config:
        from_attributes = True



