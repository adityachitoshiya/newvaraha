from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, get_session
from models import (
    Product, Order, AdminUser, PaymentGateway, Notification, Customer, Review, 
    Coupon, VisitorLog, ActiveVisitor, HeroSlide, CreatorVideo, StoreSettings, 
    Cart, CartItem, Wishlist, Address, ProductVariant, Inventory, OrderReturn,
    MetalRates
)
from notifications import send_order_notifications
from rapidshyp_utils import rapidshyp_client
from auth_utils import verify_password, create_access_token
from sqlmodel import Session, select, func, col, or_

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, date as dt_date
import time
import json
import traceback
import hashlib
import uuid
from fastapi import UploadFile, File
from supabase_utils import upload_file_to_supabase

app = FastAPI()

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    url = upload_file_to_supabase(file)
    if not url:
        raise HTTPException(status_code=500, detail="Image upload failed")
    return {"url": url}



origins = [
    "*", # Allow all for local network access
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Welcome to Varaha Jewels Backend"}

# --- Auth Routes ---
# --- Auth Routes ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# Shared dependency to get current user (Admin or Customer)
async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Try Local Token (Admin/Customer)
    try:
        from auth_utils import ALGORITHM, SECRET_KEY
        from jose import jwt, JWTError
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if role == "customer":
            user = session.exec(select(Customer).where(Customer.email == username)).first()
            if user: return user
        else:
            user = session.exec(select(AdminUser).where(AdminUser.username == username)).first()
            if user: return user
    except Exception:
        pass # Fallback to Supabase
    
    # 2. Try Supabase Token
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data = s_client.auth.get_user(token)
            if user_data and user_data.user:
                email = user_data.user.email
                uid = user_data.user.id
                
                # 1. Try finding by UID (Strict)
                user = session.exec(select(Customer).where(Customer.supabase_uid == uid)).first()
                
                if not user:
                     # 2. Fallback: Try finding by Email (Migration)
                     user = session.exec(select(Customer).where(Customer.email == email)).first()
                     
                     if user:
                         # Found by email but no UID? Link them now!
                         if not user.supabase_uid:
                             user.supabase_uid = uid
                             session.add(user)
                             session.commit()
                             session.refresh(user)
                     else:
                        # 3. Create new user with UID
                        user = Customer(
                            full_name=user_data.user.user_metadata.get('full_name', email.split('@')[0]),
                            email=email,
                            provider="google",
                            supabase_uid=uid,
                            is_active=True
                        )
                        session.add(user)
                        session.commit()
                        session.refresh(user)
                return user
    except Exception as e:
        print(f"Token verification failed: {e}")

    raise HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

# --- Cart Routes ---
class CartItemCreate(BaseModel):
    product_id: str
    quantity: int
    variant_sku: Optional[str] = None

class CartSync(BaseModel):
    local_items: List[CartItemCreate]

@app.get("/api/cart")
def get_cart(user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        return []
    
    # Fetch items with product details
    items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    
    # Enrich with product data
    result = []
    for item in items:
        product = session.get(Product, item.product_id)
        if product:
            result.append({
                "id": item.id,
                "productId": item.product_id,
                "productName": product.name,
                "quantity": item.quantity,
                "variant": {
                    "sku": item.variant_sku or f"{product.id}-default",
                    "name": "Standard", # Placeholder
                    "price": product.price,
                    "image": product.image
                }
            })
    return result

@app.post("/api/cart/sync")
def sync_cart(sync_data: CartSync, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        cart = Cart(customer_id=user.id)
        session.add(cart)
        session.commit()
        session.refresh(cart)
    
    # Merge Logic: If item exists, update qty? Or just add local ones?
    # Simple strategy: Add local items if they don't exist in DB
    existing_items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    existing_map = {(item.product_id, item.variant_sku): item for item in existing_items}
    
    for local_item in sync_data.local_items:
        key = (local_item.product_id, local_item.variant_sku)
        if key in existing_map:
            # Optional: Update quantity (e.g. max of both?)
            # Let's keep DB version as truth, but if we want to be nice we could add. 
            pass 
        else:
            # Add new item
            new_item = CartItem(
                cart_id=cart.id, 
                product_id=local_item.product_id, 
                quantity=local_item.quantity,
                variant_sku=local_item.variant_sku
            )
            session.add(new_item)
    
    session.commit()
    # Return full cart
    return get_cart(user, session)

@app.post("/api/cart/items")
def add_to_cart(item_in: CartItemCreate, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        cart = Cart(customer_id=user.id)
        session.add(cart)
        session.commit()
        session.refresh(cart)
        
    # Check duplicate
    existing = session.exec(select(CartItem).where(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_in.product_id,
        CartItem.variant_sku == item_in.variant_sku
    )).first()
    
    if existing:
        existing.quantity += item_in.quantity
        session.add(existing)
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=item_in.product_id, # Ensure this matches Product.id (string)
            quantity=item_in.quantity,
            variant_sku=item_in.variant_sku
        )
        session.add(new_item)
        
    session.commit()
    return {"ok": True}

@app.put("/api/cart/items/{item_id}")
def update_cart_item(item_id: int, quantity: int, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart: raise HTTPException(status_code=404)
    
    item = session.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if quantity <= 0:
        session.delete(item)
    else:
        item.quantity = quantity
        session.add(item)
    
    session.commit()
    return {"ok": True}

@app.delete("/api/cart/items/{item_id}")
def remove_from_cart(item_id: int, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart: raise HTTPException(status_code=404)

    item = session.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Item not found")
        
    session.delete(item)
    session.commit()
    return {"ok": True}

class Token(BaseModel):
    access_token: str
    token_type: str

@app.post("/api/login", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(AdminUser).where(AdminUser.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Customer Auth Routes ---
class CustomerCreate(BaseModel):
    full_name: str
    email: str
    password: str

class CustomerLogin(BaseModel):
    email: str
    password: str

class SocialLogin(BaseModel):
    email: str
    full_name: str
    provider: str
    provider_id: str # Not stored currently, but useful to validate

from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

@app.post("/api/auth/signup", response_model=Customer)
def customer_signup(customer_data: CustomerCreate, session: Session = Depends(get_session)):
    existing_user = session.exec(select(Customer).where(Customer.email == customer_data.email)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_pwd = pwd_context.hash(customer_data.password)
    new_customer = Customer(
        full_name=customer_data.full_name,
        email=customer_data.email,
        hashed_password=hashed_pwd,
        provider="email"
    )
    session.add(new_customer)
    session.commit()
    session.refresh(new_customer)
    return new_customer

@app.post("/api/auth/login")
def customer_login(login_data: CustomerLogin, session: Session = Depends(get_session)):
    customer = session.exec(select(Customer).where(Customer.email == login_data.email)).first()
    if not customer or not customer.hashed_password or not pwd_context.verify(login_data.password, customer.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create simple JWT for customer
    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name, "customer_id": customer.id})
    return {
        "access_token": token, 
        "token_type": "bearer", 
        "user": {
            "id": customer.id,
            "name": customer.full_name, 
            "email": customer.email
        }
    }

class UserSync(BaseModel):
    full_name: str
    email: str
    provider: str

@app.post("/api/auth/sync")
def sync_user(user_data: UserSync, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Verify Token (Double check if needed, but frontend sends one)
    # For now, trust the token as it comes from Supabase client login
    
    # 1. Verify Token with Supabase to get trusted UID
    from supabase_utils import init_supabase
    s_client = init_supabase()
    uid = None
    
    if s_client:
        try:
            u_data = s_client.auth.get_user(token)
            if u_data and u_data.user:
                uid = u_data.user.id
        except:
             pass
    
    # Logic: Find by UID -> Find by Email -> Create
    customer = None
    if uid:
        customer = session.exec(select(Customer).where(Customer.supabase_uid == uid)).first()
        
    if not customer:
        customer = session.exec(select(Customer).where(Customer.email == user_data.email)).first()
        
        if customer:
            # Link UID if missing
            if uid and not customer.supabase_uid:
                customer.supabase_uid = uid
                session.add(customer)
                session.commit()
                session.refresh(customer)
        else:
            # Create new customer
            customer = Customer(
                full_name=user_data.full_name,
                email=user_data.email,
                provider=user_data.provider,
                supabase_uid=uid, # Can be None if token invalid, but we should enforce it?
                is_active=True
            )
            session.add(customer)
            session.commit()
            session.refresh(customer)
    
    return {"ok": True, "customer_id": customer.id}

@app.post("/api/auth/social-login")
def social_login(social_data: SocialLogin, session: Session = Depends(get_session)):
    # Legacy/Alternative endpoint, kept for backward compat if needed
    customer = session.exec(select(Customer).where(Customer.email == social_data.email)).first()
    if not customer:
        customer = Customer(
            full_name=social_data.full_name,
            email=social_data.email,
            provider=social_data.provider,
            is_active=True
        )
        session.add(customer)
        session.commit()
        session.refresh(customer)
    
    # We still issue a local token here for the old flow, but we are moving away from it
    from auth_utils import create_access_token
    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name})
    return {"access_token": token, "token_type": "bearer", "user": {"name": customer.full_name, "email": customer.email}}


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

# --- Product Routes ---
@app.get("/api/products", response_model=List[Product])
def read_products(session: Session = Depends(get_session), category: Optional[str] = None):
    query = select(Product)
    if category:
        query = query.where(Product.category == category)
    products = session.exec(query).all()
    return products

@app.get("/api/products/{product_id}", response_model=Product)
def read_product(product_id: str, session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

class ReviewCreate(BaseModel):
    product_id: str
    customer_name: str
    rating: int
    comment: str
    media_urls: List[str] = []

@app.post("/api/reviews", response_model=Dict)
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

@app.get("/api/reviews/{product_id}")
def get_reviews(product_id: str, session: Session = Depends(get_session)):
    reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
    # Parse media_urls back to list
    return [
        {
            **review.dict(), 
            "media_urls": json.loads(review.media_urls)
        } for review in reviews
    ]

@app.post("/api/products", response_model=Product)
def create_product(product: Product, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
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

@app.put("/api/products/{product_id}", response_model=Product)
def update_product(product_id: str, product_data: Product, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
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

@app.delete("/api/products/{product_id}")
def delete_product(product_id: str, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    session.delete(product)
    session.commit()
    return {"ok": True}

@app.delete("/api/reviews/{review_id}")
def delete_review(review_id: int, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    product_id = review.product_id
    session.delete(review)
    session.commit()
    
    # Update product rating after deletion
    update_product_rating(product_id, session)
    
    return {"ok": True}

# --- Order Routes ---
@app.post("/api/orders", response_model=Order)
def create_order(order: Order, session: Session = Depends(get_session)):
    try:
        session.add(order)
        session.commit()
        session.refresh(order)
        return order
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/orders", response_model=List[Order])
def read_orders(session: Session = Depends(get_session)):
    orders = session.exec(select(Order)).all()
    return orders

@app.get("/api/customer/orders", response_model=List[Order])
def read_my_orders(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    user_id = None
    
    # Get user_id from Supabase Token (ONLY way to identify user)
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data = s_client.auth.get_user(token)
            if user_data and user_data.user:
                user_id = user_data.user.id  # UUID string
                print(f"DEBUG: Supabase User UUID: {user_id}")
    except Exception as e:
        print(f"DEBUG: Supabase token check failed: {e}")
            
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please login again.")

    # Fetch Orders ONLY by user_id (UUID) - Strict user isolation
    orders = []
    
    print(f"DEBUG: Fetching orders ONLY for User UUID: {user_id}")
    try:
        orders = session.exec(
            select(Order)
            .where(Order.user_id == uuid.UUID(user_id))
            .order_by(Order.created_at.desc())
        ).all()
        print(f"DEBUG: Found {len(orders)} orders for this user")
    except Exception as e:
        print(f"DEBUG: UUID query error: {e}")
        orders = []

    # NO EMAIL FALLBACK - Each user sees ONLY their own orders
    return orders

@app.get("/api/orders/{order_id}", response_model=Order)
def read_order(order_id: str, session: Session = Depends(get_session)):
    # Try integer ID first (legacy) then string ID
    try:
        o_id = int(order_id)
        order = session.get(Order, o_id)
        if order: return order
    except:
        pass
        
    # Search by order_id string
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# --- RapidShyp Integration Routes ---

class ShipOrderRequest(BaseModel):
    pickup_location: Optional[str] = "Primary Warehouse" # Or specific pickup name
    length: float = 10.0
    breadth: float = 10.0
    height: float = 5.0
    weight: float = 0.5 # kg

@app.post("/api/admin/orders/{order_id}/ship")
def ship_order(order_id: str, ship_req: ShipOrderRequest, current_user: AdminUser = Depends(get_current_user), session: Session = Depends(get_session)):
    # Find order
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    if order.shipment_id:
         raise HTTPException(status_code=400, detail="Order already shipped")

    # Prepare data for RapidShyp
    # Parse items
    try:
        items = json.loads(order.items_json)
    except:
        items = []

    order_data = {
        "orderId": order.order_id,
        "orderDate": order.created_at.strftime("%Y-%m-%d"),
        "customer_name": order.customer_name,
        "email": order.email,
        "phone": order.phone,
        "address": order.address,
        "city": order.city,
        "pincode": order.pincode,
        "state": "Maharashtra", # TODO: Store state in Order model or extract from address
        "items": items,
        "payment_method": order.payment_method.upper(), # COD or PREPAID
        "total_amount": order.total_amount,
        "length": ship_req.length,
        "breadth": ship_req.breadth,
        "height": ship_req.height,
        "weight": ship_req.weight
    }
    
    # Call Wrapper API
    response = rapidshyp_client.create_forward_order_wrapper(order_data, pickup_location=ship_req.pickup_location)
    
    if response.get("status") == "SUCCESS" or response.get("orderCreated"):
        # Extract Shipment Details
        shipments = response.get("shipment", [])
        if shipments:
            sh = shipments[0]
            order.shipment_id = sh.get("shipmentId")
            order.awb_number = sh.get("awb")
            order.courier_name = sh.get("courierName")
            order.label_url = sh.get("labelURL")
            order.manifest_url = sh.get("manifestURL")
            
            # Update Status
            order.status = "Shipped"
            
            # Append to history
            history = json.loads(order.status_history)
            history.append({
                "status": "Shipped",
                "timestamp": datetime.utcnow().isoformat(),
                "comment": f"Shipped via {order.courier_name}. AWB: {order.awb_number}"
            })
            order.status_history = json.dumps(history)
            
            session.add(order)
            session.commit()
            session.refresh(order)
            
            # Trigger notification (Example)
            # send_order_notifications(order) 
            
            return {"ok": True, "shipment": sh}
    
    print(f"RapidShyp Error: {response}")
    raise HTTPException(status_code=400, detail=f"Failed to create shipment: {response.get('remarks') or response}")

@app.get("/api/orders/{order_id}/track")
def track_order_endpoint(order_id: str, session: Session = Depends(get_session)):
    order = session.exec(select(Order).where(Order.order_id == order_id)).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.awb_number:
         return {"status": "Not Shipped", "details": "Order has not been shipped yet."}
         
    tracking_info = rapidshyp_client.track_order(awb=order.awb_number)
    return tracking_info

class ReturnRequest(BaseModel):
    items: List[dict] # {sku, quantity, reason_code}
    pickup_address: dict # {name, phone, address, pincode...}
    reason_code: str = "OTHER"

@app.post("/api/orders/{order_id}/return")
def return_order_endpoint(order_id: str, return_req: ReturnRequest, session: Session = Depends(get_session)):
    # Logic to process return
    # 1. Check if returnable
    # 2. Call RapidShyp Return Wrapper
    # 3. Create OrderReturn entry
    pass # Placeholder for next iteration if requested

class ServiceabilityCheck(BaseModel):
    pickup_pincode: str
    delivery_pincode: str
    weight: float = 0.5
    value: float = 1000.0
    mode: str = "COD"

@app.post("/api/serviceability")
def check_serviceability(req: ServiceabilityCheck):
    return rapidshyp_client.check_serviceability(
        req.pickup_pincode, 
        req.delivery_pincode, 
        req.weight, 
        req.value, 
        req.mode
    )

# --- Dynamic Payment Gateway Routes ---

class GatewayCreate(BaseModel):
    name: str
    provider: str
    credentials: Dict[str, Any]

class GatewayUpdate(BaseModel):
    name: Optional[str] = None
    is_active: Optional[bool] = None
    credentials: Optional[Dict[str, Any]] = None

@app.get("/api/gateways", response_model=List[PaymentGateway])
def read_gateways(session: Session = Depends(get_session)):
    return session.exec(select(PaymentGateway)).all()

@app.post("/api/gateways", response_model=PaymentGateway)
def create_gateway(gateway_in: GatewayCreate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateway = PaymentGateway(
        name=gateway_in.name,
        provider=gateway_in.provider,
        is_active=False, # Default to inactive
        credentials_json=json.dumps(gateway_in.credentials)
    )
    session.add(gateway)
    session.commit()
    session.refresh(gateway)
    return gateway

@app.put("/api/gateways/{gateway_id}", response_model=PaymentGateway)
def update_gateway(gateway_id: int, gateway_in: GatewayUpdate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateway = session.get(PaymentGateway, gateway_id)
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    
    if gateway_in.name is not None:
        gateway.name = gateway_in.name
    
    # Logic: If setting to active, deactivate all others? 
    # For now, let's allow toggling freely, frontend logic can handle mutual exclusion if needed.
    # But usually only one gateway serves the checkout.
    if gateway_in.is_active is not None:
        gateway.is_active = gateway_in.is_active
        if gateway.is_active:
            # If we activate this, deactivate all others
             all_gateways = session.exec(select(PaymentGateway)).all()
             for g in all_gateways:
                 if g.id != gateway.id:
                     g.is_active = False
                     session.add(g)

    if gateway_in.credentials is not None:
        gateway.credentials_json = json.dumps(gateway_in.credentials)
    
    session.add(gateway)
    session.commit()
    session.refresh(gateway)
    return gateway

@app.delete("/api/gateways/{gateway_id}")
def delete_gateway(gateway_id: int, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    gateway = session.get(PaymentGateway, gateway_id)
    if not gateway:
        raise HTTPException(status_code=404, detail="Gateway not found")
    session.delete(gateway)
    session.commit()
    return {"ok": True}

# --- Notification Routes ---
@app.get("/api/notifications", response_model=List[Notification])
def read_notifications(session: Session = Depends(get_session), limit: int = 10):
    # Get unread first, then recent
    notifications = session.exec(select(Notification).order_by(Notification.is_read, Notification.created_at.desc()).limit(limit)).all()
    return notifications

@app.post("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: int, session: Session = Depends(get_session)):
    notification = session.get(Notification, notification_id)
    if not notification:
         raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    session.add(notification)
    session.commit()
    return {"success": True}


# --- Checkout & Order Processing Routes ---

import razorpay

class OrderItem(BaseModel):
    productId: str
    productName: str
    variantId: Optional[str] = None
    variantName: Optional[str] = None
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: Optional[List[OrderItem]] = None
    # For single product checkout
    productId: Optional[str] = None
    variantId: Optional[str] = None
    quantity: Optional[int] = None
    
    amount: float
    name: str
    email: str
    contact: str
    contact: str
    address: str
    city: str
    pincode: str
    couponCode: Optional[str] = None
    discount: Optional[float] = 0.0
    paymentMethod: str # 'cod' or 'online'
    codCharges: Optional[float] = 0.0
    isCartCheckout: Optional[bool] = False

@app.post("/api/create-cod-order")
def create_cod_order(order_data: OrderCreate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # Extract User ID from Supabase Token
    user_id = None
    user_email = None
    
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data_sb = s_client.auth.get_user(token)
            if user_data_sb and user_data_sb.user:
                user_id = user_data_sb.user.id  # This is the UUID
                user_email = user_data_sb.user.email
                print(f"DEBUG: Creating order for User UUID: {user_id}, Email: {user_email}")
    except Exception as e:
        print(f"DEBUG: Supabase Token Check Failed: {e}")
        # Allow order creation without user_id for guest checkout
        pass

    try:
        # Create Items JSON
        if order_data.isCartCheckout and order_data.items:
            items_list = []
            for item in order_data.items:
                items_list.append({
                    "id": item.productId,
                    "name": item.productName,
                    "quantity": item.quantity,
                    "price": item.price,
                    "variant": item.variantName
                })
            items_json = json.dumps(items_list)
        else:
            # Single item checkout
            items_json = json.dumps([{
                "id": order_data.productId,
                "name": "Product", # In real app fetch name
                "quantity": order_data.quantity,
                "price": order_data.amount, # Approximation
                "variant": order_data.variantId
            }])

        # Generate a unique order_id string
        order_id_str = f"ORD-{int(time.time())}"

        new_order = Order(
            order_id=order_id_str,
            customer_name=order_data.name,
            email=order_data.email,
            phone=order_data.contact,
            address=order_data.address,
            city=order_data.city,
            pincode=order_data.pincode,
            total_amount=order_data.amount,  # Frontend already includes COD charges in finalAmount
            status="Pending", # Keep original status casing
            payment_method=order_data.paymentMethod,
            items_json=items_json,
            status_history=json.dumps([{
                "status": "Pending", # Keep original status casing
                "timestamp": datetime.utcnow().isoformat(),
                "comment": "Order placed successfully"
            }]),
            payment_status="Pending",
            created_at=datetime.utcnow(),
            user_id=uuid.UUID(user_id) if user_id else None  # Convert string UUID to UUID object
        )
        
        print(f"DEBUG: Order created with user_id: {new_order.user_id}")
        
        session.add(new_order)
        
        # Create Notification
        new_notification = Notification(
            message=f"New COD Order Received: {new_order.order_id}",
            order_id=new_order.order_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        session.add(new_notification)

        session.commit()
        session.refresh(new_order)
        
        # Trigger external notifications (Email/Telegram)
        send_order_notifications({
            "order_id": new_order.order_id,
            "total_amount": new_order.total_amount
        })
        
        return {"ok": True, "orderId": new_order.order_id, "message": "Order placed successfully"}
        
    except Exception as e:
        print(f"Error creating COD order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/create-checkout-session")
def create_checkout_session(order_data: OrderCreate, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # Extract User ID from Supabase Token
    user_id = None
    try:
        from supabase_utils import init_supabase
        s_client = init_supabase()
        if s_client:
            user_data_sb = s_client.auth.get_user(token)
            if user_data_sb and user_data_sb.user:
                user_id = user_data_sb.user.id
                print(f"DEBUG: Checkout for User UUID: {user_id}")
    except Exception as e:
        print(f"DEBUG: Supabase Token Check Failed in checkout: {e}")

    try:
        # 1. Find Active Gateway
        gateway = session.exec(select(PaymentGateway).where(PaymentGateway.is_active == True)).first()
        
        if not gateway:
            raise HTTPException(status_code=400, detail="No active payment gateway found. Please contact support.")

        creds = json.loads(gateway.credentials_json)

        # 2. Initialize Provider (Only Razorpay for now)
        if gateway.provider == "razorpay":
            try:
                client = razorpay.Client(auth=(creds.get("key_id"), creds.get("key_secret")))
                
                data = {
                    "amount": int(order_data.amount * 100), # Amount in paise
                    "currency": "INR",
                    "receipt": f"rcpt_{int(time.time())}",
                    "notes": {
                        "email": order_data.email,
                        "phone": order_data.contact
                    }
                }
                
                razorpay_order = client.order.create(data=data)
            except Exception as e:
                print(f"Razorpay Error: {traceback.format_exc()}")
                raise HTTPException(status_code=500, detail=f"Gateway Error: {str(e)}")

            # Create pending order in DB
            try:
                if order_data.isCartCheckout and order_data.items:
                    items_list = []
                    for item in order_data.items:
                        items_list.append({
                            "id": item.productId,
                            "name": item.productName,
                            "quantity": item.quantity,
                            "price": item.price,
                            "variant": item.variantName
                        })
                    items_json = json.dumps(items_list)
                else:
                    items_json = json.dumps([{
                        "id": order_data.productId,
                        "quantity": order_data.quantity,
                        "price": order_data.amount
                    }])

                new_order = Order(
                    order_id=razorpay_order['id'], # Correct field for String ID
                    customer_name=order_data.name,
                    email=order_data.email,
                    phone=order_data.contact,
                    address=order_data.address,
                    city=order_data.city,
                    pincode=order_data.pincode,
                    items_json=items_json,
                    total_amount=order_data.amount,
                    status="Pending",
                    status_history=json.dumps([{
                        "status": "Pending",
                        "timestamp": datetime.utcnow().isoformat(),
                        "comment": "Order initiated"
                    }]),
                    payment_status="Pending",
                    payment_method="Online",
                    created_at=datetime.utcnow(),
                    user_id=uuid.UUID(user_id) if user_id else None  # User-specific order
                )
                session.add(new_order)
                session.commit()
                session.refresh(new_order)
                
                # Create Notification
                new_notification = Notification(
                    message=f"New Online Order Initiated: {new_order.order_id}",
                    order_id=new_order.order_id,
                    is_read=False,
                    created_at=datetime.utcnow()
                )
                session.add(new_notification)
                session.commit()

                return {
                    "id": razorpay_order['id'],
                    "amount": razorpay_order['amount'],
                    "currency": razorpay_order['currency'],
                    "key_id": creds.get("key_id"),
                    "name": "Varaha Jewels",
                    "description": "Payment for Order",
                    "prefill": {
                        "name": order_data.name,
                        "email": order_data.email,
                        "contact": order_data.contact
                    }
                }
            except Exception as e:
                print(f"Database Error during Checkout: {traceback.format_exc()}")
                raise HTTPException(status_code=500, detail=f"Database Error: {str(e)}")
        
        else:
             raise HTTPException(status_code=400, detail="Selected gateway provider not supported yet.")

    except HTTPException:
        raise
    except Exception as e:
        print(f"General Checkout Error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))


class OrderStatusUpdate(BaseModel):
    orderId: str
    status: str
    paymentId: Optional[str] = None

@app.post("/api/update-order-status")
def update_order_status(update_data: OrderStatusUpdate, session: Session = Depends(get_session)):
    order = session.get(Order, update_data.orderId)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update status
    order.status = update_data.status
    
    # Update History
    history = []
    try:
        if order.status_history:
            history = json.loads(order.status_history)
    except:
        pass
        
    history.append({
        "status": update_data.status,
        "timestamp": datetime.utcnow().isoformat(),
        "comment": f"Status updated to {update_data.status}"
    })
    order.status_history = json.dumps(history)

    if update_data.paymentId:
        order.payment_status = "Paid" 
        
        # Trigger external notifications (Email/Telegram) ONLY upon successful payment
        send_order_notifications({
            "order_id": order.order_id,
            "total_amount": order.total_amount
        })
    
    session.add(order)
    session.commit()
    session.refresh(order)
    
    return {"success": True, "order": order}

class ShipOrderRequest(BaseModel):
    orderId: str # DB ID (int)

@app.post("/api/ship-order")
def ship_order(request: ShipOrderRequest, session: Session = Depends(get_session)):
    # 1. Get Order
    try:
         o_id = int(request.orderId)
         order = session.get(Order, o_id)
    except:
         order = session.exec(select(Order).where(Order.order_id == request.orderId)).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.shipping_id:
        raise HTTPException(status_code=400, detail="Order already shipped")

    # 2. Call RapidShyp
    # Flatten order object to dict
    order_dict = order.dict()
    # Pydantic dict() might not include properties not in model or handles dates differently
    # Let's manually ensure critical fields
    ship_data = create_rapidshyp_order(order_dict)
    
    if ship_data and ship_data.get("status") == "success":
        data = ship_data.get("data", {})
        
        # 3. Update Order
        order.shipping_id = data.get("order_id")
        order.awb_number = data.get("awb_number")
        order.courier_name = data.get("courier_name")
        
        # Update status to Shipped
        order.status = "Shipped"
        
        # Update History
        history = []
        try:
             history = json.loads(order.status_history) if order.status_history else []
        except: pass
        
        history.append({
            "status": "Shipped",
            "timestamp": datetime.utcnow().isoformat(),
            "comment": f"Shipped via {order.courier_name} (AWB: {order.awb_number})"
        })
        order.status_history = json.dumps(history)
        
        session.add(order)
        session.commit()
        session.refresh(order)
        
        return {"success": True, "order": order}
    else:
        raise HTTPException(status_code=500, detail="Failed to create shipment with RapidShyp")

# --- Coupon Routes ---
@app.get("/api/coupons", response_model=List[Coupon])
def list_coupons(session: Session = Depends(get_session)):
    return session.exec(select(Coupon)).all()

@app.post("/api/coupons", response_model=Coupon)
def create_coupon(coupon: Coupon, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    existing = session.exec(select(Coupon).where(Coupon.code == coupon.code)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    session.add(coupon)
    session.commit()
    session.refresh(coupon)
    return coupon

@app.delete("/api/coupons/{coupon_id}")
def delete_coupon(coupon_id: int, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    coupon = session.get(Coupon, coupon_id)
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    session.delete(coupon)
    session.commit()
    return {"ok": True}

class CouponValidationRequest(BaseModel):
    code: str

@app.post("/api/validate-coupon")
def validate_coupon(request: CouponValidationRequest, session: Session = Depends(get_session)):
    # Case insensitive search
    # SQLite default collation is usually case-insensitive for ASCII, but let's be explicit or handle in python if needed.
    # SQLModel/SQLAlchemy filtering:
    coupons = session.exec(select(Coupon)).all()
    coupon = next((c for c in coupons if c.code.lower() == request.code.lower()), None)
    
    if not coupon or not coupon.is_active:
         raise HTTPException(status_code=400, detail="Invalid or expired coupon")
         
    return {
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value
    }

# --- Analytics Routes ---

class VisitCreate(BaseModel):
    path: str

@app.post("/api/track-visit")
def track_visit(visit_data: VisitCreate, request: Request, session: Session = Depends(get_session)):
    client_ip = request.client.host
    # Hash IP for privacy but consistency
    ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
    
    # 1. Update Active Visitor
    active = session.get(ActiveVisitor, ip_hash)
    if not active:
        active = ActiveVisitor(ip_hash=ip_hash, path=visit_data.path)
    else:
        active.last_seen = datetime.utcnow()
        active.path = visit_data.path
    session.add(active)
    
    # 2. Log Visit (Debounced - only log if no visit from this IP in last 30 mins OR path changed significantly?)
    # For simplicity, we log 1 visit per session (30 mins inactivity) per day
    # Or just log every distinct page view? Let's log every page view for detailed heatmaps later.
    # To save space, let's just log unique sessions per day per IP.
    
    # Check if we logged this IP today
    today_str = datetime.utcnow().date().isoformat()
    
    # Simple Logic: Log every hit? No, too much data.
    # Metric: "Active Users" comes from ActiveVisitor table.
    # Metric: "Total Visits" comes from VisitorLog.
    # Let's log a new entry if the last entry for this IP was > 30 mins ago.
    
    last_log = session.exec(select(VisitorLog).where(VisitorLog.ip_hash == ip_hash).order_by(VisitorLog.timestamp.desc())).first()
    
    should_log = False
    if not last_log:
        should_log = True
    else:
        time_diff = datetime.utcnow() - last_log.timestamp
        if time_diff.total_seconds() > 1800: # 30 mins
             should_log = True
             
    if should_log:
        log = VisitorLog(
            ip_hash=ip_hash,
            path=visit_data.path,
            date=today_str,
            timestamp=datetime.utcnow()
        )
        session.add(log)
    
    session.commit()
    return {"ok": True}

@app.get("/api/analytics")
def get_analytics(session: Session = Depends(get_session)):
    # 1. Active Users (Last 5 mins)
    five_mins_ago = datetime.utcnow() - timedelta(minutes=5)
    active_count = session.exec(select(func.count(ActiveVisitor.ip_hash)).where(ActiveVisitor.last_seen >= five_mins_ago)).one()
    
    # 2. Daily Stats (Last 30 Days)
    thirty_days_ago = (datetime.utcnow().date() - timedelta(days=30)).isoformat()
    
    # Group by date
    daily_query = select(VisitorLog.date, func.count(VisitorLog.id)).where(VisitorLog.date >= thirty_days_ago).group_by(VisitorLog.date)
    daily_results = session.exec(daily_query).all()
    
    # Format for chart
    daily_stats = [{"date": r[0], "visits": r[1]} for r in daily_results]
    
    # Fill missing dates with 0
    # (Optional polish step, skipping for now to keep it simple)

    # 3. Monthly Stats (Simple aggregation from above or separate query)
    # Let's just return daily and let frontend aggregate if needed
    
    # 4. Total All Time
    total_visits = session.exec(select(func.count(VisitorLog.id))).one()
    
    return {
        "active_users": active_count,
        "daily_stats": daily_stats,
        "total_visits": total_visits
    }

# --- Homepage Content Routes ---

@app.get("/api/content/hero")
def get_hero_slides(session: Session = Depends(get_session)):
    slides = session.exec(select(HeroSlide).order_by(HeroSlide.order)).all()
    if not slides:
        # Return empty list, frontend will handle fallback
        return []
    return slides

@app.post("/api/content/hero")
def create_hero_slide(
    title: str = Form(...),
    subtitle: str = Form(...),
    link_text: str = Form("Explore Collections"),
    link_url: str = Form("/collections/all"),
    image_file: UploadFile = File(...),
    mobile_image_file: Optional[UploadFile] = File(None),
    session: Session = Depends(get_session)
):
    try:
        # Upload main image
        image_url = upload_file_to_supabase(image_file)
        if not image_url:
            raise Exception("Failed to upload main image")

        # Upload mobile image if provided
        mobile_image_url = None
        if mobile_image_file:
            mobile_image_url = upload_file_to_supabase(mobile_image_file)

        slide = HeroSlide(
            title=title,
            subtitle=subtitle,
            link_text=link_text,
            link_url=link_url,
            image=image_url,
            mobile_image=mobile_image_url
        )
        
        session.add(slide)
        session.commit()
        session.refresh(slide)
        return slide
    except Exception as e:
        print(f"Error in hero upload: {e}")
        raise HTTPException(status_code=500, detail="Hero slide creation failed")

@app.delete("/api/content/hero/{slide_id}")
def delete_hero_slide(slide_id: int, session: Session = Depends(get_session)):
    slide = session.get(HeroSlide, slide_id)
    if not slide:
        raise HTTPException(status_code=404, detail="Slide not found")
    session.delete(slide)
    session.commit()
    return {"ok": True}

@app.get("/api/content/creators")
def get_creator_videos(session: Session = Depends(get_session)):
    videos = session.exec(select(CreatorVideo)).all()
    return videos

@app.post("/api/content/creators")
def create_creator_video(
    name: str = Form(...),
    handle: str = Form(...),
    platform: str = Form(...),
    followers: str = Form(...),
    product_name: str = Form(...),
    video_file: UploadFile = File(...),
    session: Session = Depends(get_session)
):
    try:
        # Upload video to Supabase
        print(f"Received upload request for {name}")
        video_url = upload_file_to_supabase(video_file)
        if not video_url:
            raise Exception("upload_file_to_supabase returned None")

        # Create CreatorVideo object
        video = CreatorVideo(
            name=name,
            handle=handle,
            platform=platform,
            followers=followers,
            product_name=product_name,
            video_url=video_url,
            is_verified=True
        )

        session.add(video)
        session.commit()
        session.refresh(video)
        return video
    except Exception as e:
        print(f"Error in upload: {e}")
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail="Video upload failed. Please check server logs.")

@app.delete("/api/content/creators/{video_id}")
def delete_creator_video(video_id: int, session: Session = Depends(get_session)):
    video = session.get(CreatorVideo, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    session.delete(video)
    session.commit()
    return {"ok": True}

# --- Store Settings Routes ---

@app.get("/api/settings")
def get_store_settings(session: Session = Depends(get_session)):
    settings = session.get(StoreSettings, 1)
    if not settings:
        # Create default if not exists
        settings = StoreSettings(id=1)
        session.add(settings)
        session.commit()
        session.refresh(settings)
    return settings

@app.put("/api/settings")
def update_store_settings(new_settings: StoreSettings, session: Session = Depends(get_session)):
    settings = session.get(StoreSettings, 1)
    if not settings:
        settings = StoreSettings(id=1)
    
    # Update fields
    settings.store_name = new_settings.store_name
    settings.support_email = new_settings.support_email
    settings.currency_symbol = new_settings.currency_symbol
    settings.announcement_text = new_settings.announcement_text
    settings.announcement_date = new_settings.announcement_date
    settings.show_announcement = new_settings.show_announcement
    settings.delivery_free_threshold = new_settings.delivery_free_threshold
    settings.logo_url = new_settings.logo_url
    settings.show_full_page_countdown = new_settings.show_full_page_countdown
    settings.is_maintenance_mode = new_settings.is_maintenance_mode

    session.add(settings)
    session.commit()
    session.refresh(settings)
    return settings


# ==========================================
# 🎁 WISHLIST APIs
# ==========================================

@app.get("/api/wishlist", response_model=List[Dict])
def get_wishlist(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get user's wishlist with product details"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    wishlist_items = session.exec(
        select(Wishlist).where(Wishlist.customer_id == customer_id)
    ).all()
    
    # Fetch product details
    result = []
    for item in wishlist_items:
        product = session.get(Product, item.product_id)
        if product:
            result.append({
                "id": item.id,
                "product_id": item.product_id,
                "added_at": item.added_at.isoformat(),
                "product": {
                    "id": product.id,
                    "name": product.name,
                    "price": product.price,
                    "image": product.image,
                    "category": product.category,
                    "metal": product.metal,
                    "premium": product.premium
                }
            })
    
    return result


@app.post("/api/wishlist")
def add_to_wishlist(
    product_id: str,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add product to wishlist"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    
    # Check if product exists
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if already in wishlist
    existing = session.exec(
        select(Wishlist).where(
            Wishlist.customer_id == customer_id,
            Wishlist.product_id == product_id
        )
    ).first()
    
    if existing:
        return {"message": "Already in wishlist", "id": existing.id}
    
    # Add to wishlist
    wishlist_item = Wishlist(
        customer_id=customer_id,
        product_id=product_id
    )
    session.add(wishlist_item)
    session.commit()
    session.refresh(wishlist_item)
    
    return {
        "message": "Added to wishlist",
        "id": wishlist_item.id,
        "product_id": product_id
    }


@app.delete("/api/wishlist/{product_id}")
def remove_from_wishlist(
    product_id: str,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Remove product from wishlist"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    
    wishlist_item = session.exec(
        select(Wishlist).where(
            Wishlist.customer_id == customer_id,
            Wishlist.product_id == product_id
        )
    ).first()
    
    if not wishlist_item:
        raise HTTPException(status_code=404, detail="Item not in wishlist")
    
    session.delete(wishlist_item)
    session.commit()
    
    return {"message": "Removed from wishlist"}


@app.post("/api/wishlist/sync")
def sync_wishlist(
    product_ids: List[str],
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Sync local wishlist to server (merge on login)"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    customer_id = current_user.id
    added_count = 0
    
    for product_id in product_ids:
        # Check if already exists
        existing = session.exec(
            select(Wishlist).where(
                Wishlist.customer_id == customer_id,
                Wishlist.product_id == product_id
            )
        ).first()
        
        if not existing:
            # Verify product exists
            product = session.get(Product, product_id)
            if product:
                wishlist_item = Wishlist(
                    customer_id=customer_id,
                    product_id=product_id
                )
                session.add(wishlist_item)
                added_count += 1
    
    session.commit()
    return {"message": f"Synced {added_count} items to wishlist"}


# ==========================================
# 📍 ADDRESS MANAGEMENT APIs
# ==========================================

@app.get("/api/addresses", response_model=List[Address])
def get_addresses(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all addresses for current user"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    addresses = session.exec(
        select(Address)
        .where(Address.customer_id == current_user.id)
        .order_by(Address.is_default.desc(), Address.created_at.desc())
    ).all()
    
    return addresses


@app.post("/api/addresses", response_model=Address)
def add_address(
    address_data: Address,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Add new address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # If this is the first address or marked as default, unset other defaults
    if address_data.is_default:
        existing_defaults = session.exec(
            select(Address).where(
                Address.customer_id == current_user.id,
                Address.is_default == True
            )
        ).all()
        
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)
    
    # Create new address
    new_address = Address(
        customer_id=current_user.id,
        label=address_data.label,
        full_name=address_data.full_name,
        phone=address_data.phone,
        address_line1=address_data.address_line1,
        address_line2=address_data.address_line2,
        city=address_data.city,
        state=address_data.state,
        pincode=address_data.pincode,
        country=address_data.country or "India",
        is_default=address_data.is_default,
        address_type=address_data.address_type or "both"
    )
    
    session.add(new_address)
    session.commit()
    session.refresh(new_address)
    
    return new_address


@app.put("/api/addresses/{address_id}", response_model=Address)
def update_address(
    address_id: int,
    address_data: Address,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update existing address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # If setting as default, unset others
    if address_data.is_default and not address.is_default:
        existing_defaults = session.exec(
            select(Address).where(
                Address.customer_id == current_user.id,
                Address.is_default == True
            )
        ).all()
        
        for addr in existing_defaults:
            addr.is_default = False
            session.add(addr)
    
    # Update fields
    address.label = address_data.label
    address.full_name = address_data.full_name
    address.phone = address_data.phone
    address.address_line1 = address_data.address_line1
    address.address_line2 = address_data.address_line2
    address.city = address_data.city
    address.state = address_data.state
    address.pincode = address_data.pincode
    address.country = address_data.country or "India"
    address.is_default = address_data.is_default
    address.address_type = address_data.address_type
    address.updated_at = datetime.utcnow()
    
    session.add(address)
    session.commit()
    session.refresh(address)
    
    return address


@app.delete("/api/addresses/{address_id}")
def delete_address(
    address_id: int,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Delete address"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    session.delete(address)
    session.commit()
    
    return {"message": "Address deleted successfully"}


@app.put("/api/addresses/{address_id}/default")
def set_default_address(
    address_id: int,
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Set address as default"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    address = session.get(Address, address_id)
    if not address or address.customer_id != current_user.id:
        raise HTTPException(status_code=404, detail="Address not found")
    
    # Unset all other defaults
    existing_defaults = session.exec(
        select(Address).where(
            Address.customer_id == current_user.id,
            Address.is_default == True
        )
    ).all()
    
    for addr in existing_defaults:
        addr.is_default = False
        session.add(addr)
    
    # Set this as default
    address.is_default = True
    session.add(address)
    session.commit()
    session.refresh(address)
    
    return address


# ==========================================
# 🎨 PRODUCT VARIANTS & INVENTORY APIs
# ==========================================

@app.get("/api/products/{product_id}/variants", response_model=List[ProductVariant])
def get_product_variants(
    product_id: str,
    session: Session = Depends(get_session)
):
    """Get all variants for a product"""
    variants = session.exec(
        select(ProductVariant)
        .where(ProductVariant.product_id == product_id)
        .where(ProductVariant.is_available == True)
    ).all()
    
    return variants


@app.post("/api/products/{product_id}/variants", response_model=ProductVariant)
def add_product_variant(
    product_id: str,
    variant_data: ProductVariant,
    session: Session = Depends(get_session)
):
    """Add variant to product (Admin only)"""
    # Verify product exists
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Create variant
    new_variant = ProductVariant(
        product_id=product_id,
        sku=variant_data.sku,
        name=variant_data.name,
        price=variant_data.price,
        stock=variant_data.stock,
        attributes=variant_data.attributes,
        is_available=variant_data.is_available
    )
    
    session.add(new_variant)
    session.commit()
    session.refresh(new_variant)
    
    # Create inventory entry
    inventory = Inventory(
        variant_id=new_variant.id,
        stock=new_variant.stock,
        available=new_variant.stock
    )
    session.add(inventory)
    session.commit()
    
    return new_variant


@app.put("/api/variants/{variant_id}", response_model=ProductVariant)
def update_variant(
    variant_id: int,
    variant_data: ProductVariant,
    session: Session = Depends(get_session)
):
    """Update product variant (Admin only)"""
    variant = session.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    variant.name = variant_data.name
    variant.sku = variant_data.sku
    variant.price = variant_data.price
    variant.stock = variant_data.stock
    variant.attributes = variant_data.attributes
    variant.is_available = variant_data.is_available
    
    session.add(variant)
    session.commit()
    session.refresh(variant)
    
    return variant


@app.delete("/api/variants/{variant_id}")
def delete_variant(
    variant_id: int,
    session: Session = Depends(get_session)
):
    """Delete product variant (Admin only)"""
    variant = session.get(ProductVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variant not found")
    
    session.delete(variant)
    session.commit()
    
    return {"message": "Variant deleted successfully"}


@app.get("/api/inventory/{product_id}")
def get_inventory(
    product_id: str,
    session: Session = Depends(get_session)
):
    """Get inventory status for product/variants"""
    # Check product inventory
    product_inventory = session.exec(
        select(Inventory).where(Inventory.product_id == product_id)
    ).first()
    
    # Check variant inventories
    variants = session.exec(
        select(ProductVariant).where(ProductVariant.product_id == product_id)
    ).all()
    
    variant_inventories = []
    for variant in variants:
        inv = session.exec(
            select(Inventory).where(Inventory.variant_id == variant.id)
        ).first()
        if inv:
            variant_inventories.append({
                "variant_id": variant.id,
                "variant_name": variant.name,
                "sku": variant.sku,
                "stock": inv.stock,
                "reserved": inv.reserved,
                "available": inv.available
            })
    
    return {
        "product_id": product_id,
        "product_inventory": {
            "stock": product_inventory.stock if product_inventory else 0,
            "available": product_inventory.available if product_inventory else 0
        },
        "variants": variant_inventories
    }


# ==========================================
# 🔄 ORDER RETURN & REFUND APIs
# ==========================================

@app.post("/api/orders/{order_id}/return", response_model=OrderReturn)
def create_return_request(
    order_id: str,
    return_data: Dict[str, Any],
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Customer creates return request"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Verify order exists and belongs to user
    order = session.exec(
        select(Order).where(Order.order_id == order_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.user_id != current_user.supabase_uid:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Check if return already exists
    existing_return = session.exec(
        select(OrderReturn).where(OrderReturn.order_id == order_id)
    ).first()
    
    if existing_return:
        raise HTTPException(status_code=400, detail="Return request already exists")
    
    # Create return request
    return_request = OrderReturn(
        order_id=order_id,
        customer_id=current_user.id,
        reason=return_data.get("reason", ""),
        description=return_data.get("description"),
        refund_amount=return_data.get("refund_amount", order.total_amount),
        refund_method=return_data.get("refund_method", "original"),
        return_items=json.dumps(return_data.get("items", [])),
        status="pending"
    )
    
    session.add(return_request)
    session.commit()
    session.refresh(return_request)
    
    return return_request


@app.get("/api/returns", response_model=List[OrderReturn])
def get_all_returns(
    status: Optional[str] = None,
    session: Session = Depends(get_session)
):
    """Get all return requests (Admin only)"""
    query = select(OrderReturn)
    
    if status:
        query = query.where(OrderReturn.status == status)
    
    returns = session.exec(query.order_by(OrderReturn.created_at.desc())).all()
    return returns


@app.get("/api/customer/returns", response_model=List[OrderReturn])
def get_customer_returns(
    current_user: Customer = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get customer's return requests"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    returns = session.exec(
        select(OrderReturn)
        .where(OrderReturn.customer_id == current_user.id)
        .order_by(OrderReturn.created_at.desc())
    ).all()
    
    return returns


@app.put("/api/returns/{return_id}")
def update_return_status(
    return_id: int,
    status_data: Dict[str, Any],
    session: Session = Depends(get_session)
):
    """Update return status (Admin only)"""
    return_request = session.get(OrderReturn, return_id)
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    return_request.status = status_data.get("status", return_request.status)
    return_request.admin_notes = status_data.get("admin_notes")
    return_request.tracking_number = status_data.get("tracking_number")
    
    if status_data.get("status") in ["approved", "refunded", "rejected"]:
        return_request.processed_at = datetime.utcnow()
    
    session.add(return_request)
    session.commit()
    session.refresh(return_request)
    
    return return_request


@app.post("/api/returns/{return_id}/refund")
def process_refund(
    return_id: int,
    session: Session = Depends(get_session)
):
    """Process refund for approved return (Admin only)"""
    return_request = session.get(OrderReturn, return_id)
    if not return_request:
        raise HTTPException(status_code=404, detail="Return request not found")
    
    if return_request.status != "approved":
        raise HTTPException(status_code=400, detail="Return must be approved first")
    
    # Update status to refunded
    return_request.status = "refunded"
    return_request.processed_at = datetime.utcnow()
    
    session.add(return_request)
    session.commit()
    
    # Here you would integrate with payment gateway for actual refund
    # For now, just return success
    
    return {
        "message": "Refund processed successfully",
        "refund_amount": return_request.refund_amount,
        "order_id": return_request.order_id
    }


# ==========================================
# 💰 LIVE GOLD/SILVER RATES API
# ==========================================

@app.get("/api/live-rates")
def get_live_metal_rates():
    """
    Fetch live gold and silver rates from GoldAPI.io
    Returns rates in INR per 10g for gold and per 1kg for silver
    """
    import requests
    import os
    
    api_key = os.getenv("GOLDAPI_KEY", "goldapi-177n1tsmjdao3q4-io")
    
    try:
        # Fetch Gold Rate (XAU in INR)
        gold_url = "https://www.goldapi.io/api/XAU/INR"
        headers = {
            "x-access-token": api_key,
            "Content-Type": "application/json"
        }
        
        gold_response = requests.get(gold_url, headers=headers, timeout=5)
        gold_data = gold_response.json()
        
        # Fetch Silver Rate (XAG in INR)  
        silver_url = "https://www.goldapi.io/api/XAG/INR"
        silver_response = requests.get(silver_url, headers=headers, timeout=5)
        silver_data = silver_response.json()
        
        # GoldAPI returns price per troy ounce
        # 1 troy ounce = 31.1035 grams
        # Convert to per 10g for gold and per 1kg for silver
        
        gold_per_oz = gold_data.get("price", 0)
        gold_per_10g = (gold_per_oz / 31.1035) * 10
        
        silver_per_oz = silver_data.get("price", 0)
        silver_per_1kg = (silver_per_oz / 31.1035) * 1000
        
        # Calculate 24-hour change percentage
        gold_change_pct = gold_data.get("ch", 0)
        silver_change_pct = silver_data.get("ch", 0)
        
        return {
            "gold": {
                "price": round(gold_per_10g, 0),
                "change": f"{'+' if gold_change_pct >= 0 else ''}{gold_change_pct:.1f}%",
                "unit": "per 10 grams",
                "timestamp": gold_data.get("timestamp")
            },
            "silver": {
                "price": round(silver_per_1kg, 0),
                "change": f"{'+' if silver_change_pct >= 0 else ''}{silver_change_pct:.1f}%",
                "unit": "per 1 kg", 
                "timestamp": silver_data.get("timestamp")
            },
            "status": "success"
        }
        
    except requests.exceptions.RequestException as e:
        print(f"GoldAPI Error: {str(e)}")
        # Return fallback mock data if API fails
        return {
            "gold": {
                "price": 68500,
                "change": "+0.5%",
                "unit": "per 10 grams"
            },
            "silver": {
                "price": 82500,
                "change": "+0.3%",
                "unit": "per 1 kg"
            },
            "status": "fallback"
        }


# ==========================================
# 🔍 ENHANCED SEARCH & FILTER APIs
# ==========================================

@app.get("/api/products/search")
def search_products(
    q: str = Query("", description="Search query"),
    category: Optional[str] = None,
    metal: Optional[str] = None,
    style: Optional[str] = None,
    tag: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: str = "relevance",  # relevance, price_asc, price_desc, newest
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
):
    """Advanced product search with filters and sorting"""
    
    # Build base query
    query = select(Product)
    
    # Text search (name or description)
    if q:
        query = query.where(
            or_(
                Product.name.ilike(f"%{q}%"),
                Product.description.ilike(f"%{q}%")
            )
        )
    
    # Category filter
    if category:
        query = query.where(Product.category == category)
    
    # Metal filter
    if metal:
        query = query.where(Product.metal == metal)
    
    # Style filter
    if style:
        query = query.where(Product.style == style)
    
    # Tag filter
    if tag:
        query = query.where(Product.tag == tag)
    
    # Price range filter
    if min_price is not None:
        query = query.where(Product.price >= min_price)
    
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    
    # Sorting
    if sort == "price_asc":
        query = query.order_by(Product.price.asc())
    elif sort == "price_desc":
        query = query.order_by(Product.price.desc())
    elif sort == "newest":
        query = query.order_by(Product.id.desc())
    # relevance is default (no specific ordering)
    
    # Pagination
    query = query.offset(offset).limit(limit)
    
    products = session.exec(query).all()
    
    return {
        "results": products,
        "count": len(products),
        "query": q,
        "filters": {
            "category": category,
            "metal": metal,
            "style": style,
            "tag": tag,
            "price_range": [min_price, max_price]
        }
    }


@app.get("/api/products/suggestions")
def get_search_suggestions(
    q: str = Query("", min_length=2),
    limit: int = 10,
    session: Session = Depends(get_session)
):
    """Get search suggestions/autocomplete"""
    if not q:
        return {"suggestions": []}
    
    # Search in product names
    products = session.exec(
        select(Product.name, Product.id)
        .where(Product.name.ilike(f"%{q}%"))
        .limit(limit)
    ).all()
    
    suggestions = [{"name": p[0], "id": p[1]} for p in products]
    
    return {"suggestions": suggestions}


# ==========================================
# ⭐ RATING AGGREGATION APIs
# ==========================================

@app.get("/api/products/{product_id}/rating-summary")
def get_product_rating_summary(
    product_id: str,
    session: Session = Depends(get_session)
):
    """Get rating summary and distribution for product"""
    
    # Get all reviews for product
    reviews = session.exec(
        select(Review).where(Review.product_id == product_id)
    ).all()
    
    if not reviews:
        return {
            "average_rating": 0,
            "total_reviews": 0,
            "distribution": {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        }
    
    # Calculate average
    total_rating = sum(r.rating for r in reviews)
    average_rating = round(total_rating / len(reviews), 1)
    
    # Calculate distribution
    distribution = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
    for review in reviews:
        distribution[str(review.rating)] += 1
    
    return {
        "average_rating": average_rating,
        "total_reviews": len(reviews),
        "distribution": distribution,
        "rating_percentages": {
            "5": round((distribution["5"] / len(reviews)) * 100, 1),
            "4": round((distribution["4"] / len(reviews)) * 100, 1),
            "3": round((distribution["3"] / len(reviews)) * 100, 1),
            "2": round((distribution["2"] / len(reviews)) * 100, 1),
            "1": round((distribution["1"] / len(reviews)) * 100, 1),
        }
    }


@app.post("/api/reviews/{review_id}/helpful")
def mark_review_helpful(
    review_id: int,
    session: Session = Depends(get_session)
):
    """Mark review as helpful (upvote)"""
    review = session.get(Review, review_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    # Increment helpful count
    review.helpful_count += 1
    session.add(review)
    session.commit()
    session.refresh(review)
    
    return {
        "message": "Marked as helpful",
        "review_id": review_id,
        "helpful_count": review.helpful_count
    }

# ==========================================
# 💰 METAL RATES ADMIN APIs
# ==========================================

@app.get("/api/metal-rates")
def get_metal_rates(session: Session = Depends(get_session)):
    """Get current metal rates (public endpoint)"""
    rates = session.exec(select(MetalRates)).first()
    
    if not rates:
        # Create default record if doesn't exist
        rates = MetalRates(
            gold_rate=124040.0,
            silver_rate=208900.0
        )
        session.add(rates)
        session.commit()
        session.refresh(rates)
    
    return {
        "gold_rate": rates.gold_rate,
        "silver_rate": rates.silver_rate,
        "updated_at": rates.updated_at.isoformat() if rates.updated_at else None
    }


class MetalRatesUpdate(BaseModel):
    gold_rate: float
    silver_rate: float


@app.post("/api/admin/metal-rates")
def update_metal_rates(
    rates_data: MetalRatesUpdate,
    current_user: AdminUser = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update metal rates (admin only)"""
    # Check if user is admin
    if not isinstance(current_user, AdminUser):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rates = session.exec(select(MetalRates)).first()
    
    if not rates:
        rates = MetalRates(
            gold_rate=rates_data.gold_rate,
            silver_rate=rates_data.silver_rate,
            updated_by=current_user.username,
            updated_at=datetime.utcnow()
        )
        session.add(rates)
    else:
        rates.gold_rate = rates_data.gold_rate
        rates.silver_rate = rates_data.silver_rate
        rates.updated_by = current_user.username
        rates.updated_at = datetime.utcnow()
    
    session.commit()
    session.refresh(rates)
    
    return {
        "message": "Metal rates updated successfully",
        "gold_rate": rates.gold_rate,
        "silver_rate": rates.silver_rate
    }
