import os
import logging
from notifications import send_order_notifications
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)

# Mock order data
mock_order = {
    "order_id": "TEST-ORDER-12345",
    "total_amount": 9999,
    "email": "adityachitoshiya12@gmail.com", # As requested in prompt
    "customer_name": "Aditya Test",
    "address": "123 Test St",
    "city": "Test City",
    "pincode": "123456",
    "items": [
        {"name": "Royal Necklace", "price": 5000},
        {"name": "Gold Ring", "price": 4999}
    ],
    "is_test": True
}

try:
    print("Testing Resend Email Notification...")
    # Ensure EMAIL_PROVIDER is resend for this test, override if needed in env, 
    # but here we rely on .env or defaults. 
    # To be safe, we can force it for the function if we modify the function to accept it, 
    # but the function reads from os.getenv.
    # So we print the env var to be sure.
    print(f"EMAIL_PROVIDER: {os.getenv('EMAIL_PROVIDER')}")
    print(f"RESEND_API_KEY: {os.getenv('RESEND_API_KEY')}")
    
    send_order_notifications(mock_order)
    print("Test finished successfully.")
except Exception as e:
    print(f"Test failed with error: {e}")
