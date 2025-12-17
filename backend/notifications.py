import smtplib
import requests
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_order_notifications(order_data):
    """
    Triggers email and Telegram notifications when a new order is received.
    
    Args:
        order_data (dict): Contains 'order_id' and 'total_amount' (and optionally 'items').
    """
    
    # --- 1. Email Notification ---
    try:
        sender_email = os.getenv("EMAIL_SENDER")
        sender_password = os.getenv("EMAIL_PASSWORD") 
        receiver_email = os.getenv("ADMIN_EMAIL", "admin@example.com") # Default if not set
        
        if sender_email and sender_password:
            subject = f"New Order Received: {order_data.get('order_id')}"
            body = f"""
            <html>
            <body>
                <h2>New Order Notification</h2>
                <p><strong>Order ID:</strong> {order_data.get('order_id')}</p>
                <p><strong>Total Amount:</strong> ₹{order_data.get('total_amount', 0)}</p>
                <p>Please check the admin panel for more details.</p>
            </body>
            </html>
            """
            
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = receiver_email
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'html'))
            
            # Connect to Gmail SMTP
            with smtplib.SMTP('smtp.gmail.com', 587) as server:
                server.starttls()
                server.login(sender_email, sender_password)
                server.send_message(msg)
                
            logger.info(f"Email notification sent to {receiver_email}")
        else:
            logger.warning("Email credentials not set. Skipping email notification.")
            
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")

    # --- 2. Telegram Notification ---
    try:
        bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        chat_id = os.getenv("TELEGRAM_CHAT_ID")
        
        if bot_token and chat_id:
            message = (
                f"🛍️ *New Order Received!*\n\n"
                f"🆔 *Order ID:* `{order_data.get('order_id')}`\n"
                f"💰 *Amount:* ₹{order_data.get('total_amount', 0)}\n\n"
                f"Check admin panel for details."
            )
            
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("Telegram notification sent successfully")
        else:
            logger.warning("Telegram credentials not set. Skipping Telegram notification.")
            
    except Exception as e:
        logger.error(f"Failed to send Telegram notification: {str(e)}")
