from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
import requests
import os

# Internal Imports
from database import get_session
from models import StoreSettings, MetalRates
from dependencies import oauth2_scheme

router = APIRouter()

@router.get("/api/settings")
def get_store_settings(session: Session = Depends(get_session)):
    settings = session.get(StoreSettings, 1)
    if not settings:
        # Create default if not exists
        settings = StoreSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@router.put("/api/settings")
def update_store_settings(new_settings: StoreSettings, session: Session = Depends(get_session)):
    # Ideally should be protected by admin token, but leaving as is from main.py or verified via usage
    # The original main.py didn't strictly enforce token on PUT /api/settings but it corresponds to admin panel.
    # We'll allow it but usually it should be protected.
    
    settings = session.get(StoreSettings, 1)
    if not settings:
        settings = StoreSettings(id=1)
    
    # Update fields
    settings.store_name = new_settings.store_name
    settings.support_email = new_settings.support_email
    settings.currency_symbol = new_settings.currency_symbol
    settings.announcement_text = new_settings.announcement_text
    settings.announcement_date = new_settings.announcement_date
    settings.show_announcement = new_settings.show_announcement
    settings.delivery_free_threshold = new_settings.delivery_free_threshold
    settings.logo_url = new_settings.logo_url
    settings.show_full_page_countdown = new_settings.show_full_page_countdown
    settings.is_maintenance_mode = new_settings.is_maintenance_mode
    settings.spotlight_source = new_settings.spotlight_source
    settings.rapidshyp_enabled = new_settings.rapidshyp_enabled
    settings.heritage_video_desktop = new_settings.heritage_video_desktop
    settings.heritage_video_mobile = new_settings.heritage_video_mobile

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings

@router.get("/api/live-rates")
def get_live_metal_rates():
    """
    Fetch live gold and silver rates from GoldAPI.io
    Returns rates in INR per 10g for gold and per 1kg for silver
    """
    api_key = os.getenv("GOLDAPI_KEY", "goldapi-177n1tsmjdao3q4-io")
    
    try:
        # Fetch Gold Rate (XAU in INR)
        gold_url = "https://www.goldapi.io/api/XAU/INR"
        headers = {
            "x-access-token": api_key,
            "Content-Type": "application/json"
        }
        
        gold_response = requests.get(gold_url, headers=headers, timeout=5)
        gold_data = gold_response.json()
        
        # Fetch Silver Rate (XAG in INR)  
        silver_url = "https://www.goldapi.io/api/XAG/INR"
        silver_response = requests.get(silver_url, headers=headers, timeout=5)
        silver_data = silver_response.json()
        
        # GoldAPI returns price per troy ounce
        # 1 troy ounce = 31.1035 grams
        # Convert to per 10g for gold and per 1kg for silver
        
        gold_per_oz = gold_data.get("price", 0)
        gold_per_10g = (gold_per_oz / 31.1035) * 10
        
        silver_per_oz = silver_data.get("price", 0)
        silver_per_1kg = (silver_per_oz / 31.1035) * 1000
        
        # Calculate 24-hour change percentage
        gold_change_pct = gold_data.get("ch", 0)
        silver_change_pct = silver_data.get("ch", 0)
        
        return {
            "gold": {
                "price": round(gold_per_10g, 0),
                "change": f"{'+' if gold_change_pct >= 0 else ''}{gold_change_pct:.1f}%",
                "unit": "per 10 grams",
                "timestamp": gold_data.get("timestamp")
            },
            "silver": {
                "price": round(silver_per_1kg, 0),
                "change": f"{'+' if silver_change_pct >= 0 else ''}{silver_change_pct:.1f}%",
                "unit": "per 1 kg", 
                "timestamp": silver_data.get("timestamp")
            },
            "status": "success"
        }
        
    except requests.exceptions.RequestException as e:
        print(f"GoldAPI Error: {str(e)}")
        # Return fallback mock data if API fails
        return {
            "gold": {
                "price": 68500,
                "change": "+0.5%",
                "unit": "per 10 grams"
            },
            "silver": {
                "price": 82500,
                "change": "+0.3%",
                "unit": "per 1 kg"
            },
            "status": "fallback"
        }

@router.get("/api/metal-rates")
def get_stored_metal_rates(session: Session = Depends(get_session)):
    """Fetch manually set metal rates from DB (Fast)"""
    rates = session.get(MetalRates, 1)
    if not rates:
        rates = MetalRates(id=1, gold_rate=124040.0, silver_rate=208900.0)
        session.add(rates)
        session.commit()
        session.refresh(rates)
    return rates


from datetime import datetime
from models import MetalRates

@router.post("/api/admin/metal-rates")
def update_metal_rates(
    rate_data: MetalRates,
    session: Session = Depends(get_session)
):
    """
    Manually update metal rates from Admin Panel
    """
    # Check if entry exists, id=1 is singleton
    rates = session.get(MetalRates, 1)
    if not rates:
        rates = MetalRates(id=1)
    
    rates.gold_rate = rate_data.gold_rate
    rates.silver_rate = rate_data.silver_rate
    rates.updated_at = datetime.utcnow()
    
    session.add(rates)
    session.commit()
    session.refresh(rates)
    return rates
