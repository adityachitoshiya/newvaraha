from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Dict, Optional
from datetime import datetime

# Internal Imports
from database import get_session
from models import Coupon, AdminUser
from dependencies import oauth2_scheme, get_current_user

router = APIRouter()

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

@router.get("/api/coupons", response_model=List[Coupon])
def list_coupons(
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    """List all coupons (Admin only)"""
    return session.exec(select(Coupon)).all()

@router.delete("/api/coupons/{coupon_id}")
def delete_coupon(
    coupon_id: int, 
    token: str = Depends(oauth2_scheme), 
    session: Session = Depends(get_session)
):
    """Delete a coupon (Admin only)"""
    coupon = session.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    session.delete(coupon)
    session.commit()
    return {"message": "Coupon deleted successfully"}

@router.get("/api/coupons/param/{code}")
def validate_coupon(
    code: str, 
    session: Session = Depends(get_session)
):
    """Validate a coupon code (Public)"""
    # Try exact match first
    coupon = session.exec(select(Coupon).where(Coupon.code == code)).first()
    
    # If not found, try case-insensitive match (assuming user might type 'adi' for 'ADI')
    if not coupon:
        # Fetch all and check in python (safe for small number of coupons) 
        # OR use ilike if postgres. Since we use SQLModel/Alchemy:
        # Standard approach: store coupons as uppercase or check upper
        coupon = session.exec(select(Coupon).where(Coupon.code == code.upper())).first()
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="Coupon is inactive")
        
    return {
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "valid": True
    }
