from fastapi import APIRouter, Depends, HTTPException, Body
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel
import uuid
import logging

from database import get_session
from models import Wishlist, Product
from auth_middleware import get_current_user_token

router = APIRouter()
logger = logging.getLogger(__name__)

class WishlistItem(BaseModel):
    product_id: str

class SyncItem(BaseModel):
    product_id: str

class SyncRequest(BaseModel):
    items: List[SyncItem]

@router.get("/api/wishlist", response_model=List[str])
async def get_wishlist(
    user_token: dict = Depends(get_current_user_token),
    session: Session = Depends(get_session)
):
    try:
        user_id = uuid.UUID(user_token["sub"]) # Validates User ID from token
        
        statement = select(Wishlist.product_id).where(Wishlist.user_id == user_id)
        results = session.exec(statement).all()
        
        return results
    except Exception as e:
        logger.error(f"Error fetching wishlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch wishlist")

@router.post("/api/wishlist")
async def add_to_wishlist(
    item: WishlistItem,
    user_token: dict = Depends(get_current_user_token),
    session: Session = Depends(get_session)
):
    try:
        user_id = uuid.UUID(user_token["sub"])
        
        # Check if already exists
        statement = select(Wishlist).where(
            Wishlist.user_id == user_id, 
            Wishlist.product_id == item.product_id
        )
        existing = session.exec(statement).first()
        
        if existing:
            return {"message": "Already in wishlist"}
            
        # Add new item
        new_item = Wishlist(
            user_id=user_id,
            product_id=item.product_id
        )
        session.add(new_item)
        session.commit()
        
        return {"message": "Added to wishlist"}
    except Exception as e:
        logger.error(f"Error adding to wishlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add to wishlist")

@router.delete("/api/wishlist/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    user_token: dict = Depends(get_current_user_token),
    session: Session = Depends(get_session)
):
    try:
        user_id = uuid.UUID(user_token["sub"])
        
        statement = select(Wishlist).where(
            Wishlist.user_id == user_id, 
            Wishlist.product_id == product_id
        )
        item = session.exec(statement).first()
        
        if item:
            session.delete(item)
            session.commit()
            return {"message": "Removed from wishlist"}
            
        return {"message": "Item not found in wishlist"}
    except Exception as e:
        logger.error(f"Error removing from wishlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove from wishlist")

@router.post("/api/wishlist/sync")
async def sync_wishlist(
    sync_data: SyncRequest,
    user_token: dict = Depends(get_current_user_token),
    session: Session = Depends(get_session)
):
    """
    Syncs local wishlist items with server after login.
    Does NOT delete items from server, only adds missing ones.
    """
    try:
        user_id = uuid.UUID(user_token["sub"])
        
        added_count = 0
        current_ids = session.exec(select(Wishlist.product_id).where(Wishlist.user_id == user_id)).all()
        current_ids_set = set(current_ids)
        
        for item in sync_data.items:
            if item.product_id not in current_ids_set:
                new_item = Wishlist(user_id=user_id, product_id=item.product_id)
                session.add(new_item)
                added_count += 1
                
        if added_count > 0:
            session.commit()
            
        # Return updated full list
        updated_list = session.exec(select(Wishlist.product_id).where(Wishlist.user_id == user_id)).all()
        return updated_list
        
    except Exception as e:
        logger.error(f"Error syncing wishlist: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to sync wishlist")
