from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Order, OrderTracking, OrderStatus, User, UserRole
from app.schemas.schemas import StatusUpdate, OrderOut, TrackingOut
from app.services.auth_service import require_role
from app.services.email_service import send_status_email

router = APIRouter(prefix="/agent", tags=["Agent"])


# ── Agent: view assigned orders ────────────────────────
@router.get("/orders", response_model=list[OrderOut])
def get_assigned_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.agent))
):
    return db.query(Order).filter(
        Order.agent_id == current_user.id
    ).all()


# ── Agent: update order status ─────────────────────────
@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    payload: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.agent))
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.agent_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your assigned order")

    # Valid transitions for agent
    valid_transitions = {
        OrderStatus.assigned: [OrderStatus.picked_up],
        OrderStatus.picked_up: [OrderStatus.in_transit],
        OrderStatus.in_transit: [OrderStatus.out_for_delivery],
        OrderStatus.out_for_delivery: [OrderStatus.delivered, OrderStatus.failed],
    }

    allowed = valid_transitions.get(order.status, [])
    if payload.status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot transition from {order.status.value} to {payload.status.value}"
        )

    # Update order status
    order.status = payload.status
    db.add(order)

    # Immutable tracking log entry
    tracking = OrderTracking(
        order_id=order.id,
        status=payload.status,
        actor_id=current_user.id,
        actor_role=UserRole.agent,
        note=payload.note
    )
    db.add(tracking)
    db.commit()
    db.refresh(order)
    send_status_email(order.customer.email, order.id, order.status.value, order.customer.name)
    return order