from __future__ import annotations
from typing import Optional, List
from sqlmodel import Field, SQLModel
from datetime import datetime
import json

class ProductBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = Field(default=None, index=True)
    metal: Optional[str] = None
    carat: Optional[str] = None
    stones: Optional[str] = None
    polish: Optional[str] = None
    premium: bool = False
    tag: Optional[str] = None
    style: Optional[str] = None
    image: str
    additional_images: str = "[]" # JSON string of list of URLs

class Product(ProductBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)

class OrderBase(SQLModel):
    customer_name: str
    email: str
    phone: str
    address: str
    city: str
    pincode: str
    total_amount: float
    status: str = "pending"
    payment_method: str = "cod"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    items_json: str
    status_history: str = "[]" # JSON string of list of objects {status, timestamp, comment}

class Order(OrderBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(index=True, unique=True)
    shipping_id: Optional[str] = None # RapidShyp Order ID
    awb_number: Optional[str] = None
    courier_name: Optional[str] = None

class AdminUser(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str

# New Dynamic Gateway Model
class PaymentGateway(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True) # User defined name e.g. "Primary Razorpay"
    provider: str # "razorpay", "phonepe", "pinelabs", "custom"
    is_active: bool = False
    
    # Store dynamic fields as JSON string
    # e.g. {"key_id": "...", "secret": "..."}
    credentials_json: str = "{}" 
    
class Notification(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    message: str
    is_read: bool = False
    order_id: Optional[str] = None # Link to order
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str
    email: str = Field(index=True, unique=True)
    hashed_password: Optional[str] = None # Nullable for social login
    provider: str = "email" # email, google, facebook
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: str = Field(index=True)
    customer_name: str
    rating: int
    comment: str
    media_urls: str = "[]" # JSON string of list of URLs
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Coupon(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True, unique=True)
    discount_type: str # 'percentage', 'fixed', 'flat_price'
    discount_value: float
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
class VisitorLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ip_hash: str = Field(index=True)
    path: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    date: str = Field(index=True) # YYYY-MM-DD for easy grouping

class HeroSlide(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    image: str
    mobile_image: Optional[str] = None
    title: str
    subtitle: str
    link_text: str = "Explore Collections"
    link_url: str = "/collections/all"
    order: int = 0

class CreatorVideo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    handle: str
    platform: str # 'instagram' or 'youtube'
    followers: str
    video_url: str
    product_name: str
    is_verified: bool = True

class StoreSettings(SQLModel, table=True):
    id: Optional[int] = Field(default=1, primary_key=True)
    store_name: str = "Varaha Jewels"
    support_email: str = "support@varahajewels.com"
    currency_symbol: str = "₹"
    announcement_text: str = "Grand Launch In:"
    announcement_date: str = "2026-02-12T00:00:00"
    show_announcement: bool = True
    delivery_free_threshold: float = 1000.0
    logo_url: str = "/varaha-assets/logo.png"
    show_full_page_countdown: bool = True
    is_maintenance_mode: bool = False



class ActiveVisitor(SQLModel, table=True):
    ip_hash: str = Field(primary_key=True)
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    path: str

class Cart(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CartItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cart_id: int = Field(foreign_key="cart.id", index=True)
    product_id: str = Field(foreign_key="product.id")
    quantity: int = 1
    variant_sku: Optional[str] = None # For future proofing if variants are added
    added_at: datetime = Field(default_factory=datetime.utcnow)
