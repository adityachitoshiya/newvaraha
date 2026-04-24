from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from typing import List
from database import get_session
from category_model import Category, CategoryBase
from datetime import datetime

router = APIRouter()

@router.get("/api/categories", response_model=List[Category])
def get_categories(
    gender: str = None,
    active_only: bool = True,
    session: Session = Depends(get_session)
):
    """Get all categories, optionally filtered by gender"""
    statement = select(Category)
    
    if active_only:
        statement = statement.where(Category.is_active == True)
    
    if gender:
        # Get categories for specific gender or categories available for both
        statement = statement.where(
            (Category.gender == gender) | (Category.gender == None)
        )
    
    statement = statement.order_by(Category.sort_order, Category.name)
    categories = session.exec(statement).all()
    return categories

@router.get("/api/categories/{category_id}", response_model=Category)
def get_category(category_id: int, session: Session = Depends(get_session)):
    """Get a specific category"""
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category

@router.post("/api/categories", response_model=Category)
def create_category(category: CategoryBase, session: Session = Depends(get_session)):
    """Create a new category"""
    # Check if category name already exists
    existing = session.exec(
        select(Category).where(Category.name == category.name)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    db_category = Category.from_orm(category)
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

@router.put("/api/categories/{category_id}", response_model=Category)
def update_category(
    category_id: int,
    category_update: CategoryBase,
    session: Session = Depends(get_session)
):
    """Update a category"""
    db_category = session.get(Category, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if new name conflicts with another category
    if category_update.name != db_category.name:
        existing = session.exec(
            select(Category).where(Category.name == category_update.name)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Category name already exists")
    
    category_data = category_update.dict(exclude_unset=True)
    for key, value in category_data.items():
        setattr(db_category, key, value)
    
    session.add(db_category)
    session.commit()
    session.refresh(db_category)
    return db_category

@router.delete("/api/categories/{category_id}")
def delete_category(category_id: int, session: Session = Depends(get_session)):
    """Delete a category"""
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    session.delete(category)
    session.commit()
    return {"message": "Category deleted successfully"}
