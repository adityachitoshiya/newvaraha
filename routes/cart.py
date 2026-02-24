from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from pydantic import BaseModel

# Internal Imports
from database import get_session
from models import Cart, CartItem, Product, Customer
from dependencies import get_current_user

router = APIRouter()

# --- Schemas ---

class CartItemCreate(BaseModel):
    product_id: str
    quantity: int
    variant_sku: Optional[str] = None

class CartSync(BaseModel):
    local_items: List[CartItemCreate]

# --- Routes ---

@router.get("/api/cart")
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
            # Ensure price is never None/null - use 0 as fallback
            price = product.price if product.price is not None else 0
            stock = product.stock if product.stock is not None else 0
            result.append({
                "id": item.id,
                "productId": item.product_id,
                "productName": product.name,
                "quantity": item.quantity,
                "stock": stock,  # Include stock for frontend validation
                "variant": {
                    "sku": item.variant_sku or f"{product.id}-default",
                    "name": "Standard", # Placeholder
                    "price": price,
                    "image": product.image
                }
            })
    return result

@router.post("/api/cart/sync")
def sync_cart(sync_data: CartSync, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        cart = Cart(customer_id=user.id)
        session.add(cart)
        session.commit()
        session.refresh(cart)
    
    # Existing Items Map: Key = (clean_product_id, normalized_sku)
    # clean_product_id: stripped of "-default"
    # normalized_sku: None -> "{product_id}-default" for key matching
    existing_items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    existing_map = {}
    
    for item in existing_items:
        # Normalize Data from DB
        p_id = item.product_id
        # SKUs in DB might be None (old data) or specific string
        # We need a robust key. 
        # Strategy: Use SKU if available, else construct default SKU
        sku = item.variant_sku
        
        if not sku:
             sku = f"{p_id}-default"
             
        existing_map[(p_id, sku)] = item

    warnings = []
    
    for local_item in sync_data.local_items:
        # Normalize incoming local data
        local_p_id = local_item.product_id
        if local_p_id.endswith("-default"):
             local_p_id = local_p_id.replace("-default", "")
             
        local_sku = local_item.variant_sku
        if not local_sku:
             local_sku = f"{local_p_id}-default"
             
        key = (local_p_id, local_sku)
        
        # Fetch product to check stock
        product = session.get(Product, local_p_id)
        stock = product.stock if product and product.stock is not None else float('inf')
        product_name = product.name if product else local_p_id

        if key in existing_map:
            # REPLACE: Guest cart quantity IS the truth, overwrite DB
            existing_item = existing_map[key]
            new_qty = local_item.quantity
            
            if new_qty > stock:
                warnings.append(f"{product_name}: quantity reduced from {new_qty} to {int(stock)} (limited stock)")
                new_qty = int(stock)
                
            existing_item.quantity = new_qty
            session.add(existing_item)
        else:
            # Add new item logic with stock check
            final_qty = local_item.quantity
            if final_qty > stock:
                warnings.append(f"{product_name}: quantity reduced from {final_qty} to {int(stock)} (limited stock)")
                final_qty = int(stock)
                
            if final_qty > 0: # Only add if we have quantity
                new_item = CartItem(
                    cart_id=cart.id, 
                    product_id=local_p_id, 
                    quantity=final_qty,
                    variant_sku=local_sku
                )
                session.add(new_item)
                existing_map[key] = new_item
    
    session.commit()
    
    cart_items = get_cart(user, session)
    return {"items": cart_items, "warnings": warnings}

@router.post("/api/cart/items")
def add_to_cart(item_in: CartItemCreate, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        cart = Cart(customer_id=user.id)
        session.add(cart)
        session.commit()
        session.refresh(cart)
        
    # Sanitize product_id: If it looks like a SKU (ends with -default), strip it
    real_product_id = item_in.product_id
    if "-default" in real_product_id and not session.get(Product, real_product_id):
        # Try to recover the real product ID
        potential_id = real_product_id.split("-default")[0]
        if session.get(Product, potential_id):
            real_product_id = potential_id
            # Also update item_in for consistency if needed, but we use real_product_id below
    
    # Validation: Check Stock
    product = session.get(Product, real_product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
        
    if product.stock is not None and product.stock <= 0:
        raise HTTPException(status_code=400, detail="Product is out of stock")
    
    # Check if requested quantity exceeds available stock
    if product.stock is not None and item_in.quantity > product.stock:
        raise HTTPException(
            status_code=400, 
            detail=f"Only {product.stock} units available in stock"
        )
    
    # Check duplicate
    existing = session.exec(select(CartItem).where(
        CartItem.cart_id == cart.id,
        CartItem.product_id == real_product_id,
        CartItem.variant_sku == item_in.variant_sku
    )).first()
    
    if existing:
        new_total_qty = existing.quantity + item_in.quantity
        if product.stock is not None and new_total_qty > product.stock:
             raise HTTPException(
                status_code=400, 
                detail=f"Cannot add more. You already have {existing.quantity} in cart. Max available: {product.stock}"
            )
        existing.quantity += item_in.quantity
        session.add(existing)
    else:
        new_item = CartItem(
            cart_id=cart.id,
            product_id=real_product_id, # Ensure this matches Product.id (string)
            quantity=item_in.quantity,
            variant_sku=item_in.variant_sku
        )
        session.add(new_item)
        
    session.commit()
    session.refresh(existing if existing else new_item)
    return existing if existing else new_item

@router.put("/api/cart/items/{item_id}")
def update_cart_item(item_id: int, quantity: int, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart: raise HTTPException(status_code=404)
    
    item = session.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if quantity <= 0:
        session.delete(item)
    else:
        # Stock validation
        product = session.get(Product, item.product_id)
        if product and product.stock is not None and quantity > product.stock:
            raise HTTPException(
                status_code=400,
                detail=f"Only {product.stock} units available in stock"
            )
        item.quantity = quantity
        session.add(item)
    
    session.commit()
    return {"ok": True}

@router.delete("/api/cart/items/{item_id}")
def remove_from_cart(item_id: int, user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart: raise HTTPException(status_code=404)

    item = session.get(CartItem, item_id)
    if not item or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="Item not found")
        
    session.delete(item)
    session.commit()
    return {"ok": True}

@router.delete("/api/cart/clear")
def clear_cart(user: Customer = Depends(get_current_user), session: Session = Depends(get_session)):
    cart = session.exec(select(Cart).where(Cart.customer_id == user.id)).first()
    if not cart:
        return {"ok": True, "message": "Cart already empty"}
    
    # Delete all items in the cart
    items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    for item in items:
        session.delete(item)
    
    session.commit()
    return {"ok": True, "message": "Cart cleared"}
