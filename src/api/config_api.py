from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.db import get_db
from src.models import (
    ClientRead,
    BranchRead,
    CardProgrammeRead,
    CardProgrammeCreate,
    CardProgrammeUpdate,
    CardSegmentRead,
    UserInfo,
    ClientCardPolicyRead,
    ClientCardPolicyUpdate,
    CardTypeRead,
    CardChargesHeaderRead,
    CardChargeEntryRead,
    CardSegmentProgrammeChargeRead,
    LocalAccountRead,
    RequestStatusRead,
    RequestChannelRead,
    RequestCategoryRead,
    RequestStatusTransitionRead,
    DispatchStatusRead,
    DispatchTypeRead,
    CourierRead,
    EligibleAccountProductRead,
    NochargeAccountProductRead,
    NochargeProgrammeIdRead,
    InstantCardStatusRead,
    InstantCardTypeRead,
    InstantInventoryMovementTypeRead,
    LocalEmailRecipientRead,
)
from src.db_models import (
    Client,
    Branch,
    CardProgramme,
    CardSegment,
    ClientCardPolicy,
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
from src.api.auth import get_current_user

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/clients", response_model=list[ClientRead])
def get_clients(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Only super_admin can list all clients, others only see their own client
    if "super_admin" in current_user.roles:
        return db.query(Client).all()
    return db.query(Client).filter(Client.tenant_id == current_user.client_id).all()





@router.get("/card-programmes", response_model=list[CardProgrammeRead])
def get_card_programmes(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Enforce tenant scoping
    if "super_admin" in current_user.roles:
        return db.query(CardProgramme).all()
    return db.query(CardProgramme).filter(CardProgramme.client_id == current_user.client_id).all()


@router.get("/card-programmes/{id}", response_model=CardProgrammeRead)
def get_card_programme_by_id(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    query = db.query(CardProgramme).filter(CardProgramme.id == id)
    if "super_admin" not in current_user.roles:
        query = query.filter(CardProgramme.client_id == current_user.client_id)
    obj = query.first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Card programme #{id} not found")
    return obj


@router.post("/card-programmes", response_model=CardProgrammeRead, status_code=status.HTTP_201_CREATED)
def create_card_programme(
    payload: CardProgrammeCreate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Permission check
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in ["operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    )
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied to create card programmes")

    target_client_id = payload.client_id if ("super_admin" in current_user.roles and payload.client_id) else current_user.client_id

    # Check for duplicate code within client
    existing = db.query(CardProgramme).filter(
        CardProgramme.client_id == target_client_id,
        CardProgramme.card_programme_code == payload.card_programme_code.upper()
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Card programme code '{payload.card_programme_code}' already exists for this tenant."
        )

    if payload.card_type:
        valid_card_type = db.query(CardType).filter(CardType.card_type == payload.card_type).first()
        if not valid_card_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid card type brand code '{payload.card_type}'."
            )

    obj_data = payload.model_dump(exclude_unset=True)
    obj_data["client_id"] = target_client_id
    obj_data["card_programme_code"] = payload.card_programme_code.upper()
    obj_data["created_by"] = current_user.username
    obj_data.setdefault("priority", 1)

    obj = CardProgramme(**obj_data)
    db.add(obj)

    from sqlalchemy.exc import IntegrityError
    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Database constraint violation: {str(exc.orig)}"
        ) from exc
    return obj


@router.put("/card-programmes/{id}", response_model=CardProgrammeRead)
def update_card_programme(
    id: int,
    payload: CardProgrammeUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in ["operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    )
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied to update card programmes")

    query = db.query(CardProgramme).filter(CardProgramme.id == id)
    if "super_admin" not in current_user.roles:
        query = query.filter(CardProgramme.client_id == current_user.client_id)

    obj = query.first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card programme record not found")

    update_dict = payload.model_dump(exclude_unset=True)
    if "card_type" in update_dict and update_dict["card_type"] is not None:
        valid_card_type = db.query(CardType).filter(CardType.card_type == update_dict["card_type"]).first()
        if not valid_card_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid card type brand code '{update_dict['card_type']}'."
            )

    for field, val in update_dict.items():
        if hasattr(obj, field):
            setattr(obj, field, val)

    from datetime import datetime
    from sqlalchemy.exc import IntegrityError

    obj.last_modified_by = current_user.username
    obj.last_modified_date = datetime.now()

    try:
        db.commit()
        db.refresh(obj)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Database constraint violation while saving card programme."
        ) from exc
    return obj





@router.get("/card-policy", response_model=ClientCardPolicyRead)
def get_card_policy(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    policy = db.query(ClientCardPolicy).filter(ClientCardPolicy.client_id == current_user.client_id).first()
    if not policy:
        return ClientCardPolicyRead(
            client_id=current_user.client_id,
            card_policy="one_card_per_account",
            requires_approval_for_deviation=True
        )
    return policy


@router.put("/card-policy", response_model=ClientCardPolicyRead)
def update_card_policy(
    payload: ClientCardPolicyUpdate,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in [
            "operations_admin_maker",
            "operations_admin_checker",
            "internal_control_maker",
            "internal_control_checker",
        ]
    )
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to modify tenant card policies",
        )

    policy = db.query(ClientCardPolicy).filter(ClientCardPolicy.client_id == current_user.client_id).first()
    if not policy:
        policy = ClientCardPolicy(
            client_id=current_user.client_id,
            card_policy=payload.card_policy,
            requires_approval_for_deviation=payload.requires_approval_for_deviation
        )
        db.add(policy)
    else:
        policy.card_policy = payload.card_policy
        policy.requires_approval_for_deviation = payload.requires_approval_for_deviation

    db.commit()
    db.refresh(policy)
    return policy


@router.get("/card-types", response_model=list[CardTypeRead])
def get_card_types(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if "super_admin" in current_user.roles:
        return db.query(CardType).all()
    return db.query(CardType).filter(
        (CardType.client_id == current_user.client_id) | (CardType.client_id == None)
    ).all()


@router.get("/card-charges", response_model=list[CardChargesHeaderRead])
def get_card_charges(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Fetch headers
    if "super_admin" in current_user.roles:
        headers = db.query(CardChargesHeader).all()
    else:
        headers = db.query(CardChargesHeader).filter(CardChargesHeader.client_id == current_user.client_id).all()
        
    res = []
    for h in headers:
        entries = db.query(CardChargeEntry).filter(CardChargeEntry.header_id == h.id).all()
        # Build read response
        h_read = CardChargesHeaderRead(
            id=h.id,
            client_id=h.client_id,
            charge_name=h.charge_name,
            active=h.active,
            created_by=h.created_by,
            created_date=h.created_date,
            entries=[CardChargeEntryRead.model_validate(e) for e in entries]
        )
        res.append(h_read)
    return res


@router.get("/card-segment-programme-charges", response_model=list[CardSegmentProgrammeChargeRead])
def get_card_segment_programme_charges(
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    if "super_admin" in current_user.roles:
        return db.query(CardSegmentProgrammeCharge).all()
    return db.query(CardSegmentProgrammeCharge).filter(CardSegmentProgrammeCharge.client_id == current_user.client_id).all()


@router.get("/local-accounts", response_model=list[LocalAccountRead])
def get_local_accounts(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(LocalAccount).all()
    return db.query(LocalAccount).filter(LocalAccount.client_id == current_user.client_id).all()


@router.get("/request-statuses", response_model=list[RequestStatusRead])
def get_request_statuses(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(RequestStatus).all()


@router.get("/request-channels", response_model=list[RequestChannelRead])
def get_request_channels(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(RequestChannel).all()


@router.get("/request-categories", response_model=list[RequestCategoryRead])
def get_request_categories(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(RequestCategory).all()


@router.get("/request-status-transitions", response_model=list[RequestStatusTransitionRead])
def get_request_status_transitions(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(RequestStatusTransition).all()


@router.get("/dispatch-statuses", response_model=list[DispatchStatusRead])
def get_dispatch_statuses(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(DispatchStatus).all()


@router.get("/dispatch-types", response_model=list[DispatchTypeRead])
def get_dispatch_types(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(DispatchType).all()


@router.get("/couriers", response_model=list[CourierRead])
def get_couriers(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(Courier).all()
    return db.query(Courier).filter(Courier.client_id == current_user.client_id).all()


@router.get("/eligible-account-products", response_model=list[EligibleAccountProductRead])
def get_eligible_account_products(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(EligibleAccountProduct).all()
    return db.query(EligibleAccountProduct).filter(EligibleAccountProduct.client_id == current_user.client_id).all()


@router.get("/nocharge-account-products", response_model=list[NochargeAccountProductRead])
def get_nocharge_account_products(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(NochargeAccountProduct).all()
    return db.query(NochargeAccountProduct).filter(NochargeAccountProduct.client_id == current_user.client_id).all()


@router.get("/nocharge-programme-ids", response_model=list[NochargeProgrammeIdRead])
def get_nocharge_programme_ids(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(NochargeProgrammeId).all()
    return db.query(NochargeProgrammeId).filter(NochargeProgrammeId.client_id == current_user.client_id).all()


@router.get("/instant-card-statuses", response_model=list[InstantCardStatusRead])
def get_instant_card_statuses(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(InstantCardStatus).all()


@router.get("/instant-card-types", response_model=list[InstantCardTypeRead])
def get_instant_card_types(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(InstantCardType).all()


@router.get("/instant-inventory-movement-types", response_model=list[InstantInventoryMovementTypeRead])
def get_instant_inventory_movement_types(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    return db.query(InstantInventoryMovementType).all()


@router.get("/local-email-recipients", response_model=list[LocalEmailRecipientRead])
def get_local_email_recipients(db: Session = Depends(get_db), current_user: UserInfo = Depends(get_current_user)):
    if "super_admin" in current_user.roles:
        return db.query(LocalEmailRecipient).all()
    return db.query(LocalEmailRecipient).filter(LocalEmailRecipient.client_id == current_user.client_id).all()


from sqlalchemy import inspect
from src.db_models import Base

def get_model_by_tablename(tablename: str):
    for mapper in Base.registry.mappers:
        cls = mapper.class_
        if getattr(cls, "__tablename__", None) == tablename:
            return cls
    return None


@router.post("/table/{table_name}")
def create_table_record(
    table_name: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    # Role check
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in ["operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail="Permission denied to modify configurations")
        
    model_cls = get_model_by_tablename(table_name)
    if not model_cls:
        raise HTTPException(status_code=404, detail="Configuration table not found")
        
    # Enforce tenant scoping if model has client_id
    if hasattr(model_cls, "client_id") and "client_id" not in payload:
        payload["client_id"] = current_user.client_id
        
    obj = model_cls(**payload)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {"status": "success", "data": {c.name: getattr(obj, c.name) for c in inspect(obj).mapper.columns}}


@router.put("/table/{table_name}/{pk_value}")
def update_table_record(
    table_name: str,
    pk_value: str,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    is_admin = "super_admin" in current_user.roles or any(
        r in current_user.roles
        for r in ["operations_admin_maker", "operations_admin_checker", "internal_control_maker", "internal_control_checker"]
    )
    if not is_admin:
        raise HTTPException(status_code=403, detail="Permission denied to modify configurations")
        
    model_cls = get_model_by_tablename(table_name)
    if not model_cls:
        raise HTTPException(status_code=404, detail="Configuration table not found")
        
    # Identify the primary key column name
    mapper = inspect(model_cls)
    if len(mapper.primary_key) > 1 and "/" in pk_value:
        # Composite primary key e.g. card_segment_members
        parts = pk_value.split("/")
        query = db.query(model_cls)
        for i, col in enumerate(mapper.primary_key):
            val = parts[i]
            if col.type.python_type == int:
                val = int(val)
            query = query.filter(col == val)
        obj = query.first()
    else:
        pk_col = mapper.primary_key[0]
        # Cast pk_value to correct type
        casted_pk = pk_value
        if pk_col.type.python_type == int:
            casted_pk = int(pk_value)
            
        obj = db.query(model_cls).filter(pk_col == casted_pk).first()
        
    if not obj:
        raise HTTPException(status_code=404, detail="Record not found")
        
    # Scope check
    if hasattr(obj, "client_id") and obj.client_id != current_user.client_id and "super_admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Access denied (tenant scope violation)")
        
    for k, v in payload.items():
        setattr(obj, k, v)
        
    db.commit()
    db.refresh(obj)
    return {"status": "success", "data": {c.name: getattr(obj, c.name) for c in inspect(obj).mapper.columns}}
