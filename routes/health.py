from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from database import get_session
from datetime import datetime
from sqlalchemy import text

router = APIRouter()

@router.get("/api/health")
async def health_check(session: Session = Depends(get_session)):
    """
    Check system health and database connectivity.
    """
    status_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "database": "unknown"
    }
    
    try:
        # Check DB connection by executing a simple query
        session.exec(text("SELECT 1"))
        status_data["database"] = "connected"
    except Exception as e:
        status_data["database"] = "disconnected"
        status_data["status"] = "degraded"
        status_data["error"] = str(e)
        
    return status_data
