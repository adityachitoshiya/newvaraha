from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc
from typing import List, Optional

# Internal Imports
from database import get_session
from models import Notification, AdminUser
from dependencies import get_current_admin

router = APIRouter()

@router.get("/api/notifications", response_model=List[Notification])
def get_notifications(
    limit: int = 20,
    offset: int = 0,
    unread_only: bool = False,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """
    Get admin notifications.
    """
    query = select(Notification)
    
    if unread_only:
        query = query.where(Notification.is_read == False)
        
    query = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit)
    
    notifications = session.exec(query).all()
    return notifications

@router.get("/api/notifications/count")
def get_unread_count(
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """
    Get count of unread notifications.
    """
    query = select(Notification).where(Notification.is_read == False)
    results = session.exec(query).all()
    return {"count": len(results)}

@router.put("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """
    Mark a notification as read.
    """
    notification = session.get(Notification, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notification.is_read = True
    session.add(notification)
    session.commit()
    session.refresh(notification)
    return notification

@router.put("/api/notifications/read-all")
def mark_all_read(
    session: Session = Depends(get_session),
    current_user: AdminUser = Depends(get_current_admin)
):
    """
    Mark ALL unread notifications as read.
    """
    query = select(Notification).where(Notification.is_read == False)
    unread = session.exec(query).all()
    
    for note in unread:
        note.is_read = True
        session.add(note)
        
    session.commit()
    return {"status": "success", "marked_read": len(unread)}
