from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.models import Order, OrderTracking, OrderStatus
from app.schemas.schemas import StatusUpdate, OrderOut, TrackingOut, RescheduleRequest
from app.services.email_service import send_status_email

from app.database import get_db
from app.models.models import Zone, Pincode, RateCard, User, UserRole
from app.schemas.schemas import (
    ZoneCreate, ZoneOut,
    PincodeCreate, PincodeOut,
    RateCardCreate, RateCardOut,
    UserOut, UserRegister
)
from app.services.auth_service import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Zones ──────────────────────────────────────────────
@router.post("/zones", response_model=ZoneOut)
def create_zone(
    payload: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    existing = db.query(Zone).filter(Zone.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zone already exists")

    zone = Zone(name=payload.name, description=payload.description)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return zone


@router.get("/zones", response_model=list[ZoneOut])
def list_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    return db.query(Zone).all()


# ── Pincodes ───────────────────────────────────────────
@router.post("/pincodes", response_model=PincodeOut)
def create_pincode(
    payload: PincodeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    zone = db.query(Zone).filter(Zone.id == payload.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    existing = db.query(Pincode).filter(Pincode.pincode == payload.pincode).first()
    if existing:
        raise HTTPException(status_code=400, detail="Pincode already mapped")

    pincode = Pincode(
        pincode=payload.pincode,
        area_name=payload.area_name,
        zone_id=payload.zone_id
    )
    db.add(pincode)
    db.commit()
    db.refresh(pincode)
    return pincode


@router.get("/pincodes", response_model=list[PincodeOut])
def list_pincodes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    return db.query(Pincode).all()


# ── Rate Cards ─────────────────────────────────────────
@router.post("/rate-cards", response_model=RateCardOut)
def create_rate_card(
    payload: RateCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    zone = db.query(Zone).filter(Zone.id == payload.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Check duplicate rate card for same combo
    existing = db.query(RateCard).filter(
        RateCard.zone_id == payload.zone_id,
        RateCard.order_type == payload.order_type,
        RateCard.is_intra_zone == payload.is_intra_zone
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Rate card already exists for this zone/type/intra combination"
        )

    rate_card = RateCard(
        zone_id=payload.zone_id,
        order_type=payload.order_type,
        is_intra_zone=payload.is_intra_zone,
        rate_per_kg=payload.rate_per_kg,
        cod_surcharge=payload.cod_surcharge
    )
    db.add(rate_card)
    db.commit()
    db.refresh(rate_card)
    return rate_card


@router.get("/rate-cards", response_model=list[RateCardOut])
def list_rate_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    return db.query(RateCard).all()


# ── Create Admin User (one-time setup) ─────────────────
@router.post("/create-admin", response_model=None)
def create_admin(
    payload: dict,
    db: Session = Depends(get_db)
):
    from app.services.auth_service import hash_password
    existing = db.query(User).filter(User.email == payload["email"]).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    admin = User(
        name=payload["name"],
        email=payload["email"],
        hashed_password=hash_password(payload["password"]),
        phone=payload.get("phone"),
        role=UserRole.admin
    )
    db.add(admin)
    db.commit()
    return {"message": "Admin created successfully"}


# ── Admin: view all orders ─────────────────────────────
@router.get("/orders", response_model=list[OrderOut])
def list_all_orders(
    status: str = None,
    zone_id: int = None,
    agent_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    query = db.query(Order)
    if status:
        query = query.filter(Order.status == status)
    if zone_id:
        query = query.filter(Order.pickup_zone_id == zone_id)
    if agent_id:
        query = query.filter(Order.agent_id == agent_id)
    return query.all()


# ── Admin: assign agent to order ───────────────────────
@router.patch("/orders/{order_id}/assign", response_model=OrderOut)
def assign_agent(
    order_id: int,
    agent_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    agent = db.query(User).filter(
        User.id == agent_id,
        User.role == UserRole.agent
    ).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    order.agent_id = agent_id
    order.status = OrderStatus.assigned
    db.add(order)

    tracking = OrderTracking(
        order_id=order.id,
        status=OrderStatus.assigned,
        actor_id=current_user.id,
        actor_role=UserRole.admin,
        note=f"Assigned to agent {agent.name}"
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    from app.services.email_service import send_status_email
    # ...
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order


# ── Admin: override any order status ──────────────────
@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def override_status(
    order_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = payload.status
    db.add(order)

    tracking = OrderTracking(
        order_id=order.id,
        status=payload.status,
        actor_id=current_user.id,
        actor_role=UserRole.admin,
        note=payload.note or "Status overridden by admin"
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    from app.services.email_service import send_status_email
    # ...
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order


# ── Admin: auto-assign nearest agent by zone ──────────
@router.patch("/orders/{order_id}/auto-assign", response_model=OrderOut)
def auto_assign(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Find available agent — not currently assigned to any active order
    active_statuses = [
        OrderStatus.assigned,
        OrderStatus.picked_up,
        OrderStatus.in_transit,
        OrderStatus.out_for_delivery
    ]
    busy_agent_ids = db.query(Order.agent_id).filter(
        Order.status.in_(active_statuses),
        Order.agent_id.isnot(None)
    ).subquery()

    available_agent = db.query(User).filter(
        User.role == UserRole.agent,
        User.is_active == True,
        ~User.id.in_(busy_agent_ids)
    ).first()

    if not available_agent:
        raise HTTPException(status_code=400, detail="No available agents at the moment")

    order.agent_id = available_agent.id
    order.status = OrderStatus.assigned
    db.add(order)

    tracking = OrderTracking(
        order_id=order.id,
        status=OrderStatus.assigned,
        actor_id=current_user.id,
        actor_role=UserRole.admin,
        note=f"Auto-assigned to agent {available_agent.name}"
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    from app.services.email_service import send_status_email
    # ...
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order
@router.post("/create-agent", response_model=UserOut)
def create_agent(
    payload: UserRegister,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin))
):
    from app.services.auth_service import hash_password
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    agent = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        phone=payload.phone,
        role=UserRole.agent
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent
