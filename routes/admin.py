from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
import json

# Internal Imports
from database import get_session
from models import HeroSlide, CreatorVideo, OrderReturn, ProductVariant, Inventory, AdminUser
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
    Useful if startup hooks failed or for production hot-fixing.
    """
    results = []
    try:
        from migration_add_gender_collection import run_migration as run_gender_migration
        from migrate_categories import create_category_table
        
        print("🔧 Triggering Manual Migrations...")
        
        # 1. Product Gender Columns
        try:
            run_gender_migration()
            results.append("Product Gender Migration: Success")
        except Exception as e:
            results.append(f"Product Gender Migration Failed: {str(e)}")
            
        # 2. Categories Table
        try:
            create_category_table()
            results.append("Category Table Migration: Success")
        except Exception as e:
             results.append(f"Category Migration Failed: {str(e)}")
             
        return {"ok": True, "results": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Hero Slides ---

@router.post("/api/content/hero")
def create_hero_slide(
    title: str = Form(...),
    subtitle: str = Form(...),
    link_text: str = Form(...),
    link_url: str = Form(...),
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
        return_request.processed_at = datetime.utcnow()
    
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
    
    # Update status to refunded
    return_request.status = "refunded"
    return_request.processed_at = datetime.utcnow()
    
    session.add(return_request)
    session.commit()
    
    return {
        "message": "Refund processed successfully",
        "refund_amount": return_request.refund_amount,
        "order_id": return_request.order_id
    }
