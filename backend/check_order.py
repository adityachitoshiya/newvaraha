
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select
from database import engine
from models import Order

def check_order():
    with Session(engine) as session:
        statement = select(Order).where(Order.customer_name.ilike("%Satish Parmar%"))
        results = session.exec(statement).all()
        
        if not results:
            print("No order found for 'Satish Parmar'")
        else:
            for order in results:
                print(f"Order Found: ID={order.order_id}, Email={order.email}, Amount={order.total_amount}")
                print(f"Items JSON: {order.items_json}")

if __name__ == "__main__":
    check_order()
