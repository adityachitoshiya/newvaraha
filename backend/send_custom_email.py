
import os
import sys
import json

# Add the current directory to sys.path so we can import backend modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from backend.notifications import send_order_notifications
except ImportError:
    # Try importing directly if run from backend dir
    from notifications import send_order_notifications

# Mock Order Data simulating real DB object (items_json string, no items list)
order_data = {
    "order_id": "TEST-ORD-JSON-002",
    "total_amount": 125000,
    "email": "royalfrd0909@gmail.com", 
    "customer_name": "Royal Friend",
    "address": "123 Royal Palace Road, Heritage City",
    "city": "Jaipur",
    "pincode": "302001",
    # Simulate DB behavior: items is NOT present, items_json IS present as string
    "items_json": json.dumps([
        {"name": "Royal Polki Necklace", "price": 75000},
        {"name": "Antique Gold Bangles", "price": 50000}
    ])
}

# Load .env explicitly to be safe
from dotenv import load_dotenv
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
load_dotenv(env_path)

# Simulate User Configuration for Alias
os.environ["EMAIL_FROM"] = "shop@varahajewels.in"

print(f"Sending test email to {order_data['email']} with items_json payload and Alias Sender...")
try:
    send_order_notifications(order_data)
    print("Test email sent successfully!")
except Exception as e:
    print(f"Failed to send test email: {e}")
