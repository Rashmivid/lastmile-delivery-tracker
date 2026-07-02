from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from app.models.models import UserRole, OrderType, PaymentType, OrderStatus


# ── Auth ───────────────────────────────────────────────
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    phone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Zone ───────────────────────────────────────────────
class ZoneCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ZoneOut(BaseModel):
    id: int
    name: str
    description: Optional[str]

    class Config:
        from_attributes = True


# ── Pincode ────────────────────────────────────────────
class PincodeCreate(BaseModel):
    pincode: str
    area_name: Optional[str] = None
    zone_id: int


class PincodeOut(BaseModel):
    id: int
    pincode: str
    area_name: Optional[str]
    zone_id: int

    class Config:
        from_attributes = True


# ── Rate Card ──────────────────────────────────────────
class RateCardCreate(BaseModel):
    zone_id: int
    order_type: OrderType
    is_intra_zone: bool
    rate_per_kg: float
    cod_surcharge: float = 0.0


class RateCardOut(BaseModel):
    id: int
    zone_id: int
    order_type: OrderType
    is_intra_zone: bool
    rate_per_kg: float
    cod_surcharge: float

    class Config:
        from_attributes = True


# ── Order ──────────────────────────────────────────────
class OrderCreate(BaseModel):
    pickup_address: str
    pickup_pincode: str
    drop_address: str
    drop_pincode: str
    length: float
    breadth: float
    height: float
    actual_weight: float
    order_type: OrderType
    payment_type: PaymentType


class ChargePreview(BaseModel):
    volumetric_weight: float
    billed_weight: float
    rate_per_kg: float
    base_charge: float
    cod_surcharge: float
    total_charge: float
    pickup_zone: str
    drop_zone: str
    is_intra_zone: bool


class OrderConfirm(BaseModel):
    pickup_address: str
    pickup_pincode: str
    drop_address: str
    drop_pincode: str
    length: float
    breadth: float
    height: float
    actual_weight: float
    order_type: OrderType
    payment_type: PaymentType


class OrderOut(BaseModel):
    id: int
    customer_id: int
    agent_id: Optional[int]
    pickup_address: str
    pickup_pincode: str
    drop_address: str
    drop_pincode: str
    actual_weight: float
    volumetric_weight: float
    billed_weight: float
    charge: float
    order_type: OrderType
    payment_type: PaymentType
    status: OrderStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ── Tracking ───────────────────────────────────────────
class TrackingOut(BaseModel):
    id: int
    order_id: int
    status: OrderStatus
    actor_role: Optional[UserRole]
    note: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Status Update ──────────────────────────────────────
class StatusUpdate(BaseModel):
    status: OrderStatus
    note: Optional[str] = None


# ── Reschedule ─────────────────────────────────────────
class RescheduleRequest(BaseModel):
    reschedule_date: datetime