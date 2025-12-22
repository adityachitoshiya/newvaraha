import requests
import json
import time

API_URL = "http://localhost:8000/api/create-cod-order"

payload = {
    "productId": "prod-1",
    "productName": "Debug Test Product",
    "variantId": "var-1",
    "variantName": "Default",
    "quantity": 1,
    "amount": 100,
    "name": "Debug Tester",
    "email": "debug_tester@example.com",
    "contact": "9999999999",
    "address": "Debug Address",
    "city": "Debug City",
    "pincode": "123456",
    "paymentMethod": "cod",
    "items": [{
        "productId": "prod-1",
        "productName": "Debug Test Product",
        "variantId": "var-1",
        "variantName": "Default",
        "quantity": 1,
        "price": 100
    }],
    "isCartCheckout": True
}

try:
    print("Sending POST request to", API_URL)
    response = requests.post(API_URL, json=payload, timeout=10)
    print("Status:", response.status_code)
    print("Response:", response.text)
except Exception as e:
    print("Failed API Request:", e)
