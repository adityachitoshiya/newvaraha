from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel

from database import get_session
from models import Promotion, Coupon, AdminUser
from dependencies import get_current_admin

router = APIRouter()


def _sync_coupon_to_db(session: Session, coupon_code: str, discount_type: str, discount_value: float, min_cart_value: float = None, max_discount: float = None, is_active: bool = True, payment_method_restriction: str = "none"):
    """Auto-create or update a Coupon row when an offer has a coupon_code."""
    if not coupon_code:
        return
    code = coupon_code.strip().upper()
    existing = session.exec(select(Coupon).where(Coupon.code == code)).first()
    # Map promotion discount_type -> coupon discount_type
    coupon_dtype = discount_type
    if discount_type == "flat":
        coupon_dtype = "fixed"
    if existing:
        existing.discount_type = coupon_dtype
        existing.discount_value = discount_value
        existing.is_active = is_active
        existing.min_order_amount = min_cart_value
        existing.max_discount = max_discount
        existing.payment_method_restriction = payment_method_restriction or "none"
        session.add(existing)
    else:
        from datetime import datetime
        new_coupon = Coupon(
            code=code,
            discount_type=coupon_dtype,
            discount_value=discount_value,
            is_active=is_active,
            min_order_amount=min_cart_value,
            max_discount=max_discount,
            payment_method_restriction=payment_method_restriction or "none",
            created_at=datetime.utcnow(),
        )
        session.add(new_coupon)


def _delete_synced_coupon(session: Session, coupon_code: str):
    """Remove the auto-created coupon when a promotion is deleted."""
    if not coupon_code:
        return
    code = coupon_code.strip().upper()
    existing = session.exec(select(Coupon).where(Coupon.code == code)).first()
    if existing:
        session.delete(existing)


# --- Public Routes ---

@router.get("/api/offers")
def get_active_offers(
    active: bool = True,
    category: Optional[str] = None,
    session: Session = Depends(get_session),
):
    """
    Public endpoint: Fetch offers for product pages / checkout.
    Supports optional category filter.
    """
    statement = select(Promotion)

    if active:
        statement = statement.where(Promotion.is_active == True)

    if category:
        statement = statement.where(
            (Promotion.category_restriction == None)
            | (Promotion.category_restriction == "")
            | (Promotion.category_restriction == category)
        )

    statement = statement.order_by(Promotion.sort_order, Promotion.id)
    offers = session.exec(statement).all()
    return offers


@router.post("/api/offers/validate")
def validate_offer(
    payload: dict,
    session: Session = Depends(get_session),
):
    """
    Public endpoint: Validate an offer/coupon at checkout.
    Expects: { coupon_code, cart_total, payment_method, category (optional) }
    Returns: { valid, discount_amount, error }
    """
    coupon_code = payload.get("coupon_code", "").strip().upper()
    cart_total = float(payload.get("cart_total", 0))
    payment_method = payload.get("payment_method", "online").lower()
    category = payload.get("category", None)

    if not coupon_code:
        return {"valid": False, "discount_amount": 0, "error": "No coupon code provided"}

    # Find offer by coupon code
    offer = session.exec(
        select(Promotion).where(
            Promotion.coupon_code == coupon_code,
            Promotion.is_active == True,
        )
    ).first()

    if not offer:
        return {"valid": False, "discount_amount": 0, "error": "Invalid or expired offer code"}

    # Check minimum cart value
    if offer.min_cart_value and cart_total < offer.min_cart_value:
        return {
            "valid": False,
            "discount_amount": 0,
            "error": f"Minimum cart value of ₹{int(offer.min_cart_value)} required",
        }

    # Check payment method restriction
    pm_restriction = offer.payment_method_restriction or "none"
    if pm_restriction != "none":
        allowed_methods = {
            "prepaid_only": ["online", "prepaid", "upi"],
            "upi_only": ["upi"],
            "cod_only": ["cod"],
        }
        allowed = allowed_methods.get(pm_restriction, [])
        if payment_method not in allowed:
            return {
                "valid": False,
                "discount_amount": 0,
                "error": f"This offer is valid only for {pm_restriction.replace('_', ' ')} payments",
            }

    # Check category restriction
    if offer.category_restriction and category:
        if offer.category_restriction.lower() != category.lower():
            return {
                "valid": False,
                "discount_amount": 0,
                "error": f"This offer is valid only for {offer.category_restriction} products",
            }

    # Calculate discount
    discount = 0.0
    if offer.discount_type == "percentage":
        discount = round((cart_total * offer.discount_value) / 100, 2)
    elif offer.discount_type == "flat":
        discount = min(offer.discount_value, cart_total)
    elif offer.discount_type == "bogo":
        # BOGO logic is handled at item level in checkout, just confirm valid
        discount = 0  # Frontend handles display, backend handles at order time
        return {"valid": True, "discount_amount": 0, "offer_type": "bogo", "message": "Buy-one-get-one applied"}

    # Cap: never let final amount go below ₹1
    max_allowed = max(0, cart_total - 1)
    if discount > max_allowed:
        discount = max_allowed

    return {"valid": True, "discount_amount": round(discount, 2)}


# --- Admin CRUD Routes ---

@router.get("/api/admin/promotions")
def list_promotions(
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin),
):
    """Admin: List all promotions (active + inactive)"""
    return session.exec(select(Promotion).order_by(Promotion.sort_order, Promotion.id)).all()


