from fastapi import APIRouter, Depends, Request
from sqlmodel import Session, select
from datetime import datetime
import hashlib

# Internal Imports
from database import get_session
from models import VisitorLog
from pydantic import BaseModel

router = APIRouter()

class VisitRequest(BaseModel):
    path: str

@router.post("/api/track-visit")
async def track_visit(
    request: Request,
    visit_data: VisitRequest,
    session: Session = Depends(get_session)
):
    # Get Client IP
    client_ip = request.client.host if request.client else "unknown"
    
    # Hash IP for basic privacy
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    
    # Create log entry
    log = VisitorLog(
        ip_hash=ip_hash,
        path=visit_data.path,
        date=datetime.utcnow().strftime("%Y-%m-%d")
    )
    
    session.add(log)
    session.commit()
    
    return {"status": "success"}

from sqlalchemy import func, text

@router.get("/api/analytics")
def get_analytics(session: Session = Depends(get_session)):
    # 1. Total Visits (All Time)
    total_visits = session.exec(select(func.count(VisitorLog.id))).one()
    
    # 2. Daily Stats (Last 30 Days)
    # Using raw SQL for date grouping as it's cleaner across DBs
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
    
    # 3. Active Users (approximate by unique IPs in last 5 minutes)
    # Since we store simple iso dates, we'll approximate 'active' as 'today's unique visitors' 
    # OR we can add timestamp column if needed. 
    # For now, let's use unique IPs today as a proxy or just recent entries if we had timestamp.
    # Current VisitorLog has (ip_hash, path, date).
    # We will just return unique IPs today as "Active Today"
    
    today_str = datetime.utcnow().strftime("%Y-%m-%d")
    active_query = select(func.count(VisitorLog.ip_hash.distinct())).where(VisitorLog.date == today_str)
    active_users = session.exec(active_query).one()

    return {
        "active_users": active_users,
        "total_visits": total_visits,
        "daily_stats": daily_stats
    }

@router.get("/api/analytics/logs")
def get_logs(limit: int = 50, session: Session = Depends(get_session)):
    query = select(VisitorLog).order_by(VisitorLog.timestamp.desc()).limit(limit)
    logs = session.exec(query).all()
    return logs
