from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime
from pydantic import BaseModel

# Internal Imports
from database import get_session
from models import Coupon, Promotion, AdminUser
from dependencies import get_current_admin

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
    # Expiry / usage limits (stored in CouponRule)
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None
    per_customer_limit: Optional[int] = None


VALID_DISCOUNT_TYPES = ("percentage", "fixed", "flat_price", "bogo")


class CouponCreateRequest(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float = 0
    min_order_amount: Optional[float] = None
    max_discount: Optional[float] = None
    payment_method_restriction: Optional[str] = "none"
    is_active: bool = True
    starts_at: Optional[str] = None
    expires_at: Optional[str] = None
    usage_limit: Optional[int] = None
    per_customer_limit: Optional[int] = None

@router.post("/api/coupons")
def create_coupon(
    data: CouponCreateRequest, 
    current_user: AdminUser = Depends(get_current_admin), 
    session: Session = Depends(get_session)
):
    """Create a new coupon (Admin only)"""
    from coupon_rules import upsert_rule, rule_to_dict
    code = (data.code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Coupon code is required")
    if data.discount_type not in VALID_DISCOUNT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid discount type")
    if data.discount_value < 0 or (data.discount_type == "percentage" and data.discount_value > 100):
        raise HTTPException(status_code=400, detail="Invalid discount value")
    existing = session.exec(select(Coupon).where(Coupon.code == code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")

    coupon = Coupon(
        code=code,
        discount_type=data.discount_type,
        discount_value=data.discount_value,
        min_order_amount=data.min_order_amount,
        max_discount=data.max_discount,
        payment_method_restriction=data.payment_method_restriction or "none",
        is_active=data.is_active,
    )
    session.add(coupon)
    upsert_rule(session, code, data.starts_at, data.expires_at, data.usage_limit, data.per_customer_limit)
    session.commit()
    session.refresh(coupon)
    return {**coupon.model_dump(mode="json"), **rule_to_dict(session, code)}

@router.get("/api/coupons")
def list_coupons(
    current_user: AdminUser = Depends(get_current_admin), 
    session: Session = Depends(get_session)
):
    """List all coupons with linked offer info (Admin only)"""
    from coupon_rules import rule_to_dict
    coupons = session.exec(select(Coupon)).all()
    result = []
    for c in coupons:
        data = {
            "id": c.id, "code": c.code, "discount_type": c.discount_type,
            "discount_value": c.discount_value, "is_active": c.is_active,
            "min_order_amount": c.min_order_amount, "max_discount": c.max_discount,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "linked_offer": None,
            "payment_method_restriction": c.payment_method_restriction or "none",
            **rule_to_dict(session, c.code),
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
    current_user: AdminUser = Depends(get_current_admin), 
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
    
    from models import CouponRule
    rule = session.get(CouponRule, coupon.code)
    if rule:
        session.delete(rule)
    session.delete(coupon)
    session.commit()
    return {"message": "Coupon deleted successfully"}


@router.put("/api/coupons/{coupon_id}")
def update_coupon(
    coupon_id: int,
    data: CouponUpdateRequest,
    current_user: AdminUser = Depends(get_current_admin),
    session: Session = Depends(get_session),
):
    """Update a coupon (Admin only)"""
    coupon = session.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")

    from coupon_rules import upsert_rule, rule_to_dict
    from models import CouponRule
    old_code = coupon.code
    if data.discount_type is not None and data.discount_type not in VALID_DISCOUNT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid discount type")

    # Safe updating using Pydantic model (avoids float() crash)
    if data.code is not None:
        new_code = data.code.strip().upper()
        if new_code != old_code and session.exec(select(Coupon).where(Coupon.code == new_code)).first():
            raise HTTPException(status_code=400, detail="Coupon code already exists")
        coupon.code = new_code
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

    # Rules: the admin form always sends all four fields (empty = no limit)
    if old_code != coupon.code:
        old_rule = session.get(CouponRule, old_code)
        if old_rule:
            session.delete(old_rule)
    upsert_rule(session, coupon.code, data.starts_at, data.expires_at, data.usage_limit, data.per_customer_limit)

    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return {**coupon.model_dump(mode="json"), **rule_to_dict(session, coupon.code)}


@router.get("/api/coupons/param/{code}")
def validate_coupon(
    code: str, 
    email: Optional[str] = None,
    phone: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Validate a coupon code (Public). email/phone (optional) enable the per-customer limit check."""
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

    # Expiry / usage limits
    from coupon_rules import check_coupon_rules, get_rule
    check_coupon_rules(session, coupon.code, email, phone)
    _rule = get_rule(session, coupon.code)

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
        "expires_at": (_rule.expires_at.isoformat() + "Z") if _rule and _rule.expires_at else None,
        "valid": True
    }
