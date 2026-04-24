from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional, Dict
from pydantic import BaseModel
from datetime import datetime
import json
import traceback
import re
import unicodedata

# Internal Imports
from database import get_session
from models import Product, Review, AdminUser
from dependencies import get_current_user, oauth2_scheme, get_current_admin
from rapidshyp_utils import rapidshyp_client
import os

router = APIRouter()

# --- Helper Functions ---
def generate_slug(name: str) -> str:
    """Convert product name to URL-friendly slug."""
    # Normalize unicode characters
    name = unicodedata.normalize('NFKD', name)
    name = name.encode('ascii', 'ignore').decode('ascii')
    # Lowercase
    name = name.lower()
    # Replace spaces and special chars with hyphens
    name = re.sub(r'[^a-z0-9]+', '-', name)
    # Strip leading/trailing hyphens
    name = name.strip('-')
    return name

def unique_slug(base_slug: str, exclude_id: str, session: Session) -> str:
    """Ensure slug is unique; append number if collision."""
    slug = base_slug
    counter = 1
    while True:
        existing = session.exec(select(Product).where(Product.slug == slug)).first()
        if not existing or existing.id == exclude_id:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1

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

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    metal: Optional[str] = None
    carat: Optional[str] = None
    stones: Optional[str] = None
    polish: Optional[str] = None
    premium: Optional[bool] = None
    tag: Optional[str] = None
    style: Optional[str] = None
    image: Optional[str] = None
    additional_images: Optional[str] = None
    gender: Optional[str] = None
    collection: Optional[str] = None
    product_type: Optional[str] = None
    mrp: Optional[float] = None
    colour: Optional[str] = None
    is_mega_deal: Optional[bool] = None


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
    # First try by primary key (ID)
    product = session.get(Product, product_id)
    if not product:
        # Fallback: try lookup by slug
        product = session.exec(select(Product).where(Product.slug == product_id)).first()
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

    # Auto-generate slug from name if not provided
    if not product.slug and product.name:
        base = generate_slug(product.name)
        product.slug = unique_slug(base, product.id or "", session)

    session.add(product)
    session.commit()
    session.refresh(product)
    return product

@router.post("/api/products/bulk")
def bulk_create_products(products: List[Product], current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    """Bulk create products from CSV/JSON upload"""
    import time
    created = []
    errors = []
    
    for idx, product in enumerate(products):
        try:
            # Generate unique ID if not provided
            if not product.id:
                product.id = f"PROD-{int(time.time())}-{idx}"
            
            # Set defaults
            if product.average_rating is None:
                product.average_rating = None
            if not product.total_reviews:
                product.total_reviews = 0
            if not product.rating_distribution:
                product.rating_distribution = "{}"
            if not product.additional_images:
                product.additional_images = "[]"
            if product.stock is None:
                product.stock = 0
                
            session.add(product)
            created.append(product.id)
        except Exception as e:
            errors.append({"row": idx + 1, "name": product.name, "error": str(e)})
    
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=f"Database error: {str(e)}")
    
    return {
        "success": len(created),
        "errors": errors,
        "created_ids": created
    }

@router.put("/api/products/{product_id}", response_model=Product)
def update_product(product_id: str, product_data: ProductUpdate, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Only update fields that were explicitly sent (not None)
    update_data = product_data.dict(exclude_none=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    # Regenerate slug if name was updated and slug not explicitly provided
    if 'name' in update_data and 'slug' not in update_data:
        base = generate_slug(product.name)
        product.slug = unique_slug(base, product_id, session)

    # Generate slug if product still lacks one
    if not product.slug and product.name:
        base = generate_slug(product.name)
        product.slug = unique_slug(base, product_id, session)

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

@router.patch("/api/products/{product_id}/spotlight")
def toggle_spotlight(product_id: str, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    """Toggle whether a product appears in the homepage spotlight"""
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_spotlight = not product.is_spotlight
    session.add(product)
    session.commit()
    session.refresh(product)
    return {"ok": True, "is_spotlight": product.is_spotlight}

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
    try:
        reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
        # If no reviews found, try resolving product_id as a slug
        if not reviews:
            product = session.exec(select(Product).where(Product.slug == product_id)).first()
            if product:
                reviews = session.exec(select(Review).where(Review.product_id == product.id)).all()
        # Parse media_urls back to list
        result = []
        for review in reviews:
            review_data = review.model_dump() if hasattr(review, 'model_dump') else review.dict()
            review_data["media_urls"] = json.loads(review.media_urls) if review.media_urls else []
            result.append(review_data)
        return result
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        traceback.print_exc()
        # Return empty list instead of crashing
        return []

from pydantic import BaseModel

class BulkReviewUploadRequest(BaseModel):
    csv_data: str

import csv
import io

@router.post("/api/reviews/{product_id}/bulk")
def bulk_upload_reviews(product_id: str, request: BulkReviewUploadRequest, current_user: AdminUser = Depends(get_current_admin), session: Session = Depends(get_session)):
    """Bulk upload reviews from CSV string"""
    try:
        # Check if product exists
        product = session.get(Product, product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Parse CSV
        f = io.StringIO(request.csv_data)
        reader = csv.DictReader(f)
        
        # Verify required headers
        required_headers = ['customer_name', 'rating', 'comment']
        if not reader.fieldnames or not all(h in [fn.strip() for fn in reader.fieldnames] for h in required_headers):
            raise HTTPException(status_code=400, detail=f"CSV must contain headers: {', '.join(required_headers)}")

        created_count = 0
        errors = []

        for idx, row in enumerate(reader, start=2): # Start at 2 for 1-based index including header
            try:
                # Clean keys
                clean_row = {k.strip(): v for k, v in row.items() if k}
                
                name = clean_row.get('customer_name', '').strip()
                rating_str = clean_row.get('rating', '').strip()
                comment = clean_row.get('comment', '').strip()
                
                if not name or not rating_str or not comment:
                    errors.append(f"Row {idx}: Missing required fields")
                    continue
                    
                try:
                    rating = int(rating_str)
                    if rating < 1 or rating > 5:
                        errors.append(f"Row {idx}: Rating must be between 1 and 5")
                        continue
                except ValueError:
                    errors.append(f"Row {idx}: Invalid rating number")
                    continue

                new_review = Review(
                    product_id=product_id,
                    customer_name=name,
                    rating=rating,
                    comment=comment,
                    media_urls="[]",
                    created_at=datetime.utcnow()
                )
                session.add(new_review)
                created_count += 1
                
            except Exception as row_e:
                errors.append(f"Row {idx}: {str(row_e)}")

        session.commit()
        
        # Update product aggregate rating only if reviews were actually created
        if created_count > 0:
            update_product_rating(product_id, session)

        return {
            "success": True, 
            "message": f"Successfully created {created_count} reviews.", 
            "created": created_count,
            "errors": errors
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing bulk reviews: {e}")
        traceback.print_exc()
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        for review in reviews:
            review_data = review.model_dump() if hasattr(review, 'model_dump') else review.dict()
            review_data["media_urls"] = json.loads(review.media_urls) if review.media_urls else []
            result.append(review_data)
        return result
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        traceback.print_exc()
        # Return empty list instead of crashing
        return []

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
