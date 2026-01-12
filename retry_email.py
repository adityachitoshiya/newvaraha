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
# os.environ["EMAIL_FROM"] = "shop@varahajewels.in"

try:
    from backend.notifications import send_order_notifications
except ImportError:
    from notifications import send_order_notifications

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL missing")
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Get latest order
        print("Fetching latest order...")
        result = conn.execute(text("SELECT * FROM \"order\" ORDER BY created_at DESC LIMIT 1"))
        row = result.fetchone()
        
        if not row:
            print("No orders found!")
            sys.exit(1)
            
        print(f"Found Latest Order: {row.id} - {row.order_id} ({row.email})")
            
        # Map row to dictionary (assuming column order or mapping)
        order_data = {
            "order_id": row.order_id,
            "total_amount": float(row.total_amount),
            "email": row.email,
            "customer_name": row.customer_name,
            "address": row.address,
            "city": row.city,
            "pincode": row.pincode,
            # Handle items_json if it exists, otherwise empty
            "items_json": row.items_json if hasattr(row, 'items_json') and row.items_json else '[]'
        }
        
        print(f"Retrying email for Order {row.id} ({row.email})...")
        send_order_notifications(order_data)
        print("Success! Email sent (check logs for confirmation).")

except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
