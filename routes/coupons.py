from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

# Internal Imports
from database import get_session
from models import Coupon, Promotion, AdminUser
from dependencies import oauth2_scheme, get_current_user

router = APIRouter()


# Pydantic model for safe coupon updates (avoids 422 & float() crash)
class CouponUpdateRequest(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    is_active: Optional[bool] = None
    min_order_amount: Optional[float] = None
    max_discount: Optional[float] = None
    payment_method_restriction: Optional[str] = None

@router.post("/api/coupons", response_model=Coupon)
def create_coupon(
    coupon: Coupon, 
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    """Create a new coupon (Admin only)"""
    # Check if code already exists
    existing = session.exec(select(Coupon).where(Coupon.code == coupon.code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon

@router.get("/api/coupons")
def list_coupons(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    """List all coupons with linked offer info (Admin only)"""
    coupons = session.exec(select(Coupon)).all()
    result = []
    for c in coupons:
        data = {
            "id": c.id, "code": c.code, "discount_type": c.discount_type,
            "discount_value": c.discount_value, "is_active": c.is_active,
            "min_order_amount": c.min_order_amount, "max_discount": c.max_discount,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "linked_offer": None,
            "payment_method_restriction": c.payment_method_restriction or "none"
        }
        promo = session.exec(
            select(Promotion).where(Promotion.coupon_code == c.code)
        ).first()
        if promo:
            data["linked_offer"] = {
                "id": promo.id, "title": promo.title,
                "is_active": promo.is_active
            }
        result.append(data)
    return result

@router.delete("/api/coupons/{coupon_id}")
def delete_coupon(
    coupon_id: int, 
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    """Delete a coupon (Admin only). Blocks deletion of offer-linked coupons."""
    coupon = session.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    # Block deletion if coupon is linked to a promotion
    promo = session.exec(
        select(Promotion).where(Promotion.coupon_code == coupon.code)
    ).first()
    if promo:
        raise HTTPException(
            status_code=400,
            detail=f"This coupon is linked to offer '{promo.title}'. Delete or edit the offer instead."
        )
    
    session.delete(coupon)
    session.commit()
    return {"message": "Coupon deleted successfully"}


@router.put("/api/coupons/{coupon_id}")
def update_coupon(
    coupon_id: int,
    data: CouponUpdateRequest,
    token: str = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
):
    """Update a coupon (Admin only)"""
    coupon = session.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    # Safe updating using Pydantic model (avoids float() crash)
    if data.code is not None:
        coupon.code = data.code.strip().upper()
    if data.discount_type is not None:
        coupon.discount_type = data.discount_type
    if data.discount_value is not None:
        coupon.discount_value = data.discount_value
    if data.is_active is not None:
        coupon.is_active = data.is_active
    if data.min_order_amount is not None:
        coupon.min_order_amount = data.min_order_amount
    if data.max_discount is not None:
        coupon.max_discount = data.max_discount
    if data.payment_method_restriction is not None:
        coupon.payment_method_restriction = data.payment_method_restriction or "none"

    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon


@router.get("/api/coupons/param/{code}")
def validate_coupon(
    code: str, 
    session: Session = Depends(get_session)
):
    """Validate a coupon code (Public)"""
    # Try exact match first
    coupon = session.exec(select(Coupon).where(Coupon.code == code)).first()
    
    # If not found, try case-insensitive match
    if not coupon:
        coupon = session.exec(select(Coupon).where(Coupon.code == code.upper())).first()
    
    # Check if this coupon is linked to a promotion for restrictions
    promo = session.exec(
        select(Promotion).where(
            Promotion.coupon_code == code.upper(),
            Promotion.is_active == True
        )
    ).first()

    # If coupon not found in coupon table but exists as active promotion, auto-sync it
    if not coupon and promo:
        from .promotions import _sync_coupon_to_db
        _sync_coupon_to_db(
            session, promo.coupon_code, promo.discount_type,
            promo.discount_value, promo.min_cart_value,
            is_active=True,
        )
        session.commit()
        coupon = session.exec(select(Coupon).where(Coupon.code == code.upper())).first()

    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    # If coupon is inactive but linked promotion is active, auto-fix the sync
    if not coupon.is_active and promo:
        coupon.is_active = True
        session.add(coupon)
        session.commit()
        session.refresh(coupon)
    elif not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is inactive")

    payment_restriction = "none"
    if promo:
        payment_restriction = promo.payment_method_restriction or "none"
    elif hasattr(coupon, 'payment_method_restriction') and coupon.payment_method_restriction:
        payment_restriction = coupon.payment_method_restriction

    # Check min_order_amount from coupon or linked promotion
    min_order = coupon.min_order_amount
    if not min_order and promo and promo.min_cart_value:
        min_order = promo.min_cart_value

    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "min_order_amount": min_order,
        "max_discount": coupon.max_discount,
        "payment_method_restriction": payment_restriction,
        "valid": True
    }
