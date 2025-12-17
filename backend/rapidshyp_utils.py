import requests
import os
import json

RAPIDSHYP_BASE_URL = "https://api.rapidshyp.com/rapidshyp/apis/v1"

def get_headers():
    api_key = os.getenv("RAPIDSHYP_API_KEY")
    return {
        "rapidshyp-token": api_key,
        "Content-Type": "application/json"
    }

def create_rapidshyp_order(order_data):
    """
    Creates an order in RapidShyp.
    order_data: Dict containing mapped order details.
    """
    url = f"{RAPIDSHYP_BASE_URL}/create_order"
    
    # Calculate total weight (defaulting if not present)
    # Ensure date format if needed
    import datetime
    order_date = datetime.datetime.now().strftime("%d-%m-%Y")
    
    payload = {
        "orderId": str(order_data.get("order_id")),
        "orderDate": order_date,
        "paymentMethod": "COD" if order_data.get("payment_method") == "COD" else "Prepaid",
        "consigneeName": order_data.get("customer_name"),
        "consigneePhone": order_data.get("phone"),
        "consigneeEmail": order_data.get("email"),
        "consigneeAddress": order_data.get("address"),
        "consigneeCity": order_data.get("city"),
        "consigneePincode": str(order_data.get("pincode")),
        "consigneeState": order_data.get("state", "Maharashtra"), # Fallback or need to fetch
        "orderItems": [
            {
                "name": item.get("name"),
                "sku": item.get("id") or "SKU_DEFAULT",
                "quantity": str(item.get("quantity")),
                "unitPrice": str(item.get("price")),
                "taxRate": "0" 
            } for item in json.loads(order_data.get("items_json", "[]"))
        ],
        "weight": "0.5", 
        "length": "10",
        "breadth": "10",
        "height": "10",
        "subTotal": str(order_data.get("total_amount")),
        "pickupLocationId": "PRIMARY" # Prerequisite: User must create a pickup location with this ID or we need to ask user
    }
    
    try:
        print(f"Sending Order to RapidShyp: {url}")
        print(json.dumps(payload, indent=2))
        
        response = requests.post(url, json=payload, headers=get_headers())
        
        print(f"RapidShyp Response Status: {response.status_code}")
        print(f"RapidShyp Response Body: {response.text}")
        
        # If order exists, handle gracefully? 
        # For now, let it raise so we see the error
        response.raise_for_status()
        return response.json()
        
    except Exception as e:
        print(f"RapidShyp API Error: {e}")
        return {"status": "error", "error": str(e), "response": response.text if 'response' in locals() else ""}

def track_shipment(awb_number):
    # Tracking endpoint might also be different, but focusing on Create Order for now.
    # Base URL for other headers might be same
    url = f"{RAPIDSHYP_BASE_URL}/track/{awb_number}"
    try:
        # response = requests.get(url, headers=get_headers())
        # return response.json()
        return {"status": "In Transit", "location": "Mumbai Hub"}
    except:
        return None
