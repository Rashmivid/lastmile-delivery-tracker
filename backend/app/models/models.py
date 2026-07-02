from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    customer = "customer"
    agent = "agent"
    admin = "admin"


class OrderType(str, enum.Enum):
    B2B = "B2B"
    B2C = "B2C"


class PaymentType(str, enum.Enum):
    prepaid = "prepaid"
    cod = "cod"


class OrderStatus(str, enum.Enum):
    pending = "pending"
    assigned = "assigned"
    picked_up = "picked_up"
    in_transit = "in_transit"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    failed = "failed"
    rescheduled = "rescheduled"


# ── Users ──────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.customer)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    orders = relationship("Order", back_populates="customer",
                          foreign_keys="Order.customer_id")
    agent_assignments = relationship("Order", back_populates="agent",
                                     foreign_keys="Order.agent_id")


# ── Zones & Pincodes ───────────────────────────────────
class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pincodes = relationship("Pincode", back_populates="zone")
    rate_cards = relationship("RateCard", back_populates="zone")


class Pincode(Base):
    __tablename__ = "pincodes"

    id = Column(Integer, primary_key=True, index=True)
    pincode = Column(String, unique=True, nullable=False, index=True)
    area_name = Column(String, nullable=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)

    zone = relationship("Zone", back_populates="pincodes")


# ── Rate Cards ─────────────────────────────────────────
class RateCard(Base):
    __tablename__ = "rate_cards"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    order_type = Column(Enum(OrderType), nullable=False)      # B2B or B2C
    is_intra_zone = Column(Boolean, nullable=False)           # True = intra, False = inter
    rate_per_kg = Column(Float, nullable=False)
    cod_surcharge = Column(Float, default=0.0)                # flat amount per COD order
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    zone = relationship("Zone", back_populates="rate_cards")


# ── Orders ─────────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    agent_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Addresses
    pickup_address = Column(String, nullable=False)
    pickup_pincode = Column(String, nullable=False)
    drop_address = Column(String, nullable=False)
    drop_pincode = Column(String, nullable=False)

    # Package details
    length = Column(Float, nullable=False)
    breadth = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    actual_weight = Column(Float, nullable=False)

    # Calculated
    volumetric_weight = Column(Float, nullable=False)
    billed_weight = Column(Float, nullable=False)
    charge = Column(Float, nullable=False)

    # Order config
    order_type = Column(Enum(OrderType), nullable=False)
    payment_type = Column(Enum(PaymentType), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.pending)

    # Zone info (stored at order time)
    pickup_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)
    drop_zone_id = Column(Integer, ForeignKey("zones.id"), nullable=True)

    # Reschedule
    reschedule_date = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("User", back_populates="orders",
                            foreign_keys=[customer_id])
    agent = relationship("User", back_populates="agent_assignments",
                         foreign_keys=[agent_id])
    tracking_history = relationship("OrderTracking", back_populates="order")


# ── Order Tracking (immutable log) ─────────────────────
class OrderTracking(Base):
    __tablename__ = "order_tracking"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    status = Column(Enum(OrderStatus), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # who changed it
    actor_role = Column(Enum(UserRole), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="tracking_history")