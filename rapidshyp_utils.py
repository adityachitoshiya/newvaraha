import requests
import os
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RapidShypClient:
    BASE_URL = "https://api.rapidshyp.com/rapidshyp/apis/v1"

    def __init__(self):
        self.api_key = os.getenv("RAPIDSHYP_API_KEY")
        if not self.api_key:
            logger.warning("RAPIDSHYP_API_KEY is not set in environment variables.")

    def _get_headers(self):
        return {
            "rapidshyp-token": self.api_key,
            "Content-Type": "application/json"
        }

    def _make_request(self, method, endpoint, payload=None, params=None):
        url = f"{self.BASE_URL}/{endpoint}"
        try:
            if method == "POST":
                logger.info(f"Sending POST request to {url}")
                # logger.info(f"Payload: {json.dumps(payload, indent=2)}") # Debug only
                response = requests.post(url, json=payload, headers=self._get_headers(), timeout=15)
            else:
                logger.info(f"Sending GET request to {url}")
                response = requests.get(url, params=params, headers=self._get_headers(), timeout=15)
            
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            logger.error(f"RapidShyp API Timeout: Request to {url} exceeded 15 seconds")
            return {"status": "error", "error": "Request timeout - RapidShyp API is taking too long"}
        except requests.exceptions.RequestException as e:
            logger.error(f"RapidShyp API Request Error: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response Body: {e.response.text}")
                return {"status": "error", "error": str(e), "details": e.response.text}
            return {"status": "error", "error": str(e)}

    def check_serviceability(self, pickup_pincode, delivery_pincode, weight, value, mode="COD"):
        """
        Check serviceability between two pincodes.
        """
        payload = {
            "Pickup_pincode": str(pickup_pincode),
            "Delivery_pincode": str(delivery_pincode),
            "cod": True if mode == "COD" else False,
            "total_order_value": float(value),
            "weight": float(weight)
        }
        return self._make_request("POST", "serviceabilty_check", payload=payload)

    def create_forward_order_wrapper(self, order_data, pickup_location=None):
        """
        Creates a forward order using the Wrapper API (Order + Shipment + Label).
        
        Args:
            order_data: Dict containing:
                - orderId, orderDate (YYYY-MM-DD)
                - customer_name, email, phone, address, city, pincode, state
                - items: List of dicts (name, sku, units, price, etc.)
                - payment_method (COD/PREPAID)
                - total_amount
                - weight (kg), dimensions (L,B,H cm)
            pickup_location: Dict with pickup address details OR string pickupAddressName.
        """
        
        # Construct Shipping Address
        # Splitting address lines if too long or just using address1
        address = order_data.get("address", "")
        shipping_address = {
            "firstName": order_data.get("customer_name", "").split(" ")[0],
            "lastName": " ".join(order_data.get("customer_name", "").split(" ")[1:]) or ".",
            "addressLine1": address[:99] if address else "Address Not Provided",
            "addressLine2": address[99:199] if len(address) > 99 else "",
            "pinCode": str(order_data.get("pincode")),
            "email": order_data.get("email"),
            "phone": order_data.get("phone")
        }

        # Billing defaults to Shipping
        billing_address = shipping_address.copy()

        # Items
        order_items = []
        for item in order_data.get("items", []):
            sku = item.get("sku") or item.get("id") or "SKU_DEFAULT"
            name = item.get("name")
            if not name:
                name = f"Item - {sku}"
            
            order_items.append({
                "itemName": name[:199], # Limit length, ensure not empty
                "sku": sku,
                "units": int(item.get("quantity", 1)),
                "unitPrice": float(item.get("price", 0)),
                "tax": 0.0,
                "productWeight": 0.5 # Default weights if not tracked
            })

        payload = {
            "orderId": str(order_data.get("orderId")),
            "orderDate": order_data.get("orderDate"), # Must be YYYY-MM-DD
            "storeName": "DEFAULT",
            "billingIsShipping": True,
            "shippingAddress": shipping_address,
            "billingAddress": billing_address,
            "orderItems": order_items,
            "paymentMethod": "COD" if order_data.get("payment_method") == "COD" else "PREPAID",
            "packageDetails": {
                "packageLength": order_data.get("length", 10),
                "packageBreadth": order_data.get("breadth", 10),
                "packageHeight": order_data.get("height", 5),
                "packageWeight": float(order_data.get("weight", 0.5)) * 1000 # Convert kg to gm if needed? Wrapper says gm.
            }
        }

        # Handle Pickup Location
        # If pickup_location is a string, use 'pickupAddressName'
        # If dict, use 'pickupLocation' object
        if isinstance(pickup_location, str):
            payload["pickupAddressName"] = pickup_location
        elif isinstance(pickup_location, dict):
            payload["pickupLocation"] = pickup_location
        else:
            # Default fallback if no pickup details provided (User must configure this)
            payload["pickupAddressName"] = "Jaipur" 

        return self._make_request("POST", "wrapper", payload=payload)

    def create_return_order_wrapper(self, return_data, pickup_location, delivery_address_name):
        """
        Creates a return order using the Return Wrapper API.
        
        Args:
            return_data:
                - orderId, orderDate
                - items: List of items to return
                - dimensions/weight
            pickup_location: Dict for CUSTOMER pickup address (where courier picks up).
            delivery_address_name: String name of the WAREHOUSE to return to.
        """
        
        order_items = []
        for item in return_data.get("items", []):
             sku = item.get("sku") or "SKU_DEF"
             name = item.get("name")
             if not name:
                 name = f"Item - {sku}"

             order_items.append({
                "itemName": name[:199],
                "sku": sku,
                "units": int(item.get("quantity", 1)),
                "unitPrice": float(item.get("price", 0)),
                "tax": 0.0,
             })

        payload = {
            "orderId": str(return_data.get("orderId")),
            "orderDate": return_data.get("orderDate"),
            "storeName": "DEFAULT",
            "return_reason_code": return_data.get("reason_code", "OTHER"),
            "deliveryAddress_name": delivery_address_name, # Warehouse Name
            "pickupLocation": {
                "pickup_customer_name": pickup_location.get("name", "Customer"),
                "pickup_phone": pickup_location.get("phone"),
                "pickup_email": pickup_location.get("email"),
                "pickup_address": pickup_location.get("address", "")[:99],
                "pickup_address_2": "",
                "pickup_pincode": str(pickup_location.get("pincode"))
            },
            "orderItems": order_items,
            "packageDetails": {
                "packageLength": return_data.get("length", 10),
                "packageBreadth": return_data.get("breadth", 10),
                "packageHeight": return_data.get("height", 5),
                "packageWeight": float(return_data.get("weight", 0.5)) * 1000
            }
        }
        
        return self._make_request("POST", "return_wrapper", payload=payload)

    def track_order(self, awb=None, order_id=None):
        """
        Track an order by AWB or Order ID.
        """
        payload = {}
        if awb:
            payload["awb"] = awb
        if order_id:
            payload["seller_order_id"] = order_id
            
        return self._make_request("POST", "track_order", payload=payload)

    def create_pickup_location(self, location_data):
        """
        Create a new pickup location (Warehouse).
        """
        return self._make_request("POST", "create/pickup_location", payload=location_data)

    def get_pickup_locations(self):
        """
        Fetch all available pickup locations.
        """
        return self._make_request("GET", "pickup_locations")

# Singleton instance for easy import
rapidshyp_client = RapidShypClient()
