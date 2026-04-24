from __future__ import annotations
from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class CategoryBase(SQLModel):
    name: str = Field(index=True, unique=True)
    display_name: str  # Hindi/Display name
    gender: Optional[str] = Field(default=None, index=True)  # "Men", "Women", or None for both
    description: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Category(CategoryBase, table=True):
    __table_args__ = {'extend_existing': True}
    id: Optional[int] = Field(default=None, primary_key=True)