@router.post("/api/admin/promotions")
async def create_promotion(
    title: str = Form(...),
    highlight: str = Form(""),
    subtitle: str = Form(""),
    icon: str = Form("discount"),
    coupon_code: str = Form(""),
    discount_type: str = Form("percentage"),
    discount_value: float = Form(0),
    min_cart_value: float = Form(0),
    payment_method_restriction: str = Form("none"),
    category_restriction: str = Form(""),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
    icon_file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin),
):
    """Admin: Create a new promotion/offer"""
    try:
        icon_url = None
        if icon_file and icon_file.filename:
            from cloudinary_utils import upload_image_to_cloudinary
            file_content = await icon_file.read()
            icon_url = upload_image_to_cloudinary(file_content, folder="offer_icons")
            if not icon_url:
                raise Exception("Icon upload failed")

        promo = Promotion(
            title=title,
            highlight=highlight or None,
            subtitle=subtitle or None,
            icon=icon,
            icon_url=icon_url,
            coupon_code=coupon_code.strip().upper() if coupon_code.strip() else None,
            discount_type=discount_type,
            discount_value=discount_value,
            min_cart_value=min_cart_value if min_cart_value > 0 else None,
            payment_method_restriction=payment_method_restriction,
            category_restriction=category_restriction or None,
            is_active=is_active,
            sort_order=sort_order,
        )

        session.add(promo)

        # Auto-sync coupon to coupon table
        if promo.coupon_code:
            _sync_coupon_to_db(
                session, promo.coupon_code, promo.discount_type,
                promo.discount_value, promo.min_cart_value,
                max_discount=getattr(promo, 'max_discount', None),
                is_active=promo.is_active,
                payment_method_restriction=getattr(promo, 'payment_method_restriction', 'none'),
            )

        session.commit()
        session.refresh(promo)
        return promo

    except Exception as e:
        import traceback
        print(f"Promotion create error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to create promotion: {str(e)}")


@router.put("/api/admin/promotions/{promo_id}")
async def update_promotion(
    promo_id: int,
    title: str = Form(...),
    highlight: str = Form(""),
    subtitle: str = Form(""),
    icon: str = Form("discount"),
    coupon_code: str = Form(""),
    discount_type: str = Form("percentage"),
    discount_value: float = Form(0),
    min_cart_value: float = Form(0),
    payment_method_restriction: str = Form("none"),
    category_restriction: str = Form(""),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
    icon_file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin),
):
    """Admin: Update an existing promotion"""
    promo = session.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")

    # Save old coupon code before overwrite
    old_coupon_code = promo.coupon_code

    try:
        # Upload new icon if provided
        if icon_file and icon_file.filename:
            from cloudinary_utils import upload_image_to_cloudinary
            file_content = await icon_file.read()
            new_icon_url = upload_image_to_cloudinary(file_content, folder="offer_icons")
            if new_icon_url:
                promo.icon_url = new_icon_url

        promo.title = title
        promo.highlight = highlight or None
        promo.subtitle = subtitle or None
        promo.icon = icon
        promo.coupon_code = coupon_code.strip().upper() if coupon_code.strip() else None
        promo.discount_type = discount_type
        promo.discount_value = discount_value
        promo.min_cart_value = min_cart_value if min_cart_value > 0 else None
        promo.payment_method_restriction = payment_method_restriction
        promo.category_restriction = category_restriction or None
        promo.is_active = is_active
        promo.sort_order = sort_order

        # If coupon_code changed, remove old synced coupon
        if old_coupon_code and old_coupon_code != promo.coupon_code:
            _delete_synced_coupon(session, old_coupon_code)

        session.add(promo)

        # Auto-sync coupon to coupon table
        if promo.coupon_code:
            _sync_coupon_to_db(
                session, promo.coupon_code, promo.discount_type,
                promo.discount_value, promo.min_cart_value,
                max_discount=getattr(promo, 'max_discount', None),
                is_active=promo.is_active,
                payment_method_restriction=getattr(promo, 'payment_method_restriction', 'none'),
            )

        session.commit()
        session.refresh(promo)
        return promo

    except Exception as e:
        import traceback
        print(f"Promotion update error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to update promotion: {str(e)}")


@router.delete("/api/admin/promotions/{promo_id}")
def delete_promotion(
    promo_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin),
):
    """Admin: Delete a promotion"""
    promo = session.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    # Remove synced coupon
    _delete_synced_coupon(session, promo.coupon_code)
    session.delete(promo)
    session.commit()
    return {"ok": True, "message": "Promotion deleted"}


@router.patch("/api/admin/promotions/{promo_id}/toggle")
def toggle_promotion(
    promo_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin),
):
    """Admin: Quick toggle active/inactive"""
    promo = session.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    promo.is_active = not promo.is_active
    session.add(promo)
    # Sync coupon active state
    if promo.coupon_code:
        _sync_coupon_to_db(
            session, promo.coupon_code, promo.discount_type,
            promo.discount_value, promo.min_cart_value,
            max_discount=getattr(promo, 'max_discount', None),
            is_active=promo.is_active,
            payment_method_restriction=getattr(promo, 'payment_method_restriction', 'none'),
        )
    session.commit()
    session.refresh(promo)
    return promo
