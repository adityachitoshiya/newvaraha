import smtplib
import requests
import os
import resend
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import logging

# Configure logging
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from database import engine
from sqlmodel import Session, select
from models import Order

def send_order_notifications(order_data):
    """
    Triggers email and Telegram notifications when a new order is received.
    
    Args:
        order_data (dict): Contains 'order_id' and 'total_amount' (and optionally 'items' or 'items_json').
    """
    logging.error("BACKGROUND TASK TRIGGERED")
    logger.info(f"Preparing to send notifications for Order: {order_data.get('order_id')}")
    
    # --- 1. Email Notification ---
    try:
        # Support user's preferred env var 'EMAIL_USER' matching the guide, fallback to 'EMAIL_SENDER'
        sender_email = os.getenv("EMAIL_USER") or os.getenv("EMAIL_SENDER")
        sender_password = os.getenv("EMAIL_PASSWORD") 
        # Support for alias: authenticate with sender_email, but send as sender_alias if set
        sender_alias = os.getenv("EMAIL_FROM", sender_email)
        
        # Admin Email
        admin_email = os.getenv("ADMIN_EMAIL")
        # Fallback to sender_email if ADMIN_EMAIL is not set or is the default example
        if not admin_email or admin_email == "admin@example.com":
            admin_email = sender_email

        # AWS SES Credentials
        aws_access_key = os.getenv("AWS_ACCESS_KEY_ID")
        aws_secret_key = os.getenv("AWS_SECRET_ACCESS_KEY")
        aws_region = os.getenv("AWS_REGION", "ap-south-1")
        
        # Determine Provider: 'ses' or 'smtp'
        # Default to SES if keys are present, unless explicitly set to 'smtp'
        email_provider = os.getenv("EMAIL_PROVIDER", "ses" if aws_access_key and aws_secret_key else "smtp").lower()
        
        # Prepare Email Content (Common for both)
        subject_admin = f"New Order Received: {order_data.get('order_id')}"
        body_admin = f"""
        <html>
        <body>
            <h2>New Order Notification</h2>
            <p><strong>Order ID:</strong> {order_data.get('order_id')}</p>
            <p><strong>Total Amount:</strong> ₹{order_data.get('total_amount', 0)}</p>
            <p><strong>Customer:</strong> {order_data.get('email', 'N/A')}</p>
            <p>Please check the admin panel for more details.</p>
        </body>
        </html>
        """
        
        msg_admin = MIMEMultipart()
        msg_admin['From'] = f"Varaha Jewels <{sender_alias}>"
        msg_admin['To'] = admin_email
        msg_admin['Subject'] = subject_admin
        msg_admin.attach(MIMEText(body_admin, 'html'))

        # Customer Email Content
        customer_email = order_data.get('email')
        msg_customer = None
        
        if customer_email:
            subject_customer = f"Order Confirmation - {order_data.get('order_id')} | Varaha Jewels"
            # Prepare items HTML
            items_html = ""
            items = order_data.get('items', [])
            # If items not found, try to parse items_json
            if not items and 'items_json' in order_data:
                try:
                    items = json.loads(order_data['items_json'])
                except json.JSONDecodeError:
                    logger.error("Failed to parse items_json")
                    items = []
            if items:
                items_html += '<table style="width: 100%; border-collapse: collapse;">'
                for item in items:
                    name = item.get('name', 'Product')
                    price = item.get('price', 0)
                    items_html += f"""
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #e0d8c3; color: #1a1a1a; font-family: 'Georgia', serif; font-size: 16px;">{name}</td>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #e0d8c3; text-align: right; color: #444; font-family: 'Helvetica', sans-serif; font-size: 15px;">₹{price}</td>
                        </tr>
                    """
                items_html += '</table>'
            else:
                items_html = f"""
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                             <td style="padding: 10px 0; color: #1a1a1a; font-family: 'Georgia', serif; font-size: 16px;">Order Items</td>
                             <td style="padding: 10px 0; text-align: right; color: #444; font-family: 'Helvetica', sans-serif; font-size: 15px;">₹{order_data.get('total_amount', 0)}</td>
                        </tr>
                    </table>
                """

            body_customer = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation</title>
                <style>
                    /* Reset styles */
                    body {{ margin: 0; padding: 0; background-color: #f4f1ea; font-family: 'Helvetica', 'Arial', sans-serif; -webkit-font-smoothing: antialiased; }}
                    table {{ border-collapse: collapse; width: 100%; }}
                    
                    /* Container */
                    .wrapper {{ width: 100%; table-layout: fixed; background-color: #f4f1ea; padding-bottom: 50px; padding-top: 50px; }}
                    .main-content {{ background-color: #ffffff; margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: 'Helvetica', 'Arial', sans-serif; color: #2c2c2c; box-shadow: 0 5px 25px rgba(0,0,0,0.08); border: 1px solid #e0d8c3; }}
                    
                    /* Decorative Frame inside content */
                    .inner-border {{ border: 2px double #c5a059; margin: 15px; display: block; }}

                    /* Header */
                    .header {{ padding: 60px 40px 40px 40px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0e6d2; }}
                    .logo {{ font-family: 'Georgia', 'Times New Roman', serif; font-size: 32px; color: #1a1a1a; text-decoration: none; letter-spacing: 4px; text-transform: uppercase; font-weight: normal; border-bottom: 2px solid #c5a059; padding-bottom: 10px; display: inline-block; }}
                    .tagline {{ font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 15px; color: #888; display: block; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    
                    /* Body */
                    .content-section {{ padding: 40px 50px 60px 50px; }}
                    .welcome-text {{ font-family: 'Georgia', 'Times New Roman', serif; font-size: 26px; font-weight: normal; margin-bottom: 25px; color: #1a1a1a; text-align: center; letter-spacing: 0.5px; font-style: italic; }}
                    .body-text {{ font-size: 16px; line-height: 1.9; color: #555555; margin-bottom: 45px; text-align: center; font-weight: normal; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    
                    /* Order Details Box */
                    .order-box {{ background-color: #faf9f6; padding: 30px; margin-bottom: 40px; border: 1px solid #e8e3d6; }}
                    .order-header {{ font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #c5a059; margin-bottom: 25px; font-weight: bold; text-align: center; border-bottom: 1px solid #e8e3d6; padding-bottom: 15px; }}
                    
                    /* Order Items */
                    .item-row {{ width: 100%; margin-bottom: 20px; display: block; border-bottom: 1px dashed #e0d8c3; padding-bottom: 20px; }}
                    .item-row:last-child {{ border-bottom: none; margin-bottom: 0; padding-bottom: 0; }}
                    .item-name {{ font-weight: normal; color: #1a1a1a; float: left; font-size: 16px; letter-spacing: 0.5px; font-family: 'Georgia', 'Times New Roman', serif; }}
                    .item-price {{ float: right; color: #444; font-weight: normal; font-family: 'Helvetica', 'Arial', sans-serif; font-size: 15px; }}
                    .clearfix::after {{ content: ""; clear: both; display: table; }}
                    
                    /* Totals */
                    .total-section {{ border-top: 1px solid #c5a059; margin-top: 25px; padding-top: 25px; }}
                    .total-row {{ margin-bottom: 12px; }}
                    .total-label {{ float: left; color: #777; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    .total-value {{ float: right; font-weight: normal; color: #1a1a1a; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    .grand-total {{ font-size: 20px; margin-top: 20px; color: #1a1a1a; }}
                    .grand-total .total-label {{ color: #1a1a1a; font-weight: bold; font-family: 'Georgia', 'Times New Roman', serif; }}
                    .grand-total .total-value {{ color: #c5a059; font-weight: bold; font-family: 'Helvetica', 'Arial', sans-serif; }}

                    /* Button */
                    .btn-container {{ text-align: center; margin: 50px 0; }}
                    .btn {{ background-color: #1a1a1a; color: #c5a059; padding: 20px 45px; text-decoration: none; border-radius: 0px; font-weight: normal; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 2.5px; border: 1px solid #c5a059; transition: all 0.3s; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    .btn:hover {{ background-color: #c5a059; color: #fff; }}
                    
                    /* Footer */
                    .footer {{ background-color: #f4f1ea; padding: 40px 40px; text-align: center; font-size: 11px; color: #8a8579; text-transform: uppercase; letter-spacing: 1.5px; font-family: 'Helvetica', 'Arial', sans-serif; }}
                    .footer a {{ color: #8a8579; text-decoration: none; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin: 0 8px; }}
                    
                    /* Mobile Responsive */
                    @media screen and (max-width: 600px) {{
                        .main-content {{ width: 100% !important; border: none; }}
                        .inner-border {{ margin: 0; border: none; }}
                        .content-section {{ padding: 30px 20px !important; }}
                        .header {{ padding: 40px 20px !important; }}
                        .btn {{ width: 100%; box-sizing: border-box; }}
                    }}
                </style>
            </head>
            <body>
                <div class="wrapper">
                    <center>
                        <table class="main-content">
                            <tr>
                                <td>
                                    <!-- Decorative Inner Border Start -->
                                    <div class="inner-border">
                                        <table style="width: 100%;">
                                            <!-- Header / Logo -->
                                            <tr>
                                                <td class="header">
                                                    <a href="#" class="logo">
                                                        <img src="https://res.cloudinary.com/dd5zrsmok/image/upload/v1766342264/logo_hvef6t.png" alt="Varaha Jewels" width="200" style="border:0; display:block; margin:0 auto;">
                                                    </a>
                                                    <span class="tagline">Where heritage meets royalty</span>
                                                </td>
                                            </tr>

                                            <!-- Main Content -->
                                            <tr>
                                                <td class="content-section">
                                                    <h1 class="welcome-text">Your Treasure Awaits</h1>
                                                    <p class="body-text">
                                                        Namaste <strong>{order_data.get('customer_name', 'Customer')}</strong>,<br>
                                                        We are delighted to confirm your recent acquisition. Your timeless pieces are being prepared with the utmost care and will soon be on their way to you.
                                                    </p>

                                                    <!-- Order Summary Box -->
                                                    <div class="order-box">
                                                        <div class="order-header">Order #{order_data.get('order_id')}</div>
                                                        
                                                        <!-- Items -->
                                                        {items_html}

                                                        <!-- Totals -->
                                                        <div class="total-section">
                                                            <table style="width: 100%; border-collapse: collapse;">
                                                                <tr>
                                                                    <td class="total-label" style="padding-bottom: 8px;">Subtotal</td>
                                                                    <td class="total-value" style="text-align: right; padding-bottom: 8px;">₹{order_data.get('total_amount', 0)}</td>
                                                                </tr>
                                                                <tr>
                                                                    <td class="total-label" style="padding-bottom: 8px;">Insured Shipping</td>
                                                                    <td class="total-value" style="text-align: right; padding-bottom: 8px;">Complimentary</td>
                                                                </tr>
                                                                <tr>
                                                                    <td class="total-label" style="padding-top: 15px; border-top: 1px solid #c5a059; color: #1a1a1a; font-weight: bold; font-family: 'Georgia', serif; font-size: 16px;">Grand Total</td>
                                                                    <td class="total-value" style="text-align: right; padding-top: 15px; border-top: 1px solid #c5a059; color: #c5a059; font-weight: bold; font-size: 18px;">₹{order_data.get('total_amount', 0)}</td>
                                                                </tr>
                                                            </table>
                                                        </div>
                                                    </div>

                                                    <!-- CTA Button -->
                                                    <div class="btn-container">
                                                        <a href="{os.getenv('FRONTEND_URL', 'https://varahajewels.com')}/orders/{order_data.get('order_id')}" class="btn">View Order Details</a>
                                                    </div>
                                                    
                                                    <p style="text-align: center; font-size: 14px; color: #777; margin-top: 30px; font-family: 'Helvetica', sans-serif;">
                                                        We will notify you once your order is sent for shipping.
                                                    </p>
                                                    
                                                    <div style="text-align: center; margin: 40px 0;">
                                                        <span style="font-size: 20px; color: #c5a059;">♦</span>
                                                    </div>

                                                    <!-- Shipping Address -->
                                                    <div style="text-align: center; font-size: 14px; color: #444; line-height: 1.6;">
                                                        <strong style="text-transform: uppercase; letter-spacing: 1px; font-size: 12px; color: #c5a059;">Shipping Destination</strong><br>
                                                        {order_data.get('address')}<br>
                                                        {order_data.get('city')}, {order_data.get('pincode')}
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>
                                    </div>
                                    <!-- Decorative Inner Border End -->
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td class="footer">
                                    <p>&copy; 2025 Varaha Jewels. All rights reserved.</p>
                                    <p>Where Heritage Meets Royalty</p>
                                    <p style="margin-top: 20px;"><a href="#">Unsubscribe</a> | <a href="#">Care Instructions</a> | <a href="#">Concierge</a></p>
                                </td>
                            </tr>
                        </table>
                    </center>
                </div>
            </body>
            </html>
            """
            
            msg_customer = MIMEMultipart()
            msg_customer['From'] = f"Varaha Jewels <{sender_alias}>"
            msg_customer['To'] = customer_email
            msg_customer['Subject'] = subject_customer
            msg_customer.attach(MIMEText(body_customer, 'html'))
        

        # --- SEND VIA RESEND ---
        if email_provider == 'resend':
            resend.api_key = os.getenv("RESEND_API_KEY")
            logger.info("Sending emails via Resend...")

            # Send to Admin
            try:
                r_admin = resend.Emails.send({
                    "from": f"Varaha Jewels <{sender_alias}>" if '@' in sender_alias else "onboarding@resend.dev", # Resend requires verified domain or onboarding email
                    "to": admin_email,
                    "subject": subject_admin,
                    "html": body_admin
                })
                logger.info(f"Resend: Admin notification sent. ID: {r_admin.get('id')}")
            except Exception as e:
                logger.error(f"Resend Error (Admin): {str(e)}")

            # Send to Customer
            if customer_email:
                try:
                    r_customer = resend.Emails.send({
                        "from": f"Varaha Jewels <{sender_alias}>" if '@' in sender_alias else "onboarding@resend.dev",
                        "to": customer_email,
                        "subject": subject_customer,
                        "html": body_customer
                    })
                    logger.info(f"Resend: Customer confirmation sent. ID: {r_customer.get('id')}")

                    # UPDATE DB STATUS: SUCCESS
                    with Session(engine) as session:
                        statement = select(Order).where(Order.order_id == order_data.get('order_id'))
                        order_record = session.exec(statement).first()
                        if order_record:
                            order_record.email_status = "sent"
                            session.add(order_record)
                            session.commit()
                            logger.info(f"Updated Order {order_record.order_id} email_status to 'sent'")
                except Exception as e:
                    logger.error(f"Resend Error (Customer): {str(e)}")
                    raise e

        # --- SEND VIA SES ---
        elif email_provider == 'ses' and aws_access_key and aws_secret_key:
            import boto3
            from botocore.exceptions import ClientError
            
            logger.info("Sending emails via Amazon SES...")
            
            # Initialize SES Client
            ses_client = boto3.client(
                'ses',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )

            # Send to Admin
            try:
                ses_client.send_raw_email(
                    Source=sender_alias,
                    Destinations=[admin_email],
                    RawMessage={'Data': msg_admin.as_string()}
                )
                logger.info(f"SES: Admin notification sent to {admin_email}")
            except ClientError as e:
                logger.error(f"SES Error (Admin): {e.response['Error']['Message']}")

            # Send to Customer
            if msg_customer and customer_email:
                try:
                    ses_client.send_raw_email(
                        Source=sender_alias,
                        Destinations=[customer_email],
                        RawMessage={'Data': msg_customer.as_string()}
                    )
                    logger.info(f"SES: Customer confirmation sent to {customer_email}")
                    
                    # UPDATE DB STATUS: SUCCESS
                    with Session(engine) as session:
                        statement = select(Order).where(Order.order_id == order_data.get('order_id'))
                        order_record = session.exec(statement).first()
                        if order_record:
                            order_record.email_status = "sent"
                            session.add(order_record)
                            session.commit()
                            logger.info(f"Updated Order {order_record.order_id} email_status to 'sent'")
                            
                except ClientError as e:
                    logger.error(f"SES Error (Customer): {e.response['Error']['Message']}")
                    raise e # Retrigger for failure handling
                    
        # --- SEND VIA SMTP (Fallback or Explicit) ---
        else:
            smtp_host = os.getenv("SMTP_HOST", "smtp.hostinger.com")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            
            if not sender_email or not sender_password:
                logger.warning("Email credentials not set. Skipping email notification.")
            else:
                # Retry logic for robust email sending
                max_retries = 3
                retry_delay = 2 # seconds
                import time
                
                for attempt in range(1, max_retries + 1):
                    try:
                        logger.info(f"Connecting to SMTP: {smtp_host}:{smtp_port} (Attempt {attempt}/{max_retries})...")
                        
                        if smtp_port == 465:
                            # SSL Connection with timeout
                            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                                logger.info("SMTP SSL Connected. Logging in...")
                                server.login(sender_email, sender_password)
                                logger.info("SMTP Login Success. Sending email...")
                                server.send_message(msg_admin)
                                if msg_customer:
                                    server.send_message(msg_customer)
                        else:
                            # TLS Connection (587) with timeout
                            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                                logger.info("SMTP Connected. Starting TLS...")
                                server.starttls()
                                logger.info("SMTP TLS Started. Logging in...")
                                server.login(sender_email, sender_password)
                                server.send_message(msg_admin)
                                if msg_customer:
                                    server.send_message(msg_customer)
                                    
                        logger.info(f"Email notifications sent to Admin ({admin_email}) and Customer ({customer_email})")
                        
                        # UPDATE DB STATUS: SUCCESS
                        if customer_email:
                            with Session(engine) as session:
                                statement = select(Order).where(Order.order_id == order_data.get('order_id'))
                                order_record = session.exec(statement).first()
                                if order_record:
                                    order_record.email_status = "sent"
                                    session.add(order_record)
                                    session.commit()
                                    logger.info(f"Updated Order {order_record.order_id} email_status to 'sent'")
                        
                        # Break loop if successful
                        break
                        
                    except smtplib.SMTPAuthenticationError as auth_err:
                        logger.error(f"❌ SMTP Auth Error: {auth_err.smtp_code} - {auth_err.smtp_error}")
                        logger.error("Double check your EMAIL_FROM and EMAIL_PASSWORD in .env")
                        raise auth_err # Don't retry on auth error
                        
                    except Exception as e:
                        logger.error(f"❌ SMTP Connection Error (Attempt {attempt}): {str(e)}")
                        if attempt == max_retries:
                            raise e
                        time.sleep(retry_delay)
    
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
        
        # UPDATE DB STATUS: FAILED
        try:
            with Session(engine) as session:
                statement = select(Order).where(Order.order_id == order_data.get('order_id'))
                order_record = session.exec(statement).first()
                if order_record:
                    order_record.email_status = "failed"
                    session.add(order_record)
                    session.commit()
                    logger.error(f"Updated Order {order_record.order_id} email_status to 'failed'")
        except Exception as db_err:
             logger.error(f"Failed to update DB status to failed: {str(db_err)}")
        # Re-raise for test endpoint to catch
        if order_data.get('is_test'):
             raise e

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


def send_shipping_notifications(order_data):
    """
    Triggers email notification when an order is shipped.
    """
    try:
        # Load Config
        sender_email = os.getenv("EMAIL_USER") or os.getenv("EMAIL_SENDER")
        sender_alias = os.getenv("EMAIL_FROM", sender_email)
        email_provider = os.getenv("EMAIL_PROVIDER", "smtp").lower()
        resend_api_key = os.getenv("RESEND_API_KEY")
        
        customer_email = order_data.get('email')
        if not customer_email:
            logger.warning("No customer email found for shipping notification")
            return

        subject = f"Your Order has been Shipped! - {order_data.get('order_id')} | Varaha Jewels"
        
        tracking_url = f"{os.getenv('FRONTEND_URL', 'https://varahajewels.com')}/orders/{order_data.get('order_id')}"
        
        body_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica', sans-serif; background-color: #f4f1ea; margin: 0; padding: 0; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0d8c3; }}
                .header {{ text-align: center; padding: 40px; border-bottom: 1px solid #f0e6d2; }}
                .content {{ padding: 40px; text-align: center; }}
                .btn {{ background-color: #1a1a1a; color: #c5a059; padding: 15px 30px; text-decoration: none; display: inline-block; margin-top: 20px; text-transform: uppercase; letter-spacing: 2px; }}
                .details {{ background-color: #faf9f6; padding: 20px; margin: 20px 0; text-align: left; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://res.cloudinary.com/dd5zrsmok/image/upload/v1766342264/logo_hvef6t.png" width="150" alt="Varaha Jewels">
                </div>
                <div class="content">
                    <h2 style="font-family: 'Georgia', serif; color: #1a1a1a;">Your Order is on the way!</h2>
                    <p style="color: #666; line-height: 1.6;">
                        Great news, <strong>{order_data.get('customer_name')}</strong>! Your order items have been dispatched and are making their way to you.
                    </p>
                    
                    <div class="details">
                        <p><strong>Courier:</strong> {order_data.get('courier_name')}</p>
                        <p><strong>Tracking Number (AWB):</strong> {order_data.get('awb_number')}</p>
                    </div>

                    <a href="{tracking_url}" class="btn">Track Your Order</a>
                    
                    <p style="color: #999; font-size: 12px; margin-top: 40px;">
                        You can also track your shipment directly on the courier's website using the AWB number provided.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """

        # Resend Logic
        if email_provider == 'resend' and resend_api_key:
            import resend
            resend.api_key = resend_api_key
            r = resend.Emails.send({
                "from": f"Varaha Jewels <{sender_alias}>" if '@' in sender_alias else "onboarding@resend.dev",
                "to": customer_email,
                "subject": subject,
                "html": body_html
            })
            logger.info(f"Shipping email sent via Resend. ID: {r.get('id')}")
            
        else:
            logger.warning("Shipping email skipped: Provider not Resend or keys missing.")

    except Exception as e:
        logger.error(f"Failed to send shipping notification: {str(e)}")


def send_tracking_notification(order, status: str):
    """
    Send email notifications based on tracking status updates.
    Called from webhook when status changes.
    
    Triggers:
    - shipped: "Your Varaha piece has been shipped!"
    - out_for_delivery: "Your package is out for delivery today."
    - delivered: "Delivered! Hope you love your jewels."
    """
    import hashlib
    
    try:
        # Config
        sender_alias = os.getenv("EMAIL_FROM", os.getenv("EMAIL_USER"))
        resend_api_key = os.getenv("RESEND_API_KEY")
        email_provider = os.getenv("EMAIL_PROVIDER", "resend").lower()
        frontend_url = os.getenv("FRONTEND_URL", "https://varahajewels.in")
        
        customer_email = order.email
        if not customer_email:
            logger.warning(f"No email for order {order.order_id} - skipping notification")
            return
        
        # Generate tracking token
        tracking_secret = os.getenv("TRACKING_SECRET", "varaha_track_secret_2026")
        tracking_token = hashlib.sha256(f"{order.order_id}_{tracking_secret}".encode()).hexdigest()[:16]
        tracking_url = f"{frontend_url}/track/{order.order_id}_{tracking_token}"
        
        subject = None
        body_html = None
        
        # Status-specific templates
        if status == "shipped":
            subject = f"📦 Your Varaha Piece has been Shipped! - {order.order_id}"
            body_html = f"""
            <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e0d8c3;">
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);">
                    <img src="https://res.cloudinary.com/dd5zrsmok/image/upload/v1766342264/logo_hvef6t.png" width="150" alt="Varaha Jewels">
                </div>
                <div style="padding: 40px; text-align: center;">
                    <h2 style="font-family: 'Georgia', serif; color: #1a1a1a; margin-bottom: 20px;">Your Treasure is on the Way! 📦</h2>
                    <p style="color: #666; line-height: 1.8; font-size: 16px;">
                        Namaste <strong>{order.customer_name.split()[0] if order.customer_name else 'Customer'}</strong>,<br><br>
                        Your Varaha piece has been carefully packed and shipped. It's now making its way to you!
                    </p>
                    
                    <div style="background: #faf9f6; padding: 20px; margin: 30px 0; border: 1px solid #e8e3d6; text-align: left;">
                        <p style="margin: 8px 0;"><strong>AWB Number:</strong> {order.awb_number or 'Pending'}</p>
                        <p style="margin: 8px 0;"><strong>Courier:</strong> {order.courier_name or 'RapidShyp'}</p>
                    </div>
                    
                    <a href="{tracking_url}" style="background: #c5a059; color: #fff; padding: 15px 40px; text-decoration: none; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 20px;">
                        Track Your Order
                    </a>
                </div>
                <div style="text-align: center; padding: 20px; background: #f4f1ea; font-size: 11px; color: #888;">
                    © 2025 Varaha Jewels | Where Heritage Meets Royalty
                </div>
            </div>
            """
            
        elif status == "out_for_delivery":
            subject = f"🚚 Your Package is Out for Delivery! - {order.order_id}"
            body_html = f"""
            <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e0d8c3;">
                <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #c5a059 0%, #a8893c 100%);">
                    <img src="https://res.cloudinary.com/dd5zrsmok/image/upload/v1766342264/logo_hvef6t.png" width="150" alt="Varaha Jewels">
                </div>
                <div style="padding: 40px; text-align: center;">
                    <h2 style="font-family: 'Georgia', serif; color: #1a1a1a; margin-bottom: 20px;">Almost There! 🚚</h2>
                    <p style="color: #666; line-height: 1.8; font-size: 16px;">
                        Exciting news <strong>{order.customer_name.split()[0] if order.customer_name else 'Customer'}</strong>!<br><br>
                        Your Varaha jewellery is <strong style="color: #c5a059;">out for delivery today</strong>. Please ensure someone is available to receive it.
                    </p>
                    
                    <div style="background: #e8f5e9; padding: 20px; margin: 30px 0; border: 1px solid #c8e6c9; border-radius: 8px;">
                        <p style="color: #2e7d32; font-size: 18px; margin: 0;">📍 Delivery Expected Today</p>
                    </div>
                    
                    <a href="{tracking_url}" style="background: #1a1a1a; color: #c5a059; padding: 15px 40px; text-decoration: none; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                        Track Live
                    </a>
                </div>
            </div>
            """
            
        elif status == "delivered":
            subject = f"✨ Your Varaha Jewels have been Delivered! - {order.order_id}"
            body_html = f"""
            <div style="font-family: 'Helvetica', sans-serif; max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e0d8c3;">
                <div style="text-align: center; padding: 40px; background: linear-gradient(135deg, #1a5e3a 0%, #2e7d32 100%);">
                    <span style="font-size: 60px;">✨</span>
                </div>
                <div style="padding: 40px; text-align: center;">
                    <h2 style="font-family: 'Georgia', serif; color: #1a1a1a; margin-bottom: 20px;">Your Treasure has Arrived!</h2>
                    <p style="color: #666; line-height: 1.8; font-size: 16px;">
                        Dear <strong>{order.customer_name.split()[0] if order.customer_name else 'Customer'}</strong>,<br><br>
                        We hope your Varaha piece brings you immense joy and becomes a cherished part of your collection.
                    </p>
                    
                    <div style="background: #fff8e1; padding: 25px; margin: 30px 0; border: 1px solid #ffe082; border-radius: 8px;">
                        <p style="color: #f57c00; font-size: 16px; margin: 0 0 10px 0;">💭 We'd love your feedback!</p>
                        <p style="color: #666; font-size: 14px; margin: 0;">Share your experience and tag us on Instagram @varahajewels</p>
                    </div>
                    
                    <a href="{frontend_url}/account" style="background: #c5a059; color: #fff; padding: 15px 40px; text-decoration: none; display: inline-block; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">
                        Rate Your Purchase
                    </a>
                </div>
                <div style="text-align: center; padding: 20px; background: #f4f1ea; font-size: 11px; color: #888;">
                    Thank you for choosing Varaha Jewels ♦ Where Heritage Meets Royalty
                </div>
            </div>
            """
        else:
            # No notification for other statuses
            return
        
        # Send via Resend
        if email_provider == 'resend' and resend_api_key:
            resend.api_key = resend_api_key
            result = resend.Emails.send({
                "from": f"Varaha Jewels <{sender_alias}>" if sender_alias and '@' in sender_alias else "onboarding@resend.dev",
                "to": customer_email,
                "subject": subject,
                "html": body_html
            })
            logger.info(f"Tracking notification ({status}) sent to {customer_email}. ID: {result.get('id')}")
        else:
            logger.warning(f"Tracking notification skipped: Provider not configured")
            
    except Exception as e:
        logger.error(f"Failed to send tracking notification ({status}): {str(e)}")

