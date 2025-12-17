from sqlmodel import Session, select, col, func
from database import engine
from models import Order

def check_latest_order():
    with Session(engine) as session:
        # Get the most recent order by ID (assuming auto-increment or time-based)
        # Since order_id is a string, we might rely on 'id' (int) if it exists or 'created_at' if available.
        # Let's check the model via what we know. 'id' is usually the PK.
        
        statement = select(Order).order_by(col(Order.id).desc()).limit(1)
        order = session.exec(statement).first()
        
        if order:
            print(f"\n✅ FOUND ORDER IN AWS DATABASE!")
            print(f"Order ID: {order.order_id}")
            print(f"Customer: {order.customer_name}")
            print(f"Amount: ₹{order.total_amount}")
            print(f"Status: {order.status}")
            print(f"Email: {order.email}")
        else:
            print("❌ No orders found in this database yet.")

if __name__ == "__main__":
    check_latest_order()
