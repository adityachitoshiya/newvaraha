"""
Quick test script to verify Resend email is working.
Run: python test_email.py
"""
import os
import sys

# Load .env manually
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, val = line.split('=', 1)
                os.environ[key.strip()] = val.strip()

# Install resend if needed
try:
    import resend
except ImportError:
    os.system(f'{sys.executable} -m pip install resend')
    import resend

# Config
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
EMAIL_FROM = os.getenv("EMAIL_FROM", "shop@varahajewels.in")
EMAIL_SENDER = os.getenv("EMAIL_SENDER", "help@varahajewels.in")
sender_alias = EMAIL_FROM or EMAIL_SENDER

TEST_EMAIL = "royalfrd0909@gmail.com"

print("=" * 50)
print("🔧 VARAHA JEWELS - EMAIL TEST")
print("=" * 50)
print(f"📧 RESEND_API_KEY: {RESEND_API_KEY[:10]}...{RESEND_API_KEY[-4:]}" if RESEND_API_KEY else "❌ RESEND_API_KEY NOT SET!")
print(f"📤 From: Varaha Jewels <{sender_alias}>")
print(f"📥 To: {TEST_EMAIL}")
print(f"🏷️  Provider: {os.getenv('EMAIL_PROVIDER', 'not set')}")
print("=" * 50)

if not RESEND_API_KEY:
    print("❌ RESEND_API_KEY is missing from .env!")
    sys.exit(1)

# Set API Key
resend.api_key = RESEND_API_KEY

# Build test email (same template as order confirmation)
subject = "✅ Test Email - Order Confirmation | Varaha Jewels"
html_body = """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Helvetica', sans-serif; background-color: #f4f1ea; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0d8c3; }
        .header { text-align: center; padding: 40px; border-bottom: 1px solid #f0e6d2; }
        .content { padding: 40px; text-align: center; }
        .btn { background-color: #1a1a1a; color: #c5a059; padding: 15px 30px; text-decoration: none; display: inline-block; margin-top: 20px; text-transform: uppercase; letter-spacing: 2px; }
        .order-box { background-color: #faf9f6; padding: 25px; margin: 20px 0; border: 1px solid #e8e3d6; }
    </style>
</head>
<body>
    <div style="padding: 40px 0; background-color: #f4f1ea;">
        <div class="container">
            <div class="header">
                <img src="https://res.cloudinary.com/dd5zrsmok/image/upload/v1766342264/logo_hvef6t.png" width="180" alt="Varaha Jewels" style="border:0;">
                <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; margin-top: 15px; color: #888;">Where heritage meets royalty</p>
            </div>
            <div class="content">
                <h2 style="font-family: 'Georgia', serif; color: #1a1a1a; font-style: italic;">🎉 Test Email Successful!</h2>
                <p style="color: #666; line-height: 1.8; font-size: 16px;">
                    This is a test email from <strong>Varaha Jewels</strong> notification system.<br><br>
                    If you're seeing this, it means the <strong>order confirmation emails are working correctly!</strong>
                </p>
                
                <div class="order-box">
                    <p style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; color: #c5a059; font-weight: bold; text-align: center; border-bottom: 1px solid #e8e3d6; padding-bottom: 15px;">Test Order Summary</p>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #e0d8c3; color: #1a1a1a; font-family: 'Georgia', serif;">Gold Heritage Necklace</td>
                            <td style="padding: 10px 0; border-bottom: 1px dashed #e0d8c3; text-align: right; color: #444;">₹2,499</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px 0; color: #1a1a1a; font-family: 'Georgia', serif;">Royal Kundan Earrings</td>
                            <td style="padding: 10px 0; text-align: right; color: #444;">₹1,299</td>
                        </tr>
                        <tr>
                            <td style="padding-top: 15px; border-top: 1px solid #c5a059; color: #1a1a1a; font-weight: bold; font-family: 'Georgia', serif; font-size: 16px;">Grand Total</td>
                            <td style="text-align: right; padding-top: 15px; border-top: 1px solid #c5a059; color: #c5a059; font-weight: bold; font-size: 18px;">₹3,798</td>
                        </tr>
                    </table>
                </div>

                <a href="https://varahajewels.in" class="btn">Visit Varaha Jewels</a>
                
                <p style="color: #999; font-size: 12px; margin-top: 40px;">
                    This was a test email. No actual order was placed.
                </p>
            </div>
            <div style="text-align: center; padding: 30px; background-color: #f4f1ea; font-size: 11px; color: #8a8579; text-transform: uppercase; letter-spacing: 1.5px;">
                <p>© 2025 Varaha Jewels. All rights reserved.</p>
                <p>Where Heritage Meets Royalty</p>
            </div>
        </div>
    </div>
</body>
</html>
"""

# Send!
try:
    from_addr = f"Varaha Jewels <{sender_alias}>" if '@' in sender_alias else "onboarding@resend.dev"
    print(f"\n🚀 Sending test email...")
    print(f"   From: {from_addr}")
    
    result = resend.Emails.send({
        "from": from_addr,
        "to": [TEST_EMAIL],
        "subject": subject,
        "html": html_body
    })
    
    print(f"\n✅ SUCCESS! Email sent!")
    print(f"📧 Resend Email ID: {result.id if hasattr(result, 'id') else result}")
    print(f"\n👉 Check inbox of {TEST_EMAIL}")
    print(f"   (Also check spam/junk folder)")
    
except Exception as e:
    print(f"\n❌ FAILED! Error: {str(e)}")
    print(f"\n🔍 Possible issues:")
    print(f"   1. RESEND_API_KEY invalid or expired")
    print(f"   2. Domain '{sender_alias.split('@')[1] if '@' in sender_alias else 'unknown'}' not verified in Resend dashboard")
    print(f"   3. Network issue")
    print(f"\n💡 Fix: Go to https://resend.com/domains and verify your domain")
    import traceback
    traceback.print_exc()
