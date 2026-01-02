import os
import sys
import json
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Path setup
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(root_dir)

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

# Ensure alias
os.environ["EMAIL_FROM"] = "shop@varahajewels.in"

try:
    from backend.notifications import send_order_notifications
except ImportError:
    from notifications import send_order_notifications

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL missing")
    sys.exit(1)

ORDER_ID_TO_TEST = 28

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT * FROM \"order\" WHERE id = {ORDER_ID_TO_TEST}"))
        row = result.fetchone()
        
        if not row:
            print(f"Order {ORDER_ID_TO_TEST} not found!")
            sys.exit(1)
            
        # Map row to dictionary (assuming column order or mapping)
        # SQLAlchemy rows can be accessed by key
        order_data = {
            "order_id": row.order_id,
            "total_amount": float(row.total_amount),
            "email": row.email,
            "customer_name": row.customer_name,
            "address": row.address,
            "city": row.city,
            "pincode": row.pincode,
            "items_json": row.items_json if hasattr(row, 'items_json') else '[]'
        }
        
        print(f"Retrying email for Order {row.id} ({row.email})...")
        send_order_notifications(order_data)
        print("Success!")

except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
