from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json

# Internal Imports
from database import get_session
from models import HeroSlide, CreatorVideo, OrderReturn, ProductVariant, Inventory, AdminUser, Product
from dependencies import oauth2_scheme, get_current_user, get_current_admin
from supabase_utils import upload_file_to_supabase

router = APIRouter()

from cloudinary_utils import upload_video_to_cloudinary, upload_image_to_cloudinary, upload_audio_to_cloudinary

@router.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...), 
    current_user: AdminUser = Depends(get_current_admin)
):
    # Route based on content type - USE CLOUDINARY for images, videos, and audio
    file_content = await file.read()
    
    if file.content_type and "video" in file.content_type:
        url = upload_video_to_cloudinary(file_content)
    elif file.content_type and "audio" in file.content_type:
        # Upload audio files (music)
        url = upload_audio_to_cloudinary(file_content)
    else:
        # Upload images to Cloudinary with WebP compression
        url = upload_image_to_cloudinary(file_content, folder="ciplx_images")

    if not url:
        raise HTTPException(status_code=500, detail="Upload failed")
    
    return {"url": url}

@router.post("/api/admin/migrate/manual")
def manual_migration(current_user: AdminUser = Depends(get_current_admin)):
    """
    Manually trigger schema migrations. 
    (Disabled: Migration files have been removed from the repository)
    """
    return {"ok": False, "message": "Manual migrations are disabled because migration files are not present."}


# --- Hero Slides ---

@router.post("/api/content/hero")
def create_hero_slide(
    title: str = Form(...),
    subtitle: str = Form(...),
    link_text: str = Form(...),
    link_url: str = Form(...),
    secondary_link_text: str = Form("Our Heritage"),
    secondary_link_url: str = Form("/heritage"),
    image_file: UploadFile = File(...),
    mobile_image_file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    try:
        # Upload images to Supabase
        print(f"Received hero upload: {title}")
        image_url = upload_file_to_supabase(image_file)
        if not image_url:
            raise Exception("Main image upload failed")
            
        mobile_image_url = None
        if mobile_image_file:
            mobile_image_url = upload_file_to_supabase(mobile_image_file)

        slide = HeroSlide(
            title=title,
            subtitle=subtitle,
            link_text=link_text,
            link_url=link_url,
            secondary_link_text=secondary_link_text,
            secondary_link_url=secondary_link_url,
            image=image_url,
            mobile_image=mobile_image_url
        )
        
        session.add(slide)
        session.commit()
        session.refresh(slide)
        print(f"Hero upload: Success! Slide ID = {slide.id}")
        return slide
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"Error in hero upload: {e}")
        print(f"Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Hero slide creation failed: {str(e)}")

@router.get("/api/content/hero")
def get_hero_slides(session: Session = Depends(get_session)):
    slides = session.exec(select(HeroSlide)).all()
    return slides

