import os
import requests
from dotenv import load_dotenv

# Load Env
load_dotenv("/Users/adityachitoshiya/Desktop/New folder (2)/beckup/backend/.env")

auth_key = os.getenv("MSG91_AUTH_KEY")
phone = "917727088810" # User provided number
otp = "123456" # Test OTP

print(f"Testing OTP Send to {phone}...")
print(f"Auth Key Found: {bool(auth_key)}")

if not auth_key:
    print("Error: MSG91_AUTH_KEY not found in .env")
    exit(1)

url = "https://control.msg91.com/api/v5/otp"
params = {
    "mobile": phone,
    "authkey": auth_key,
    "otp": otp,
    # "template_id": "" # Add if strictly required by DLT
}

try:
    response = requests.post(url, params=params)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
