import os
from dotenv import load_dotenv
load_dotenv()

from notifications import send_telegram_alert

msg = """🛍️ <b>NEW ORDER RECEIVED!</b>
━━━━━━━━━━━━━━━━━━

🆔 <b>Order ID:</b> <code>ORD-TEST-123</code>

👤 <b>Customer:</b> John Doe & Co. (Mock)
📞 <b>Phone:</b> +91 9876543210
📧 <b>Email:</b> mock@test.com

📦 <b>Items:</b>
  1. Varaha Special Diamond Ring (Size: 10) × 1 — ₹45000

💰 <b>Total Amount:</b> ₹45000
💳 <b>Payment:</b> Online (Prepaid)

📍 <b>Delivery Address:</b>
123, Mock Address Lane, Testing City, State, 123456

━━━━━━━━━━━━━━━━━━"""

send_telegram_alert(msg)
print("Test script executed.")
