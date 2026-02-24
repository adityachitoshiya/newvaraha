from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select
from datetime import datetime
import hashlib
import requests
import logging

logger = logging.getLogger(__name__)

# Internal Imports
from database import get_session
from models import VisitorLog
from pydantic import BaseModel
from sqlalchemy import func, text

router = APIRouter()

class VisitRequest(BaseModel):
    path: str

def get_geo_from_ip(ip: str) -> dict:
    """Fetch city, state, country from IP using ip-api.com (free, 45 req/min)"""
    try:
        if ip in ("127.0.0.1", "unknown", "::1"):
            return {"city": "Local", "state": "Local", "country": "Local"}
        
        res = requests.get(f"http://ip-api.com/json/{ip}?fields=status,city,regionName,country", timeout=3)
        data = res.json()
        
        if data.get("status") == "success":
            return {
                "city": data.get("city", "Unknown"),
                "state": data.get("regionName", "Unknown"),
                "country": data.get("country", "Unknown")
            }
    except Exception as e:
        logger.warning(f"Geo lookup failed for IP: {e}")
    
    return {"city": None, "state": None, "country": None}

@router.post("/api/track-visit")
async def track_visit(
    request: Request,
    visit_data: VisitRequest,
    session: Session = Depends(get_session)
):
    # Get Client IP
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "unknown"
    
    # Skip localhost/development traffic
    if client_ip in ("127.0.0.1", "::1", "unknown", "localhost"):
        return {"status": "skipped", "reason": "localhost"}
    
    # Hash IP for privacy
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    
    # Fetch geo-location
    geo = get_geo_from_ip(client_ip)
    
    # Skip geo-blocked regions
    try:
        from models import BlockedRegion
        blocked_regions = session.exec(
            select(BlockedRegion).where(BlockedRegion.is_blocked == True)
        ).all()
        blocked_names = {r.region_name.lower() for r in blocked_regions}
        blocked_codes = {r.region_code.lower() for r in blocked_regions}
        
        visitor_state = (geo.get("state") or "").lower()
        visitor_country = (geo.get("country") or "").lower()
        
        if visitor_state in blocked_names or visitor_state in blocked_codes or \
           visitor_country in blocked_names or visitor_country in blocked_codes:
            return {"status": "skipped", "reason": "blocked_region"}
    except Exception as e:
        logger.warning(f"Blocked region check failed: {e}")
    
    # Create log entry
    log = VisitorLog(
        ip_hash=ip_hash,
        path=visit_data.path,
        date=datetime.utcnow().strftime("%Y-%m-%d"),
        city=geo.get("city"),
        state=geo.get("state"),
        country=geo.get("country")
    )
    
    session.add(log)
    session.commit()
    
    return {"status": "success"}


@router.get("/api/analytics")
def get_analytics(session: Session = Depends(get_session)):
    # 1. Total Visits (All Time)
    total_visits = session.exec(select(func.count(VisitorLog.id))).one()
    
    # 2. Daily Stats (Last 30 Days)
    daily_query = text("""
        SELECT date, COUNT(*) as count 
        FROM visitorlog 
        GROUP BY date 
        ORDER BY date DESC 
        LIMIT 30
    """)
    daily_results = session.exec(daily_query).all()
    
    daily_stats = [
        {"date": str(row[0]), "visits": row[1]} 
        for row in daily_results
    ]
    
    # 3. Active Users (unique IPs today)
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    active_query = select(func.count(VisitorLog.ip_hash.distinct())).where(VisitorLog.date == today_str)
    active_users = session.exec(active_query).one()

    return {
        "active_users": active_users,
        "total_visits": total_visits,
        "daily_stats": daily_stats
    }


@router.get("/api/analytics/geo")
def get_geo_analytics(session: Session = Depends(get_session)):
    """Get visitor location analytics - top states and countries"""
    
    # Top States (India)
    state_query = text("""
        SELECT state, COUNT(*) as count, COUNT(DISTINCT ip_hash) as unique_visitors
        FROM visitorlog 
        WHERE state IS NOT NULL AND state != '' AND state != 'Local'
        GROUP BY state 
        ORDER BY count DESC 
        LIMIT 20
    """)
    state_results = session.exec(state_query).all()
    top_states = [
        {"state": row[0], "visits": row[1], "unique_visitors": row[2]}
        for row in state_results
    ]
    
    # Top Countries
    country_query = text("""
        SELECT country, COUNT(*) as count, COUNT(DISTINCT ip_hash) as unique_visitors
        FROM visitorlog 
        WHERE country IS NOT NULL AND country != '' AND country != 'Local'
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 15
    """)
    country_results = session.exec(country_query).all()
    top_countries = [
        {"country": row[0], "visits": row[1], "unique_visitors": row[2]}
        for row in country_results
    ]
    
    # Top Cities
    city_query = text("""
        SELECT city, state, COUNT(*) as count
        FROM visitorlog 
        WHERE city IS NOT NULL AND city != '' AND city != 'Local'
        GROUP BY city, state 
        ORDER BY count DESC 
        LIMIT 15
    """)
    city_results = session.exec(city_query).all()
    top_cities = [
        {"city": row[0], "state": row[1], "visits": row[2]}
        for row in city_results
    ]
    
    return {
        "top_states": top_states,
        "top_countries": top_countries,
        "top_cities": top_cities
    }


@router.get("/api/analytics/logs")
def get_logs(limit: int = 50, session: Session = Depends(get_session)):
    query = select(VisitorLog).order_by(VisitorLog.timestamp.desc()).limit(limit)
    logs = session.exec(query).all()
    return logs