@router.delete("/api/content/hero/{slide_id}")
def delete_hero_slide(
    slide_id: int, 
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    slide = session.get(HeroSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    session.delete(slide)
    session.commit()
    return {"ok": True}

# --- Creator Videos ---

@router.get("/api/content/creators")
def get_creator_videos(session: Session = Depends(get_session)):
    videos = session.exec(select(CreatorVideo)).all()
    return videos

@router.post("/api/content/creators")
async def create_creator_video(
    name: str = Form(...),
    handle: str = Form(...),
    platform: str = Form(...),
    followers: str = Form(...),
    product_name: str = Form(...),
    video_file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    try:
        # Upload video to Cloudinary
        print(f"Received upload request for {name}")
        file_content = await video_file.read()
        video_url = upload_video_to_cloudinary(file_content)
        
        if not video_url:
            raise Exception("Cloudinary upload failed")

        # Create CreatorVideo object
        video = CreatorVideo(
            name=name,
            handle=handle,
            platform=platform,
            followers=followers,
            product_name=product_name,
            video_url=video_url,
            is_verified=True
        )

        session.add(video)
        session.commit()
        session.refresh(video)
        return video
    except Exception as e:
        print(f"Error in upload: {e}")
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail="Video upload failed. Please check server logs.")

@router.delete("/api/content/creators/{video_id}")
def delete_creator_video(
    video_id: int, 
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    video = session.get(CreatorVideo, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    session.delete(video)
    session.commit()
    return {"ok": True}

# --- Inventory & Variants (Admin) ---

@router.get("/api/products/{product_id}/variants", response_model=List[ProductVariant])
def get_product_variants(
    product_id: str,
    session: Session = Depends(get_session)
):
    """Get all variants for a product"""
    variants = session.exec(
        select(ProductVariant)
        .where(ProductVariant.product_id == product_id)
        .where(ProductVariant.is_available == True)
    ).all()
    
    return variants

@router.post("/api/products/{product_id}/variants", response_model=ProductVariant)
def add_product_variant(
    product_id: str,
    variant_data: ProductVariant,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Add variant to product (Admin only)"""
    # Verify product exists
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create variant
    new_variant = ProductVariant(
        product_id=product_id,
        sku=variant_data.sku,
        name=variant_data.name,
        price=variant_data.price,
        stock=variant_data.stock,
        attributes=variant_data.attributes,
        is_available=variant_data.is_available
    )
    
    session.add(new_variant)
    session.commit()
    session.refresh(new_variant)
    
    # Create inventory entry
    inventory = Inventory(
        variant_id=new_variant.id,
        stock=new_variant.stock,
        available=new_variant.stock
    )
    session.add(inventory)
    session.commit()
    
    return new_variant

@router.put("/api/variants/{variant_id}", response_model=ProductVariant)
def update_variant(
    variant_id: int,
    variant_data: ProductVariant,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Update product variant (Admin only)"""
    variant = session.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    variant.name = variant_data.name
    variant.sku = variant_data.sku
    variant.price = variant_data.price
    variant.stock = variant_data.stock
    variant.attributes = variant_data.attributes
    variant.is_available = variant_data.is_available
    
    session.add(variant)
    session.commit()
    session.refresh(variant)
    
    return variant

@router.delete("/api/variants/{variant_id}")
def delete_variant(
    variant_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Delete product variant (Admin only)"""
    variant = session.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    session.delete(variant)
    session.commit()
    
    return {"message": "Variant deleted successfully"}

@router.get("/api/inventory/{product_id}")
def get_inventory(
    product_id: str,
    session: Session = Depends(get_session)
):
    """Get inventory status for product/variants"""
    # Check product inventory
    product_inventory = session.exec(
        select(Inventory).where(Inventory.product_id == product_id)
    ).first()
    
    # Check variant inventories
    variants = session.exec(
        select(ProductVariant).where(ProductVariant.product_id == product_id)
    ).all()
    
    variant_inventories = []
    for variant in variants:
        inv = session.exec(
            select(Inventory).where(Inventory.variant_id == variant.id)
        ).first()
        if inv:
            variant_inventories.append({
                "variant_id": variant.id,
                "variant_name": variant.name,
                "sku": variant.sku,
                "stock": inv.stock,
                "reserved": inv.reserved,
                "available": inv.available
            })
    
    return {
        "product_id": product_id,
        "product_inventory": {
            "stock": product_inventory.stock if product_inventory else 0,
            "available": product_inventory.available if product_inventory else 0
        },
        "variants": variant_inventories
    }

# --- Admin Returns ---

@router.get("/api/returns", response_model=List[OrderReturn])
def get_all_returns(
    status: Optional[str] = None,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Get all return requests (Admin only)"""
    query = select(OrderReturn)
    
    if status:
        query = query.where(OrderReturn.status == status)
    
    returns = session.exec(query.order_by(OrderReturn.created_at.desc())).all()
    return returns

@router.put("/api/returns/{return_id}")
def update_return_status(
    return_id: int,
    status_data: Dict[str, Any],
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Update return status (Admin only)"""
    return_request = session.get(OrderReturn, return_id)
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    return_request.status = status_data.get("status", return_request.status)
    return_request.admin_notes = status_data.get("admin_notes")
    return_request.tracking_number = status_data.get("tracking_number")
    
    if status_data.get("status") in ["approved", "refunded", "rejected"]:
        return_request.processed_at = datetime.now(timezone.utc)
    
    session.add(return_request)
    session.commit()
    session.refresh(return_request)
    
    return return_request

@router.post("/api/returns/{return_id}/refund")
def process_refund(
    return_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Process refund for approved return (Admin only)"""
    return_request = session.get(OrderReturn, return_id)
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    if return_request.status != "approved":
        raise HTTPException(status_code=400, detail="Return must be approved first")

    import re as _re
    from models import Order, PaymentGateway
    order = session.exec(select(Order).where(Order.order_id == return_request.order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    refund_note = "COD order - please refund the customer manually (UPI/bank transfer)."
    gateway_refund_id = None
    if (order.payment_method or "").lower() == "online":
        # Find the Razorpay payment id saved in the order history ("Ref: pay_XXXX")
        match = _re.search(r"(pay_[A-Za-z0-9]+)", order.status_history or "")
        if match:
            gw = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "razorpay")).first()
            if not gw:
                raise HTTPException(status_code=500, detail="Razorpay gateway not configured")
            try:
                import razorpay
                creds = json.loads(gw.credentials_json or "{}")
                client = razorpay.Client(auth=(creds.get("key_id"), creds.get("key_secret")))
                amount_paise = int(round((return_request.refund_amount or 0) * 100))
                if amount_paise <= 0:
                    raise HTTPException(status_code=400, detail="Refund amount is zero")
                refund = client.payment.refund(match.group(1), {"amount": amount_paise})
                gateway_refund_id = refund.get("id")
                refund_note = f"Refunded via Razorpay (refund id {gateway_refund_id})"
            except HTTPException:
                raise
            except Exception as e:
                # Do NOT mark as refunded if the money was not sent back
                raise HTTPException(status_code=502, detail=f"Razorpay refund failed: {e}")
        elif _re.search(r"via\s+phonepe", order.status_history or "", _re.IGNORECASE):
            # PhonePe Standard Checkout v2 refund API
            import requests as _requests
            import uuid as _uuid
            from routes.orders import _phonepe_token
            gw = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "phonepe")).first()
            if not gw:
                raise HTTPException(status_code=500, detail="PhonePe gateway not configured")
            creds = json.loads(gw.credentials_json or "{}")
            amount_paise = int(round((return_request.refund_amount or 0) * 100))
            if amount_paise < 100:
                raise HTTPException(status_code=400, detail="PhonePe minimum refund is ₹1")
            if (creds.get("environment") or "SANDBOX").upper() == "PRODUCTION":
                refund_url = "https://api.phonepe.com/apis/pg/payments/v2/refund"
            else:
                refund_url = "https://api-preprod.phonepe.com/apis/pg-sandbox/payments/v2/refund"
            merchant_refund_id = f"RF-{order.order_id}-{_uuid.uuid4().hex[:6]}"[:63]
            try:
                token = _phonepe_token(creds)
                resp = _requests.post(
                    refund_url,
                    headers={"Content-Type": "application/json", "Authorization": f"O-Bearer {token}"},
                    json={
                        "merchantRefundId": merchant_refund_id,
                        "originalMerchantOrderId": order.order_id,
                        "amount": amount_paise,
                    },
                    timeout=30,
                )
                data = resp.json()
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=502, detail=f"PhonePe refund failed: {e}")
            state = (data.get("state") or "").upper()
            if resp.status_code >= 400 or state not in ("PENDING", "COMPLETED"):
                raise HTTPException(status_code=502, detail=f"PhonePe refund failed: {data.get('message') or data.get('code') or data}")
            gateway_refund_id = data.get("refundId") or merchant_refund_id
            refund_note = (f"Refund initiated via PhonePe (merchantRefundId {merchant_refund_id}, "
                           f"refundId {data.get('refundId')}, state {state}). "
                           f"Check status: GET /api/returns/{return_request.id}/refund-status")
        else:
            refund_note = "Online payment from an unknown gateway - please issue the refund from the gateway dashboard."

    return_request.status = "refunded"
    return_request.processed_at = datetime.now(timezone.utc)
    return_request.admin_notes = ((return_request.admin_notes or "") + f"\n{refund_note}").strip()
    
    session.add(return_request)
    session.commit()
    
    return {
        "message": refund_note,
        "refund_amount": return_request.refund_amount,
        "order_id": return_request.order_id,
        "gateway_refund_id": gateway_refund_id,
    }


@router.get("/api/returns/{return_id}/refund-status")
def phonepe_refund_status(
    return_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """Check a PhonePe refund status (Admin only)."""
    import re as _re
    import requests as _requests
    from models import PaymentGateway
    from routes.orders import _phonepe_token
    return_request = session.get(OrderReturn, return_id)
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    match = _re.search(r"merchantRefundId (RF-[A-Za-z0-9\-]+)", return_request.admin_notes or "")
    if not match:
        raise HTTPException(status_code=404, detail="No PhonePe refund found for this return")
    gw = session.exec(select(PaymentGateway).where(PaymentGateway.provider == "phonepe")).first()
    if not gw:
        raise HTTPException(status_code=500, detail="PhonePe gateway not configured")
    creds = json.loads(gw.credentials_json or "{}")
    base = ("https://api.phonepe.com/apis/pg" if (creds.get("environment") or "SANDBOX").upper() == "PRODUCTION"
            else "https://api-preprod.phonepe.com/apis/pg-sandbox")
    token = _phonepe_token(creds)
    data = _requests.get(
        f"{base}/payments/v2/refund/{match.group(1)}/status",
        headers={"Content-Type": "application/json", "Authorization": f"O-Bearer {token}"},
        timeout=30,
    ).json()
    return {"merchantRefundId": match.group(1), "state": data.get("state"), "amount": data.get("amount"),
            "refundId": data.get("refundId"), "errorCode": data.get("errorCode")}
