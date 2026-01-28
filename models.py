from __future__ import annotations
from typing import Optional, List
from sqlmodel import Field, SQLModel
from datetime import datetime
import json

class ProductBase(SQLModel):
    name: str = Field(index=True)
    description: Optional[str] = None
    price: Optional[float] = None
    stock: int = 0  # Available stock quantity
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
    average_rating: Optional[float] = None  # Calculated average rating
    total_reviews: int = 0  # Total number of reviews
    rating_distribution: str = "{}"  # JSON: {"5": 10, "4": 5, "3": 2, "2": 1, "1": 0}

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
    email_status: str = "pending" # pending, sent, failed
    payment_method: str = "cod"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    items_json: str
    status_history: str = "[]" # JSON string of list of objects {status, timestamp, comment}

import uuid

class Order(OrderBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(index=True, unique=True)
    shipping_id: Optional[str] = None # RapidShyp Order ID
    awb_number: Optional[str] = None
    courier_name: Optional[str] = None
    tracking_data: Optional[str] = None # JSON array of scan activities
    user_id: Optional[uuid.UUID] = Field(default=None, index=True)
    label_url: Optional[str] = None
    manifest_url: Optional[str] = None
    
    # Tax & Location Fields
    state: Optional[str] = None
    hsn_code: str = "7117"
    taxable_value: float = 0.0
    cgst_amount: float = 0.0
    sgst_amount: float = 0.0
    igst_amount: float = 0.0

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
    telegram_id: Optional[str] = None # For Telegram Login
    supabase_uid: Optional[str] = Field(default=None, index=True, unique=True) # Link to Supabase Auth UUID
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Review(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: str = Field(index=True)
    customer_name: str
    rating: int
    comment: str
    media_urls: str = "[]" # JSON string of list of URLs
    helpful_count: int = 0  # Number of users who found this helpful
    verified_purchase: bool = False  # Whether reviewer bought the product
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
    spotlight_source: str = "featured"  # 'featured' or 'new_arrivals'
    rapidshyp_enabled: str = "false"  # Enable/disable RapidShyp API calls
    heritage_video_desktop: Optional[str] = None
    heritage_video_mobile: Optional[str] = None
    ciplx_video_desktop: Optional[str] = None
    ciplx_video_mobile: Optional[str] = None
    ciplx_images_json: str = "[]" # JSON string of list of URLs
    ciplx_music_url: Optional[str] = None # Background music for slideshow
    ciplx_music_volume: float = 0.4 # Music volume (0.0 to 1.0)
    gstin: Optional[str] = "08CBRPC0024J1ZT" # Updated to real GSTIN



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

# Wishlist Model
class Wishlist(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    product_id: str = Field(foreign_key="product.id", index=True)
    added_at: datetime = Field(default_factory=datetime.utcnow)

# Address Management Model
class Address(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    label: str  # "Home", "Office", "Other"
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"
    is_default: bool = False
    address_type: str = "both"  # "shipping", "billing", "both"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Product Variant Model
class ProductVariant(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    product_id: str = Field(foreign_key="product.id", index=True)
    sku: str = Field(unique=True, index=True)
    name: str  # e.g., "18K Gold - Ring Size 7"
    price: Optional[float] = None  # If None, use product price
    stock: int = 0
    attributes: str = "{}"  # JSON: {"size": "7", "metal": "18K Gold", "weight": "5g"}
    is_available: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Inventory Tracking Model
class Inventory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    variant_id: Optional[int] = Field(default=None, foreign_key="productvariant.id", index=True)
    product_id: Optional[str] = Field(default=None, foreign_key="product.id", index=True)  # For products without variants
    stock: int = 0
    reserved: int = 0  # Items in cart but not ordered
    available: int = 0  # stock - reserved
    low_stock_threshold: int = 5
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Order Return/Refund Model
class OrderReturn(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: str = Field(foreign_key="order.order_id", index=True)
    customer_id: int = Field(foreign_key="customer.id", index=True)
    reason: str
    description: Optional[str] = None
    status: str = "pending"  # pending, approved, rejected, refunded, cancelled
    refund_amount: float
    refund_method: str = "original"  # original, wallet, bank
    return_items: str = "[]"  # JSON list of items being returned
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None
    admin_notes: Optional[str] = None
    tracking_number: Optional[str] = None  # For return shipment
    shipment_id: Optional[str] = None # RapidShyp Shipment ID
    label_url: Optional[str] = None # Return label URL


# ==========================================
# 💰 METAL RATES MODEL  
# ==========================================

class MetalRates(SQLModel, table=True):
    """Store current gold and silver rates for display"""
    id: Optional[int] = Field(default=None, primary_key=True)
    gold_rate: float = Field(default=124040.0)  # 22 Carat per 10g
    silver_rate: float = Field(default=208900.0)  # 999 Purity per 1kg
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SystemSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
  # Admin username

class FlashPincode(SQLModel, table=True):
    """PIN codes eligible for Flash Delivery (2-4 hours)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    pincode: str = Field(index=True, unique=True)
    area_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BlockedRegion(SQLModel, table=True):
    """Regions blocked from accessing the website (Geo-blocking)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    region_code: str = Field(index=True, unique=True)  # ISO code like 'GJ', 'MH'
    region_name: str  # Full name like 'Gujarat', 'Maharashtra'
    is_blocked: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VerificationCode(SQLModel, table=True):
    """Store generated OTPs for custom verification flow"""
    phone: str = Field(primary_key=True)
    code: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)
    attempts: int = 0
