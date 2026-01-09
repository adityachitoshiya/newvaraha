from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
import json
import traceback

# Internal Imports
from database import get_session
from models import Product, Review, AdminUser
from dependencies import get_current_user, oauth2_scheme, get_current_admin
from rapidshyp_utils import rapidshyp_client
import os

router = APIRouter()

# --- Helper Functions ---
def update_product_rating(product_id: str, session: Session):
    """Update product rating aggregation after review changes"""
    reviews = session.exec(
        select(Review).where(Review.product_id == product_id)
    ).all()
    
    product = session.get(Product, product_id)
    if not product:
        return
    
    if not reviews:
        product.average_rating = None
        product.total_reviews = 0
        product.rating_distribution = "{}"
    else:
        # Calculate average
        total_rating = sum(r.rating for r in reviews)
        product.average_rating = round(total_rating / len(reviews), 1)
        product.total_reviews = len(reviews)
        
        # Calculate distribution
        distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in reviews:
            distribution[str(review.rating)] += 1
        
        product.rating_distribution = json.dumps(distribution)
    
    session.add(product)
    session.commit()

# --- Schemas ---

class ReviewCreate(BaseModel):
    product_id: str
    customer_name: str
    rating: int
    comment: str
    media_urls: List[str] = []



@router.get("/api/products", response_model=List[Product])
def read_products(
    session: Session = Depends(get_session), 
    category: Optional[str] = None,
    metal: Optional[str] = None,
    style: Optional[str] = None,
    tag: Optional[str] = None,
    sort: Optional[str] = None,
    limit: Optional[int] = None
):
    query = select(Product)
    
    # Apply Filters
    if category:
        query = query.where(Product.category == category)
    if metal:
        query = query.where(Product.metal == metal)
    if style:
        query = query.where(Product.style == style)
    if tag:
        query = query.where(Product.tag == tag)
        
    # Apply Sorting
    if sort:
        if sort == 'newest':
            # Assuming higher ID means newer, or add created_at if available. 
            # Using ID for now as per frontend logic
            query = query.order_by(Product.id.desc())
        elif sort == 'price_asc':
            query = query.order_by(Product.price.asc())
        elif sort == 'price_desc':
            query = query.order_by(Product.price.desc())
        elif sort == 'rating':
            query = query.order_by(Product.average_rating.desc())
            
    # Apply Limit
    if limit:
        query = query.limit(limit)
        
    products = session.exec(query).all()
    return products

@router.get("/api/products/{product_id}", response_model=Product)
def read_product(product_id: str, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.post("/api/products", response_model=Product)
def create_product(product: Product, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    # Ensure rating fields have default values
    if not hasattr(product, 'average_rating') or product.average_rating is None:
        product.average_rating = None
    if not hasattr(product, 'total_reviews'):
        product.total_reviews = 0
    if not hasattr(product, 'rating_distribution') or not product.rating_distribution:
        product.rating_distribution = "{}"
    
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.put("/api/products/{product_id}", response_model=Product)
def update_product(product_id: str, product_data: Product, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product_data_dict = product_data.dict(exclude_unset=True)
    for key, value in product_data_dict.items():
        setattr(product, key, value)
    
    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.delete("/api/products/{product_id}")
def delete_product(product_id: str, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"ok": True}

# --- Review Routes ---

@router.post("/api/reviews", response_model=Dict)
def create_review(review_data: ReviewCreate, session: Session = Depends(get_session)):
    try:
        new_review = Review(
            product_id=review_data.product_id,
            customer_name=review_data.customer_name,
            rating=review_data.rating,
            comment=review_data.comment,
            media_urls=json.dumps(review_data.media_urls),
            created_at=datetime.utcnow()
        )
        session.add(new_review)
        session.commit()
        
        # Update product rating aggregation
        update_product_rating(review_data.product_id, session)
        
        return {"ok": True, "message": "Review submitted successfully"}
    except Exception as e:
        print(f"Error creating review: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/reviews/{product_id}")
def get_reviews(product_id: str, session: Session = Depends(get_session)):
    reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
    # Parse media_urls back to list
    return [
        {
            **review.dict(), 
            "media_urls": json.loads(review.media_urls)
        } for review in reviews
    ]

@router.delete("/api/reviews/{review_id}")
def delete_review(review_id: int, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    product_id = review.product_id
    session.delete(review)
    session.commit()
    
    # Update product rating after deletion
    update_product_rating(product_id, session)
    
    return {"ok": True}
