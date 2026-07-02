from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Order, OrderTracking, OrderStatus, User, UserRole
from app.schemas.schemas import (
    OrderCreate, OrderOut, ChargePreview, StatusUpdate, RescheduleRequest, TrackingOut
)
from app.services.auth_service import get_current_user, require_role
from app.services.rate_engine import calculate_charge
from app.services.email_service import send_status_email

router = APIRouter(prefix="/orders", tags=["Orders"])


# ── Charge Preview (before confirm) ───────────────────
@router.post("/preview", response_model=ChargePreview)
def preview_charge(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = calculate_charge(
        pickup_pincode=payload.pickup_pincode,
        drop_pincode=payload.drop_pincode,
        length=payload.length,
        breadth=payload.breadth,
        height=payload.height,
        actual_weight=payload.actual_weight,
        order_type=payload.order_type,
        payment_type=payload.payment_type,
        db=db
    )
    return result


# ── Place Order (after customer confirms) ─────────────
@router.post("/", response_model=OrderOut)
def place_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = calculate_charge(
        pickup_pincode=payload.pickup_pincode,
        drop_pincode=payload.drop_pincode,
        length=payload.length,
        breadth=payload.breadth,
        height=payload.height,
        actual_weight=payload.actual_weight,
        order_type=payload.order_type,
        payment_type=payload.payment_type,
        db=db
    )

    order = Order(
        customer_id=current_user.id,
        pickup_address=payload.pickup_address,
        pickup_pincode=payload.pickup_pincode,
        drop_address=payload.drop_address,
        drop_pincode=payload.drop_pincode,
        length=payload.length,
        breadth=payload.breadth,
        height=payload.height,
        actual_weight=payload.actual_weight,
        volumetric_weight=result["volumetric_weight"],
        billed_weight=result["billed_weight"],
        charge=result["total_charge"],
        order_type=payload.order_type,
        payment_type=payload.payment_type,
        status=OrderStatus.pending,
        pickup_zone_id=result["pickup_zone_id"],
        drop_zone_id=result["drop_zone_id"]
    )
    db.add(order)
    db.flush()  # get order.id before commit

    # immutable tracking log — first entry
    tracking = OrderTracking(
        order_id=order.id,
        status=OrderStatus.pending,
        actor_id=current_user.id,
        actor_role=current_user.role,
        note="Order placed by customer"
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order


# ── Get Order by ID ────────────────────────────────────
@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # customer can only see their own orders
    if current_user.role == UserRole.customer and order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return order


# ── Tracking Timeline ──────────────────────────────────
@router.get("/{order_id}/tracking", response_model=list[TrackingOut])
def get_tracking(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return db.query(OrderTracking).filter(
        OrderTracking.order_id == order_id
    ).order_by(OrderTracking.timestamp).all()


# ── Customer: list own orders ──────────────────────────
@router.get("/", response_model=list[OrderOut])
def list_my_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.customer:
        return db.query(Order).filter(
            Order.customer_id == current_user.id
        ).all()
    return db.query(Order).all()
# ── Customer: reschedule after failed delivery ─────────
@router.patch("/{order_id}/reschedule", response_model=OrderOut)
def reschedule_order(
    order_id: int,
    payload: RescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    if order.status != OrderStatus.failed:
        raise HTTPException(
            status_code=400,
            detail="Only failed orders can be rescheduled"
        )

    # Reset for reassignment
    order.status = OrderStatus.pending
    order.agent_id = None
    order.reschedule_date = payload.reschedule_date
    db.add(order)

    tracking = OrderTracking(
        order_id=order.id,
        status=OrderStatus.pending,
        actor_id=current_user.id,
        actor_role=current_user.role,
        note=f"Rescheduled by customer for {payload.reschedule_date.date()}"
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order