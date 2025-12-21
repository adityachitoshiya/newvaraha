
import requests
import json
import random
import time

BASE_URL = "http://127.0.0.1:8000"
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123" # Assuming default, or I need to login first

def get_admin_token():
    try:
        resp = requests.post(f"{BASE_URL}/api/login", data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
        if resp.status_code == 200:
            return resp.json()["access_token"]
    except Exception as e:
        print(f"Login Failed: {e}")
    return None

def test_serviceability():
    print("\n--- Testing Serviceability ---")
    payload = {
        "pickup_pincode": "201301", # Noida
        "delivery_pincode": "110001", # Delhi
        "weight": 0.5,
        "value": 1500,
        "mode": "COD"
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/serviceability", json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Serviceability Check Failed: {e}")

def create_dummy_order(token):

    # Disable RapidShyp for Testing
    print("\n--- Disabling RapidShyp for Testing ---")
    headers = {"Authorization": f"Bearer {token}"}
    requests.post(f"{BASE_URL}/api/admin/settings", headers=headers, json={"key": "rapidshyp_enabled", "value": "false"})
    print("RapidShyp Disabled.")

    print("\n--- Creating Dummy Order for Shipping ---")
    
    # 1. Create Order via API (Customer flow) or Admin? 
    # Use create-cod-order
    order_data = {
        "amount": 500.0,
        "name": "Integration Test User",
        "email": "test@varaha.com",
        "contact": "9876543210",
        "address": "123 Test Lane, Tech Park",
        "city": "Mumbai",
        "pincode": "400001",
        "paymentMethod": "COD", # Matches serviceability
        "isCartCheckout": True,
        "items": [
            {
                "productId": "PROD-001",
                "productName": "Gold Ring Test",
                "quantity": 1,
                "price": 500.0
            }
        ]
    }
    
    try:
        # Use guest checkout/customer endpoint
        resp = requests.post(f"{BASE_URL}/api/create-cod-order", json=order_data, headers=headers)
        if resp.status_code == 200:
            order = resp.json()
            print(f"DEBUG: Order Response: {order}")
            print(f"Order Created: {order.get('orderId')}")
            return order.get('orderId')
        else:
            print(f"Order Creation Failed: {resp.text}")
    except Exception as e:
        print(f"Order Creation Error: {e}")
    return None

def ship_order(token, order_id):
    print(f"\n--- Shipping Order {order_id} ---")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "pickup_location": "Jaipur", # Updated from screenshot
        "length": 10,
        "breadth": 10,
        "height": 5,
        "weight": 0.5
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/ship", json=payload, headers=headers)
        print(f"Status: {resp.status_code}")
        if resp.status_code == 200:
            print(f"Shipment Success: {resp.json()}")
        else:
            print(f"Shipment Failed: {resp.text}")
            try:
                print(resp.json())
            except:
                pass
    except Exception as e:
        print(f"Shipment Request Error: {e}")

def track_order(order_id):
    print(f"\n--- Tracking Order {order_id} ---")
    try:
        resp = requests.get(f"{BASE_URL}/api/orders/{order_id}/track")
        print(f"Status: {resp.status_code}")
        print(f"Tracking Info: {resp.json()}")
    except Exception as e:
        print(f"Tracking Error: {e}")

if __name__ == "__main__":
    token = get_admin_token()
    if not token:
        # Create default admin if not exists? Or assume it exists. 
        # Attempt to create first?
        pass # Assuming admin exists from previous steps

    if token:
        test_serviceability()
        order_id = create_dummy_order(token)
        if order_id:
            time.sleep(1)
            ship_order(token, order_id)
            time.sleep(1)
            track_order(order_id)
    else:
        print("Skipping admin tests (Login failed)")
