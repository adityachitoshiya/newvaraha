from sqlmodel import Session, select
from database import engine
from models import Order
import json

def check_orders():
    print("Checking for Online Paid Orders on Jan 11, 2026...")
    with Session(engine) as session:
        # Filter for Jan 11 onwards and status='paid'
        from datetime import datetime
        start_date = datetime(2026, 1, 10)
        
        statement = select(Order).where(Order.created_at >= start_date).order_by(Order.created_at.desc())
        orders = session.exec(statement).all()
        
        if not orders:
            print("❌ No orders (Paid/Pending/Failed) found for Jan 11 (Today).")
            print("ℹ️ This confirms your recent attempts failed before saving to DB.")
        else:
            print(f"✅ Found {len(orders)} paid orders for Jan 11:")
            print("-" * 50)
            for order in orders:
                print(f"🆔 Order ID: {order.order_id}")
                print(f"👤 Customer: {order.customer_name} ({order.email}")
                print(f"💰 Amount: ₹{order.total_amount}")
                print(f"📊 Status: {order.status}")
                print(f"📅 Date: {order.created_at}")
                print("-" * 50)

if __name__ == "__main__":
    check_orders()
