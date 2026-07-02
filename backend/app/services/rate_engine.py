from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.models import Pincode, RateCard, OrderType, PaymentType


def get_zone_from_pincode(pincode: str, db: Session):
    record = db.query(Pincode).filter(Pincode.pincode == pincode).first()
    if not record:
        raise HTTPException(
            status_code=400,
            detail=f"Pincode {pincode} not mapped to any zone. Contact admin."
        )
    return record.zone


def calculate_volumetric_weight(length: float, breadth: float, height: float) -> float:
    return round((length * breadth * height) / 5000, 3)


def get_rate_card(
    zone_id: int,
    order_type: OrderType,
    is_intra_zone: bool,
    db: Session
) -> RateCard:
    rate_card = db.query(RateCard).filter(
        RateCard.zone_id == zone_id,
        RateCard.order_type == order_type,
        RateCard.is_intra_zone == is_intra_zone
    ).first()

    if not rate_card:
        raise HTTPException(
            status_code=400,
            detail=f"No rate card configured for this zone/type combination. Contact admin."
        )
    return rate_card


def calculate_charge(
    pickup_pincode: str,
    drop_pincode: str,
    length: float,
    breadth: float,
    height: float,
    actual_weight: float,
    order_type: OrderType,
    payment_type: PaymentType,
    db: Session
) -> dict:
    # Step 1 — detect zones from pincodes
    pickup_zone = get_zone_from_pincode(pickup_pincode, db)
    drop_zone = get_zone_from_pincode(drop_pincode, db)

    # Step 2 — intra or inter zone?
    is_intra_zone = pickup_zone.id == drop_zone.id

    # Step 3 — volumetric weight
    volumetric_weight = calculate_volumetric_weight(length, breadth, height)

    # Step 4 — billed weight = max(actual, volumetric)
    billed_weight = max(actual_weight, volumetric_weight)

    # Step 5 — rate card lookup (use pickup zone for rate)
    rate_card = get_rate_card(pickup_zone.id, order_type, is_intra_zone, db)

    # Step 6 — base charge
    base_charge = round(billed_weight * rate_card.rate_per_kg, 2)

    # Step 7 — COD surcharge
    cod_surcharge = rate_card.cod_surcharge if payment_type == PaymentType.cod else 0.0

    # Step 8 — total
    total_charge = round(base_charge + cod_surcharge, 2)

    return {
        "pickup_zone": pickup_zone.name,
        "drop_zone": drop_zone.name,
        "is_intra_zone": is_intra_zone,
        "volumetric_weight": volumetric_weight,
        "billed_weight": billed_weight,
        "rate_per_kg": rate_card.rate_per_kg,
        "base_charge": base_charge,
        "cod_surcharge": cod_surcharge,
        "total_charge": total_charge,
        "pickup_zone_id": pickup_zone.id,
        "drop_zone_id": drop_zone.id
    }