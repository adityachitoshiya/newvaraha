from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Depends, HTTPException, Query, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables, get_session
from models import Product, Order, AdminUser, PaymentGateway, Notification, Customer, Review, Coupon, VisitorLog, ActiveVisitor, HeroSlide, CreatorVideo, StoreSettings, Cart, CartItem
from notifications import send_order_notifications
from rapidshyp_utils import create_rapidshyp_order
from auth_utils import verify_password, create_access_token
from sqlmodel import Session, select, func, col

from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, date as dt_date
import time
import json
import traceback
import hashlib
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
                # Ensure user exists in local DB
                user = session.exec(select(Customer).where(Customer.email == email)).first()
                if not user:
                    # Auto-create synced user
                    user = Customer(
                        full_name=user_data.user.user_metadata.get('full_name', email.split('@')[0]),
                        email=email,
                        provider="google",
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
    # Note: We reuse create_access_token but with different subject/scopes if needed
    token = create_access_token(data={"sub": customer.email, "role": "customer", "name": customer.full_name})
    return {"access_token": token, "token_type": "bearer", "user": {"name": customer.full_name, "email": customer.email}}

class UserSync(BaseModel):
    full_name: str
    email: str
    provider: str

@app.post("/api/auth/sync")
def sync_user(user_data: UserSync, token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    # 1. Verify Token (Double check if needed, but frontend sends one)
    # For now, trust the token as it comes from Supabase client login
    
    customer = session.exec(select(Customer).where(Customer.email == user_data.email)).first()
    if not customer:
        # Create new customer
        customer = Customer(
            full_name=user_data.full_name,
            email=user_data.email,
            provider=user_data.provider,
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
    session.delete(review)
    session.commit()
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
    email = None
    
    # 1. Try Local Token
    try:
        from auth_utils import ALGORITHM, SECRET_KEY
        from jose import jwt
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        print(f"DEBUG: Decoded Local Token. Email: {email}") # DEBUG LOG
    except Exception as e:
        print(f"DEBUG: Local Token failed: {e}") # DEBUG LOG
        pass

    # 2. Try Supabase Token (if local failed)
    if not email:
        try:
            from supabase_utils import init_supabase
            s_client = init_supabase()
            if s_client:
                 user_data = s_client.auth.get_user(token)
                 if user_data and user_data.user:
                     email = user_data.user.email
                     print(f"DEBUG: Decoded Supabase Token. Email: {email}") # DEBUG LOG
        except Exception as e:
            print(f"DEBUG: Supabase Token failed: {e}") # DEBUG LOG
            pass
            
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token")

    # 2. Fetch Orders filtering by email
    # Case-insensitive match is safer, but strictly we use the saved email
    orders = session.exec(select(Order).where(Order.email == email).order_by(Order.created_at.desc())).all()
    print(f"DEBUG: Found {len(orders)} orders for {email}") # DEBUG LOG
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
def create_cod_order(order_data: OrderCreate, session: Session = Depends(get_session)):
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

        new_order = Order(
            order_id=f"ORD-{int(time.time())}", # Use order_id for the string ID
            customer_name=order_data.name,
            email=order_data.email,
            phone=order_data.contact,
            address=order_data.address,
            city=order_data.city,
            pincode=order_data.pincode,
            items_json=items_json,
             total_amount=order_data.amount + (order_data.codCharges or 0),
            status="Pending",
            status_history=json.dumps([{
                "status": "Pending",
                "timestamp": datetime.utcnow().isoformat(),
                "comment": "Order placed successfully"
            }]),
            payment_status="Pending",
            payment_method="COD",
            created_at=datetime.utcnow()
        )
        
        session.add(new_order)
        
        # Create Notification
        new_notification = Notification(
            message=f"New COD Order Received: {new_order.order_id}",
            order_id=new_order.order_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        session.add(new_notification)

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
def create_checkout_session(order_data: OrderCreate, session: Session = Depends(get_session)):
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
                    created_at=datetime.utcnow()
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
