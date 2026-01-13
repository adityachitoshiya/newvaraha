import os
import logging
from notifications import send_shipping_notifications
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)

# Mock order data
mock_order = {
    "order_id": "TEST-SHIP-123",
    "customer_name": "Aditya Verification",
    "email": "adityachitoshiya12@gmail.com", 
    "courier_name": "BlueDart",
    "awb_number": "1234567890",
    "is_test": True
}

try:
    print("Testing Shipping Notification...")
    send_shipping_notifications(mock_order)
    print("Test finished successfully.")
except Exception as e:
    print(f"Test failed with error: {e}")
