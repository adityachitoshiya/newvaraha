Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/serviceability_check
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Example cURL
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/serviceability_check' \
  --header 'rapidshyp-token: e779a4*************8b60ba5f09ecd579fa1f34b64805e' \
  --header 'Content-Type: application/json' \
  --data '{
    "Pickup_pincode": "110068",
    "Delivery_pincode": "110038",
    "cod": true,
    "total_order_value": 2000,
    "weight": 1
  }'

Request Parameters	Data Type	Remark	Validation
Pickup_pincode	Mandatory	Postcode from where the order will be picked.	6 digit pincode
Delivery_pincode	Mandatory	Postcode where the order will be delivered.	6 digit pincode
cod	Mandatory	True in case of COD order and false in case of prepaid order.	
total_order_value	Mandatory	The price of the order shipment in rupees.	
weight	Mandatory	The weight of shipment in kgs.	
Response:
JSON

{
  "status": true,
  "remark": "Success",
  "serviceable_courier_list": [
    {
      "courier_code": "6001",
      "courier_name": "BlueDart Express",
      "parent_courier_name": "BlueDart",
      "cutoff_time": "14:00",
      "freight_mode": "Surface",
      "max_weight": 5000.0,
       "min_weight": 1.0,
       "total_freight": 11.111
       "edd": "17-09-2025",
       "epd": null
    }
 {
            "courier_code": "7001",
            "courier_name": "Ekart Surface",
            "parent_courier_name": "Ekart",
            "cutoff_time": "14:00",
            "freight_mode": "Surface",
            "max_weight": 5000.0,
            "min_weight": 1.0,
            "total_freight": 91.8,
            "edd": "17-09-2025",
            "epd": null
        }

Return Pincode Serviceability API:
Use this API to get pincode serviceability on the RapidShyp platform.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/serviceabilty_check
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/serviceabilty_check' \
--header 'rapidshyp-token: e779a4*************8b60ba5f09ecd579fa1f34b64805e' \--header 'Content-Type: application/json' \
--data '{
"Pickup_pincode": "110068",
"Delivery_pincode": "110038", "cod": true, "total_order_value": 2000,
"weight": 1
"is_return": true
}'


Request Parameters	Data Type	Required	Remark	Validation
Pickup_pincode	String	Mandatory	Postcode from where the order will be picked	6-digit valid pincode
Delivery_pincode	String	Mandatory	Postcode where the order will be delivered	6-digit valid pincode
cod	Boolean	Mandatory	True in case of COD order and false in case of prepaid order	Non-mandatory for return
total_order_value	Float	Mandatory	The price of the order shipment in rupees	
weight	Float	Mandatory	The weight of shipment in kgs	
is_return	Boolean	Mandatory	For third party this field is mandatory	
Response:
JSON
{
"status": true, "remark": "Success",
"serviceable_courier_list": [
{
"courier_code": "2010", "courier_name": "Delhivery Reverse", "parent_courier_name": "Delhivery", "cutoff_time": "14:00", "freight_mode": "Surface", "max_weight": 5000.0,
"min_weight": 1.0,
"total_freight": 188.8, "edd": null,
"epd": "28-07-2025"
},
{
"courier_code": "2013",
"courier_name": "Delhivery Reverse 2 Kg", "parent_courier_name": "Delhivery", "cutoff_time": "14:00",
"freight_mode": "Surface", "max_weight": 9999.0,
"min_weight": 1.0,
"total_freight": 260.19, "edd": null,
"epd": "05-08-2025"
}
]
}

Forward Create Order API:
Description : Use this API to create an order on the RapidShyp platform.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/create_order
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Request CURL
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/create_order' \
--header 'rapidshyp-token: e779a465**********************1f34b64805e' \
--header 'Content-Type: application/json' \
--data-raw '{
"orderId": "EXTI_28",
"orderDate": "2024-08-08",
"pickupAddressName": "Seller 201301",
"pickupLocation": {
"contactName": "",
"pickupName": "",
"pickupEmail": "",
"pickupPhone": "",
"pickupAddress1": "",
"pickupAddress2": "",
"pinCode": ""
},
"rto_Location":
{
"rto_locationName":"RAPIDwsQAA",
"contactName": "RAPIDQasA",
"rtoEmail": "avdhesh.bhardwaj@omlogistics.co.in",
"rtoPhone": "9999999999",
"rtoAddress1": "aRAPIDQA",
"rtoAddress2": "",
"rtopinCode": "201301"
},
"storeName": "DEFAULT",
"billingIsShipping": true,
"shippingAddress": {
"firstName": "Mahesh Mehra",
"lastName": "EXT",
"addressLine1": "Delhi",
"addressLine2": "New Delhi",
"pinCode": "110002",
"email": "mahesh.mehra@rapidshyp.com",
"phone": "8094723198"
},
"billingAddress": {
"firstName": "Jane",
"lastName": "Doegghgh",
"addressLine1": "456 Elm St",
"addressLine2": "Apt 101",
"pinCode": "110002",
"email": "jane.doe@example.com",
"phone": "9876543211"
},
"orderItems": [
{
"itemName": "Product 2",
"sku": "TEST14",
"description": "Description of product 1",
"units": 1,
"unitPrice": 10.0,
"tax": 0.0,
"hsn": "HSN123",
"productLength": 10.0,
"productBreadth": 5.0,
"productHeight": 2.0,
"productWeight": 0.5,
"brand": "Brand A",
"imageURL": "https://file0%C3%97426.jpeg",
"isFragile": false,
"isPersonalisable": false,
"pickupAddressName" :""
},
{
"itemName": "Product 3",
"sku": "TEST18",
"description": "Description of product 2",
"units": 2,
"unitPrice": 20.0,
"tax": 0.0,
"hsn": "HSN456",
"productLength": 15.0,
"productBreadth": 7.0,
"productHeight": 3.0,
"productWeight": 0.8,
"brand": "Brand B",
"imageURL": "https://png.pngtdscape-jpg-wallpapers-free-download-image_2573540.jpg",
"isFragile": false,
"isPersonalisable": false,
"pickupAddressName" :""
}
],
"paymentMethod": "PREPAID",
"shippingCharges": 100.0,
"giftWrapCharges": 10.0,
"transactionCharges": 20.0,
"totalDiscount": 5.0,
"codCharges": 20.0,
"prepaidAmount": 50.0,
"packageDetails": {
"packageLength": 20.0,
"packageBreadth": 10.0,
"packageHeight": 5.0,
"packageWeight": 2000.0
}
}'


Request Parameters	Required	Remark	Validation
{			
orderId	Mandatory	Seller order ID on channel/store/website	Minimum 1 character
orderDate	Mandatory	Order created date on channel/store/website	Format: YYYY-MM-DD
pickupAddressName	Conditionally-Mandatory	Pickup name created on Rapidshyp platform	API user can either pass pickup name or create pickup. If both details are shared, system will create order on the pickup name provided and will not create a new pickup location.
pickupLocation	Conditionally-Mandatory	Create pickup location on order creation itself	
{			
contactName	Mandatory	Location contact POC name	Minimum 1 character
pickupName	Mandatory	Name of the warehouse/store	Pickup address name must be between 3 and 75 characters long
pickupEmail	Mandatory	Location contact POC email	
pickupPhone	Mandatory	Location contact POC phone number	Phone number must start from 6,7,8,9
pickupAddress1	Mandatory	Warehouse/store address line 1	Pickup address line 1 must be between 3 and 100 characters long
pickupAddress2	Non-Mandatory	Warehouse/store address line 2	If entered, Pickup address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Location Pincode	Must be 6 digit valid pincode
},			
rto_Location	Non-Mandatory	Details of RTO location if different than pickup location	If user is adding RTO location then all the fields are mandatory to fill otherwise the RTO location would be considered as the pickup location
{			
rto_locationName	Non-Mandatory		
contactName	Mandatory	Location contact POC name	
pickupEmail	Non-Mandatory	Location contact POC email	
rtoPhone	Non-Mandatory	Location contact POC phone number	Phone number must start from 6,7,8,9
rtoAddress1	Non-Mandatory	Warehouse/store address line 1	Pickup address line 1 must be between 3 and 100 characters long
rtoAddress2	Non-Mandatory	Warehouse/store address line 2	If entered, Pickup address line 2 must be between 3 and 100 characters long
rtoPinCode	Non-Mandatory	Location Pincode	Must be 6 digit valid pincode
},			
storeName	Mandatory	Store name created on Rapidshyp	If you have one custom channel, pass "DEFAULT"
billingIsShipping	Mandatory	Pass true if both shipping and billing is same. In case false, Billing address can’t be empty	
shippingAddress	Mandatory		
{			
firstName	Mandatory	Customer first name	The combined length of the first and last name in the shipping address must be between 3 and 75 characters.
lastName	Non-Mandatory	Customer last name	
addressLine1	Mandatory	Customer address line 1	Shipping address line 1 must be between 3 and 100 characters long
addressLine2	Non-Mandatory	Customer address line 2	If entered, Shipping address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Customer address pincode	Must be 6 digit valid pincode
email	Non-Mandatory	Customer email	
phone	Mandatory	Customer phone number	Phone number must start from 6,7,8,9
},			
billingAddress	Conditionally-Mandatory	Only pass incase billingIsShipping: false	
{			
firstName	Mandatory	Billing customer first name	The combined length of the first and last name in the shipping address must be between 3 and 75 characters.
lastName	Non-Mandatory	Billing customer last name	
addressLine1	Mandatory	Billing customer address line 1	Billing address line 1 must be between 3 and 100 characters long
addressLine2	Non-Mandatory	Billing customer address line 2	If entered, Billing address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Billing customer address pincode	Must be 6 digit valid pincode
email	Mandatory	Billing customer email	
phone	Mandatory	Billing customer phone number	Phone number must start from 6,7,8,9
},			
orderItems	Mandatory	Item level details	
{			
itemName	Mandatory	Item name	Order line item name must be between 3 and 200 characters long
sku	Non-Mandatory	Item SKU Id	Order line item sku must be between 3 and 200 characters long
description	Non-Mandatory	Description of product	Minimum 1 character
units	Mandatory	Quantity of items	Item quantity must be greater than 0 in items.
unitPrice	Mandatory	Unit price of SKU	Item unit price must be greater than 0 in items.
tax	Mandatory	Tax	Pass 0 in case of zero tax item
hsn	Non-Mandatory	HSN code	
productLength	Non-Mandatory	Product dimension length	In cm
productBreadth	Non-Mandatory	Product dimension breadth	In cm
productHeight	Non-Mandatory	Product dimension height	In cm
productWeight	Non-Mandatory	Product dimension weight	In gm
brand	Non-Mandatory	Brand of product	
imageURL	Non-Mandatory	Image URL	
isFragile	Non-Mandatory		If fragile item, pass true
isPersonalisable	Non-Mandatory		If personalisable, pass true
pickupAddressName	Non-Mandatory	Define pickup location at item level to create multi-shipment for an order	
},			
],			
paymentMethod	Mandatory	Payment mode of order	Payment mode — please choose from [COD, PREPAID]
shippingCharges	Non-Mandatory	Shipping charges	
giftWrapCharges	Non-Mandatory	Gift wrap charges	
transactionCharges	Non-Mandatory	Transaction charges	
totalDiscount	Non-Mandatory	Total discount	
totalOrderValue	Mandatory	Total order value	
codCharges	Non-Mandatory	codCharges	
prepaidAmount	Non-Mandatory	prepaidAmount	Pass partially paid amount in case of partial paid order. System then calculates collectable amount. Prepaid amount is only applicable on COD payment mode.
packageDetails	Mandatory		
{			
packageLength	Mandatory	packageLength	In cm
packageBreadth	Mandatory	packageBreadth	In cm
packageHeight	Mandatory	packageHeight	In cm
packageWeight	Mandatory	packageWeight	In gm
}			
}			
In the create order API you can use existing pickup location/create a pickup location/define pickup location on items.

Pickup location logic in request payload:

Users can either enter pickup location on an order or on item level.
If a user enters a pickup location on an order level,he can either use the existing pickup location or create a pickup location on order level.
Incase he creates pickup on order level, new pickup location will be created in system and the rto address will be same as the pickup location created
Users can only enter the pickup location name on item level. System won't provide pickup location creation on item level.
If Users define pickup location on item level, the system will create orders with multiple shipment assigned to location provided in item line.

Approve Order API:
Usage: Use this API to Approve an order.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/approve_orders
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/approve_orders' \
--header 'rapidshyp-token:HQ$f**********oZ \
--header 'Content-Type: application/json' \
--data '{
    "order_id": [
        "EXT_19181514"
    ],
    "store_name": "DEFAULT"
}'

Request Parameters	Required	Remark	Validation
{			
orderId	Mandatory	Order ID created on Rapid Shyp	Should be a valid order ID
storeName	Mandatory	Store name of order on Rapidshyp	Should be a valid store name ID
}			
Response:
JSON
{
 "status": "success",
  "remark": "Approved orders successfully"
}

Forward Update Order API:
DESCRIPTION :Use this API to update an order on the RapidShyp platform.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/create_order
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Request Curl:
curl --location 'https://apI.rapidshyp.com/rapidshyp/apis/v1/order_update' \
--header 'rapidshyp-token: 9' \
--header 'Content-Type: application/json' \
--data-raw '{
    "orderId": "EXT_0066",
    "pickupAddressName": "AbhinavvvvvVVVVVvvvV",
    "store_name": "DEFAULT",
    "shippingAddress": {
        "firstName": "ABGH",
        "lastName": "",
        "addressLine1": "WEww",
        "addressLine2": "DDDDDD",
        "pinCode": "250221",
        "email": "avdhesh.bharwaj@rapidshyp.com",
        "phone": "8094723433"
    },
    "billingAddress": {
        "firstName": "aDFGG",
        "lastName": "",
        "addressLine1": "sfdD",
        "addressLine2": "Apt 10",
        "pinCode": "110001",
        "email": "jane.doee@xample.com",
        "phone": "9876543212"
    },
    "paymentMethod": "PREPAID",
    "packageDetails": {
        "packageLength": 0.0,
        "packageBreadth": 0.0,
        "packageHeight": 0.0,
        "packageWeight": 0.0
    }
}'


Request Parameters	Required	Remark	Validation
orderId	Mandatory	Seller order ID for which you want to make the updates	Valid order created on Rapidshyp
store_name	Mandatory	Store name of the order	Format: YYYY-MM-DD
pickupAddressName	Conditionally-Mandatory	Use the updated pickup location name to update the location if required	Enter a valid location name for Rapidshyp created pickup locations
shippingAddress: {	Conditionally-Mandatory		
firstName	Mandatory	Customer First name	Minimum 3 characters
lastName	Mandatory	Customer Last name	Minimum 3 characters
addressLine1	Mandatory	Customer address line 1	Pickup address line 1 must be between 3 and 100 characters long
addressLine2	Mandatory	Customer address line 2	If entered, Pickup address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Location Pincode	Must be 6-digit valid pincode
email	Non-Mandatory	Customer Email	Valid email id
phone	Mandatory	Customer Phone number	Must be 10-digit valid phone number
},			
billingAddress: {	Conditionally-Mandatory		
firstName	Mandatory	Customer Billing First name	Minimum 3 characters
lastName	Mandatory	Customer Billing Last name	Minimum 3 characters
addressLine1	Mandatory	Billing customer address line 1	Pickup address line 1 must be between 3 and 100 characters long
addressLine2	Mandatory	Customer Billing address line 2	If entered, Pickup address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Billing Location Pincode	Must be 6-digit valid pincode
email	Non-Mandatory	Billing Customer Email	Valid email id
phone	Mandatory	Billing Customer Phone number	Must be 10-digit valid phone number
},			
paymentMethod	Conditionally-Mandatory	Use this to change COD order to Prepaid orders	COD/PREPAID allowed
packageDetails: {	Conditionally-Mandatory		
packageLength	Mandatory	packageLength	In cm
packageBreadth	Mandatory	packageBreadth	In cm
packageHeight	Mandatory	packageHeight	In cm
packageWeight	Mandatory	packageWeight	In gm
}			
}			
Response:
JSON
{
  "status": "success",
  "partial_update": true,
  "not_updated_fields": "",
  "remarks": "success",
  "order_id": "EXT_0066",
  "updated_shipment_details": [
    {
      "shipment_id": "S25016974",
      "pickup_name": "third",
      "payment_method": "PREPAID",
      "shipping_charges": 10,
      "giftwrap_charges": 11,
      "transaction_charges": 12,
      "total_discount": 70,
      "total_value": 5473,
      "collectable_amount": 0,
      "prepaid_amount": 5473
    }
  
  ]
}

Cancel Order API:
Usage: Use this API to cancel a created order.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/cancel_order
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/api/rapidshyp/apis/v1/cancel_order' \
--header 'rapidshyp-token: HQ$f**********oZ' \
--header 'Content-Type: application/json' \
--data '{
    "orderId": "Tango2",
    "storeName": "DEFAULT"EXTIIIN23_28
}'

Request Parameters	Requirement	Remark	Validation
{			
orderId	Mandatory	Order ID created on Rapid Shyp	Should be a valid order ID
storeName	Mandatory	Store name of order on Rapidshyp	Should be a valid store name ID
}			
Response:
JSON
{
    "status": true,
    "remarks": "Order canceled successfully."
}

Get Order Info API:
Usage: Use this API to Approve an order.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/get_orders_info?order_id=%&channel_order_id=%
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:

curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/approve_orders' \
--header 'rapidshyp-token:HQ$f**********oZ \
--header 'Content-Type: application/json' \
--data '{
    "order_id": [
        " "
    ],
    "store_name": "DEFAULT"
}'

Request Parameters	Required	Remark	Validation
{			
orderId	Mandatory	Order ID created on Rapid Shyp	Should be a valid order ID
Channel_order_id	Mandatory	Order ID from the channel; if it is default, then same as the orderId	Should be a valid order ID
}			
Response:
JSON
{
    "status": "SUCCESS",
    "remark": "SUCCESS",
    "seller_order_id": "#EXT_1236774",
    "channel_order_id": "#EXT_1236774",
    "order_status": "PROCESSING",
    "store_name": "DEFAULT",
    "order_created_date": "2025-09-10 ",
    "order_fetched_date": "2025-09-16 ",
    "payment_method": "COD",
    "shipping_is_billing": true,
    "shipping_address": {
        "shipping_name": "aabcs",
        "shipping_email": "avdhesh.bhardwaj@omlogistics.co.in",
        "shipping_contact": "919999999999",
        "shipping_address": "Delhi New Delhi",
        "shipping_address_2": "",
        "shipping_city": "NEW DELHI",
        "shipping_pin_code": "110001",
        "shipping_state": "DELHI",
        "shipping_country": "INDIA"
    },
    "billing_address": {
        "shipping_name": "aabcs",
        "shipping_email": "avdhesh.bhardwaj@omlogistics.co.in",
        "shipping_contact": "919999999999",
        "shipping_address": "Delhi New Delhi",
        "shipping_address_2": "",
        "shipping_city": "NEW DELHI",
        "shipping_pin_code": "110001",
        "shipping_state": "DELHI",
        "shipping_country": "INDIA"
    },
    "shipment_lines": [
        {
            "shipment_id": "S2509401538",
            "pickup_address_name": "Dumbell",
            "item_lines": [
                {
                    "item_name": "Mobile",
                    "sku": "S_S_S_S_S_S_S_S_S_S_S_S-S_S_S_S_S_S_S_S_S_S_S_S_SS_",
                    "units": 3,
                    "unit_price": 88.0,
                    "discount": 6.0,
                    "hsn": "HSN123",
                    "tax": 0.0,
                    "shipping_charges": 12.0,
                    "selling_price": 264.0
                }
            ],
            "shipping_charges": 20.0,
            "gift_wrap_charges": 30.0,
            "transaction_fee": 20.0,
            "discount": 10.0,
            "total_prepaid_amount": 0.0,
            "sub_total": 440.0,
            "cod_charges": 33.92,
            "total_shipment_value": 500.0,
            "awb": "RPSC0000015595",
            "courier_code": "7002",
            "courier_name": "EKart Surface 2 Kg",
            "parent_courier_name": "Ekart",
            "applied_weight": 1600.0,
            "routing_code": "PaharganjHub_DEL",
            "rto_routing_code": "PaharganjHub_DEL",
            "tracking_link": "https://app.rapidshyp.com/t/RPSC0000015595"
        },
        {
            "shipment_id": "S2509401538",
            "pickup_address_name": "Dumbell",
            "item_lines": [
                {
                    "item_name": "Product_2",
                    "sku": "SKU777",
                    "units": 2,
                    "unit_price": 88.0,
                    "discount": 4.0,
                    "hsn": "HSN456",
                    "tax": 0.0,
                    "shipping_charges": 8.0,
                    "selling_price": 176.0
                }
            ],
            "shipping_charges": 20.0,
            "gift_wrap_charges": 30.0,
            "transaction_fee": 20.0,
            "discount": 10.0,
            "total_prepaid_amount": 0.0,
            "sub_total": 440.0,
            "cod_charges": 33.92,
            "total_shipment_value": 500.0,
            "awb": "RPSC0000015595",
            "courier_code": "7002",
            "courier_name": "EKart Surface 2 Kg",
            "parent_courier_name": "Ekart",
            "applied_weight": 1600.0,
            "routing_code": "PaharganjHub_DEL",
            "rto_routing_code": "PaharganjHub_DEL",
            "tracking_link": "https://app.rapidshyp.com/t/RPSC0000015595"
        }
    ],
    "order_shipping_charges": 20.0,
    "order_gift_wrap_charges": 30.0,
    "order_transaction_fee": 20.0,
    "order_discount": 10.0,
    "order_total_prepaid_amount": 0.0,
    "cod_charges": 0.0,
    "order_total_value": 500.0,
    "customer_gstin": ""
}AWB Assignment API:
Description :Use this API to assign awb to order-shipment on the RapidShyp platform.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	hhttps://apI.rapidshyp.com/rapidshyp/apis/v1/assign_awb
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:

curl --location 'https://apI.rapidshyp.com/rapidshyp/apis/v1/assign_awb' \
--header 'rapidshyp-token: e779a4656395810c1f***************79fa1f34b64805e' \
--header 'Content-Type: application/json' \
--data '{
"shipment_id":"S240927365",
"courier_code":""
}'


Request Parameters	Requirement	Remark	Validation
shipment_id	Mandatory	Order shipmentID on channel/store/website	Should belong to a valid order
courier_code	Non-Mandatory	Order created date on channel/store/website	The courier id of the courier service you want to select. The default courier (based on courier rule/priority) is selected in case no ID is specified. You can get courier code by calling the serviceability API.
Response:
JSON
{
    "status": "SUCCESS",
    "remarks": "SUCCESS",
    "shipment_id": "S240927365",
    "order_id": "6203483586732",
    "awb": "11111111111",
    "courier_code": "6001",
    "courier_name": "BlueDart Express",
    "parent_courier_name": "BlueDart",
    "applied_weight": 2433.399,
    "rto_routing_code": "DEL/ANT/ANT",
    "pickup_name": "meerut",
    "payment_method": "PREPAID",
    "total_order_value": 2357.64,
    "collectable_amount": 0.0
}

Schedule Pickup API:
Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://apI.rapidshyp.com/rapidshyp/apis/v1/schedule_pickup
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://apI.rapidshyp.com/rapidshyp/apis/v1/schedule_pickup' \
--header 'rapidshyp-token: e779a4656*************1***************5f09ecd579fa1f34b64805e' \
--header 'Content-Type: application/json' \
--data '{
"shipment_id":"S240927365",
"awb":""
}'

Request Parameters	Requirement	Remark	Validation
shipment_id	Mandatory	Order shipmentID on channel/store/website	Should belong to a valid order.
awb	Non-Mandatory	AWB assigned to shipmentID	AWB should belong to the shipment ID shared.
Response:
JSON
{
    "status": "SUCCESS",
    "remarks": "SUCCESS",
    "shipmentId": "S240927365",
    "orderId": "6203483586732",
    "awb": "11111111111",
    "courierCode": "6001",
    "courierName": "BlueDart Express",
    "parentCourierName": "BlueDart",
    "routingCode": "DEL/ANT/ANT",
    "rtoRoutingCode": "DEL/ANT/ANT"
}


De-allocate Shipment API:
Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/de_allocate_shipment
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/de_allocate_shipment' \
--header 'rapidshyp-token: HQ$f**********oZ \
--header 'Content-Type: application/json' \
--data '{
    "orderId": "Tango2",
    "shipmentId": "S2407199"
}'

Request Parameters	Requirement	Remark	Validation
{			
orderId	Mandatory	Order ID created on Rapidshyp	Should be a valid order ID
shipmentId	Mandatory	Shipment ID created on Rapidshyp	Should be a valid shipment ID
}			
Response:
JSON
{
    "status": true,
    "remarks": "Shipment successfully de-allocated."
}

Action NDR API:
Use this API to take action on your pending NDR.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/ndr/action
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/ndr/action' \
--header 'rapidshyp-token: eadb9ad30bb30393ca33e33cead7bf1ba6caef6e3bde19cc0855dcaa908e360e' \
--header 'Content-Type: application/json' \
--data '
{
"awb": "9002898078004",
"action": "REATTEMPT",
"phone": "7302870884",
"address1": "AJJ",
"address2": ""
}'

Request Parameters	Required	Remark	Validation
awb	Mandatory	AWB for which NDR has been raised by courier	
action	Mandatory	RE_ATTEMPT - pass to reattempt the NDR RETURN - pass to return the shipment	
phone	Conditional-Mandatory	Updated phone number	Use this field in case of action "Re-attempt"
address1	Conditional-Mandatory	Updated address details	Use this field in case of action "Re-attempt"
address2	Conditional-Mandatory	Updated address details	Use this field in case of action "Re-attempt"
Response:
JSON

{
"status": "SUCCESS",
"remarks": "We have successfully process your NDR request"
}
Get Shipment Details API:
Usage: Use this API to Approve an order.

Basic Information
NAME	DETAILS
Usage:	Non - Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/shipment_details?shipment_id=S2508628795
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:

curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/shipment_details?shipment_id=S2508628795' \
--header 'Content-Type: application/json' \
--header 'rapidshyp-token: *************7'



Request Parameters	Required	Remark	Validation
{			
orderId	Mandatory	Order ID created on Rapid Shyp	Should be a valid order ID
Channel_order_id	Mandatory	Order ID from the channel; if it is default, then same as the orderId	Should be a valid order ID
}			
Response:
JSON
{
    "success": true,
    "msg": "Fetched successfully.",
    "shipment_details": {
        "shipment_id": "S2509135953",
        "shipment_creation_date": "12-08-2025 16:01:42",
        "total_shipment_value": 500.0,
        "collectable_amount": 500.0,
        "warehouse_contact_name": "ABHJIBA",
        "warehouse_email": "avdhesh.bhardwaj@omlogistics.co.in",
        "warehouse_contact": "7302807884",
        "warehouse_address": "ABXVSJDHDHDHJSD",
        "warehouse_address_2": "HSHDHDHD",
        "warehouse_pin_code": "201301",
        "warehouse_city": "NOIDA",
        "warehouse_state": "UTTAR PRADESH",
        "warehouse_country": "INDIA",
        "rto_warehouse_contact_name": "ABHJIBA",
        "rto_warehouse_email": "avdhesh.bhardwaj@omlogistics.co.in",
        "rto_warehouse_contact": "7302807884",
        "rto_warehouse_address": "ABXVSJDHDHDHJSD",
        "rto_warehouse_address_2": "HSHDHDHD",
        "rto_warehouse_pin_code": "201301",
        "rto_warehouse_city": "NOIDA",
        "rto_warehouse_state": "UTTAR PRADESH",
        "rto_warehouse_country": "INDIA",
        "length": 20.0,
        "breadth": 10.0,
        "height": 5.0,
        "dead_weight": 1600.0,
        "applied_weight": 1600.0,
        "invoice_number": "",
        "shipment_status": "ASSIGNED",
        "assignment_priority_applied": null,
        "assignment_rule_applied": null,
        "awb": "I45158968",
        "courier_name": "DTDC",
        "child_courier_name": "DTDC Surface 2 Kg",
        "awb_assigned_date": "17-09-2025 10:57:30",
        "final_freights": {
            "total_freight_forward": 88.78,
            "total_cod_charges": 23.36,
            "total_rto_freight": 0.0,
            "total_extra_fwd_freights": 0.0,
            "total_extra_rto_freights": 0.0,
            "total_insurance_charge": 0.0,
            "total_freight": 112.14
        },
        "current_courier_edd": null,
        "current_tracking_status_code": null,
        "current_tracking_status_desc": null,
        "current_status_date": "17-09-2025 10:57:30",
        "latest_ndr_reason_code": null,
        "latest_ndr_reason_desc": null,
        "latest_ndr_date": null
    }
}

Label PDF Generation API:
Use this API to generate Label PDF.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/generate_label
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/generate_label' \
--header 'rapidshyp-token: HQ$fS*******KHoZ' \
--header 'Content-Type: application/json' \
--data '{
    "shipmentId": ["S2407199"]
}'


Parameters	Requirement	Remark	Validation
{			
shipmentId	Mandatory	Order ID created on Rapid Shyp	Should be a valid order ID
}			
Response:
JSON
{
    "status": true,
    "remarks": "Label(s) generated successfully.",
    "labelData": [
        {
            "shipmentId": "S2407199",
            "labelURL": "https://rapidshyp-public.s3.ap-south-1.amazona****************2:46PM.pdf",
            "labelRemarks": "Label generated successfully."
        }
    ]
}






Return Order Wrapper
Use this API to do multiple tasks in one go, namely creating a quick order, creating shipment, and finally assigning courier to the shipment.

This API integrates several other APIs to perform all these tasks together.

Task:
Create Return order
Create Return shipment
Run Internal serviceability check
Check Internal courier rule/priority
Assign awb
Schedule pickup
Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/retur n_wrapper
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/return_wrapper' \
--header 'rapidshyp-token: *************517' \
--header 'Content-Type: application/json' \
--data-raw '{
"orderId": "ABC_03",
"orderDate": "2025-08-25",
"is_qc_enabled":true,
"pickupLocation": {
"pickup_customer_name": "DO EPIC SHISP",
"pickup_customer_last_name": "DO EPIC SHSIPP",
"pickup_email": "avdhesh@omlogistics.com",
"pickup_phone": "7302807887",
"pickup_address": "abGGG",
"pickup_address_2": "GG",
"pickup_pincode": "110001"
},
"storeName": "",
"return_reason_code": "",
"deliveryAddress_name": "",
"deliveryAddress": {
"deliverylocation_name": "Abhinavqaqa",
"contact_name": "Abhinavqaqa",
"delivery_address1": "abxhA hhhhhhhhhhhhhd gggggggggg",
"delivery_address2": "abxAhd hhhhhhhhhhhhhh gggggb hhh h",
"pincode": "110001",
"delivery_email": "avdhesh.bhardwaj@omlogistics.co.in",
"delivery_phone": "7302807884"
},
"orderItems": [
{
"itemName": "ARPTEST0023",
"sku": "ARPTEST0023",
"units": 2,
"unitPrice": 50.0,
"tax": 0.0,
"hsn": "HSN456",
"productLength": 11.0,
"productBreadth": 12.0,
"productHeight": 12.0,
"productWeight": 3.0,
"brand": "",
"serial_no":"",
"imei_no":"",

"images_name":["https://i.pinimg.com/736x/14/ec/3f/14ec3ff15e3335264723fe39fb9da735.jpg"],
"color":"red",
"size":"L"

}

],
"packageDetails": {
"packageLength": 11.0,
"packageBreadth": 11.0,
"packageHeight": 11.0,
"packageWeight": 1000.0
},
"comment":"this is return api"
}'

Request Parameters	Required	Remark	Validation
orderId	Mandatory	Seller order ID on channel/store/website	Minimum 1 character
orderDate	Mandatory	Order created date on channel/store/website	Format: YYYY-MM-DD
pickupLocation			
pickup_customer_name	Mandatory	Customer first name	The combined length of the first and last name in the pickup address must be between 3 and 75 characters.
pickup_customer_last_name	Non-Mandatory	Customer last name	
pickup_email	Non-Mandatory	Customer email	
pickup_phone	Mandatory	Customer phone number	Phone number must start from 6,7,8,9
pickup_address	Mandatory	Customer address line 1	Pickup address line 1 must be between 3 and 100 characters long
pickup_address_2	Non-Mandatory	Customer address line 2	If entered, Pickup address line 2 must be between 3 and 100 characters long
pickup_pincode	Mandatory	Customer address pincode	Must be 6-digit valid pincode
},			
storeName	Mandatory	Store name created on Rapidshyp	By default, pass "DEFAULT"
return_reason_code	Non-Mandatory	If left blank, “others” is passed as return reason	Return reason code sheet attached below
deliveryAddress_name	Mandatory	Mapped delivery location (warehouse name)	
{			
deliveryAddress			Not required if a third party Warehouse location of Rapidshyp at their end.
deliverylocation_name			Not required if a third party Warehouse location of Rapidshyp at their end.
contact_name			Not required if a third party Warehouse location of Rapidshyp at their end.
delivery_address1			Not required if a third party Warehouse location of Rapidshyp at their end.
delivery_address2			Not required if a third party Warehouse location of Rapidshyp at their end.
pincode			Not required if a third party Warehouse location of Rapidshyp at their end.
delivery_email			Not required if a third party Warehouse location of Rapidshyp at their end.
delivery_phone			
},			
orderItems			
[			
{			
itemName	Mandatory	Item Name	Order line item name must be between 3 and 200 characters long.
sku	Non-Mandatory	Item SKU Id	Order line item SKU must be between 3 and 200 characters long.
units	Mandatory	Quantity of items	Item quantity must be greater than 0 in items.
unitPrice	Mandatory	Unit price of SKU	
tax	Non-Mandatory	Tax	Pass 0 in case of zero tax item
hsn	Non-Mandatory	HSN code	
productLength	Non-Mandatory	Product dimension length	In cm
productBreadth	Non-Mandatory	Product dimension breadth	In cm
productHeight	Non-Mandatory	Product dimension height	In cm
productWeight	Non-Mandatory	Product dimension weight	In gm
brand	Non-Mandatory	Brand name	
},			
{			
itemName			
sku			
units			
unitPrice			
tax			
hsn			
productLength			
productBreadth			
productHeight			
productWeight			
brand			
}			
]			
],			
packageDetails			
packageLength	Mandatory	packageLength	In cm
packageBreadth	Mandatory	packageBreadth	In cm
packageHeight	Mandatory	packageHeight	In cm
packageWeight	Mandatory	packageWeight	In gm
},			
comment	Non-Mandatory	Any custom comment	
}			
Note: Incase third party wants to send the exact reason for return,you need to create mapping between Rapidshyp status code and their own status code.

return_reason_code	return_reason_name
ITEM_DAMAGED	Item is damaged
WRONG_ITEM	Received wrong item
PARCEL_DAMAGED_ON_ARRIVAL	Parcel damaged on arrival
QUALITY_NOT_AS_EXPECTED	Quality not as expected
MISSING_ITEM	Missing item or accessories
PERFORMANCE_NOT_ADEQUATE	Performance not adequate
SIZE_NOT_AS_EXPECTED	Size not as expected
DOES_NOT_FIT	Does not fit
NOT_AS_DESCRIBED	Not as described
ARRIVED_TOO_LATE	Arrived too late
CHANGED_MY_MIND	Changed my mind
OTHER	Other
Response:
JSON
{
    "status": "SUCCESS",
    "remark": "Courier are not serviceable on pin codes.",
    "order_id": "ABCdddd_03",
    "order_created": true,
    "shipment": [
        {
            "awb_generated": false,
            "pickup_generated": true,
            "shipment_id": "RS250949623",
            "awb_code": "",
            "courier_company_id": "",
            "parent_courier_name": "",
            "courier_name": "",
            "applied_weight": 0.0,
            "routing_code": "",
            "rto_routing_code": "",
            "pickup_token_number": "",
            "pickup_scheduled_date": "",
            "total_value": 100.0,
            "shipment_items": [
                {
                    "name": "ARPTEST0023",
                    "sku": "ARPTEST0023",
                    "units": 2,
                    "selling_price": 100.0
                }
            ]
        }
    ]
}






Return Schedule Pickup API:
Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/return_schedule_pickup
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/return_schedule_pickup' \
--header 'rapidshyp-token: ************7' \
--header 'Content-Type: application/json' \
--data '{
"shipment_id":"RS25098357",
"courier_code":""
}'

Request Parameters	Required	Remark	Validation
shipment_id	Mandatory	Order shipmentID on channel/store/website	Should belong to a valid order.
Response:
JSON

{
    "status": "SUCCESS",
    "remarks": "SUCCESS",
    "shipmentId": "S240927365",
    "orderId": "6203483586732",
    "awb": "11111111111",
    "courierCode": "2001",
    "courierName": "BlueDart Express Reverse",
    "parentCourierName": "BlueDart",
    "routingCode": "DEL/ANT/ANT",
    "rtoRoutingCode": "DEL/ANT/ANT"
}

Forward Wrapper API:
Description: Use this API to do multiple tasks in one go, namely creating a quick order, requesting its shipment, and finally generating the label and the manifest for the same order.

This API integrates several other APIs to perform all these tasks together.

Tasks:

Create order
Create shipment
Run serviceability
Check courier rule / priority
Assign AWB
Generate pickup manifest
Generate label PDF
Generate invoice PDF
Generate manifest PDF
Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	`
https://api.rapidshyp.com/rapidshyp/apis/v1/wrapper	
| | **Request Type:** | POST | | **Scheme:** | HTTPS | | **Header (content-type):** |application/json` | | Header (rapidshyp-token): | API-Key |

EXAMPLE CURL

curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/wrapper' \
--header 'rapidshyp-token: \
--header 'Content-Type: application/json' \
--data-raw '{
    "orderId": "Tango34",
    "orderDate": "2023-06-30",
    "pickupAddressName": "Home",
    "pickupLocation": {
        "contactName": "Mahesh Mehra",
        "pickupName": "New Seller 1100ordrr01",
        "pickupEmail": "mahesh.mehra@rapidshyp.com",
        "pickupPhone": "8094723198",
        "pickupAddress1": "New Delhi Seller",
        "pickupAddress2": "New Delhi 2 Seller",
        "pinCode": "110001"
    },
    "storeName": "DEFAULT",
    "billingIsShipping": true,
    "shippingAddress": {
        "firstName": "Mahesh Mehra",
        "lastName": "EXT",
        "addressLine1": "Delhi",
        "addressLine2": "New Delhi",
        "pinCode": "110001",
        "email": "mahesh.mehra@rapidshyp.com",
        "phone": "8094723198"
    },
    "billingAddress": {
        "firstName": "Jane",
        "lastName": "Doe",
        "addressLine1": "456 Elm St",
        "addressLine2": "Apt 101",
        "pinCode": "110001",
        "email": "jane.doe@example.com",
        "phone": "9876543211"
    },
    "orderItems": [
        {
            "itemName": "Product 1",
            "sku": "SKU123",
            "description": "Description of product 1",
            "units": 5,
            "unitPrice": 10.0,
            "tax": 0.0,
            "hsn": "HSN123",
            "productLength": 10.0,
            "productBreadth": 5.0,
            "productHeight": 2.0,
            "productWeight": 0.5,
            "brand": "Brand A",
            "imageURL": "http://example.com/product1.jpg",
            "isFragile": false,
            "isPersonalisable": false
        },
        {
            "itemName": "Product 2",
            "sku": "SKU456",
            "description": "Description of product 2",
            "units": 2,
            "unitPrice": 20.0,
            "tax": 0.0,
            "hsn": "HSN456",
            "productLength": 15.0,
            "productBreadth": 7.0,
            "productHeight": 3.0,
            "productWeight": 0.8,
            "brand": "Brand B",
            "imageURL": "http://example.com/product2.jpg",
            "isFragile": true,
            "isPersonalisable": true
        }
    ],
    "paymentMethod": "COD",
    "shippingCharges": 100.0,
    "giftWrapCharges": 0.0,
    "transactionCharges": 0.0,
    "totalDiscount": 0.0,
    "totalOrderValue": 500.0,  
    "codCharges": 0.0,
    "prepaidAmount": 0.0,
    "packageDetails": {
        "packageLength": 20.0,
        "packageBreadth": 10.0,
        "packageHeight": 5.0,
        "packageWeight": 2000.0
    }
}'


Note: Either pass unit price or total order value field both cannot be passed in the request body
Request Parameters	Requirement	Remark	Validation
{			
orderId	Mandatory	Seller order ID on channel/store/website	Minimum 1 character
orderDate	Mandatory	Order created date on channel/store/website	Format: YYYY-MM-DD
pickupAddressName	Conditionally-Mandatory	Pickup name created on Rapidshyp platform	API user can either pass pickup name or create pickup. If both details are shared, system will create order on the provided pickup name and will not create a new pickup location.
pickupLocation	Conditionally-Mandatory	Create pickup location on order creation itself	
{			
contactName	Mandatory	Location contact POC name	Minimum 1 character
pickupName	Mandatory	Name of the warehouse/store	Pickup address name must be between 3 and 75 characters long
pickupEmail	Mandatory	Location contact POC email	
pickupPhone	Mandatory	Location contact POC phone number	Phone number must start from 6, 7, 8, or 9
pickupAddress1	Mandatory	Warehouse/store address line 1	Pickup address line 1 must be between 3 and 100 characters long
pickupAddress2	Non-Mandatory	Warehouse/store address line 2	If entered, pickup address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Location Pincode	Must be 6-digit pincode
},			
storeName	Mandatory	Store name created on Rapidshyp	If you have one custom channel, pass "DEFAULT"
billingIsShipping	Mandatory	Pass true if both shipping and billing are same. In case false, billing address cannot be empty.	
shippingAddress	Mandatory	Shipping address details	
{			
firstName	Mandatory	Customer first name	The combined length of first and last name in the shipping address must be between 3 and 75 characters.
lastName	Non-Mandatory	Customer last name	
addressLine1	Mandatory	Shipping address line 1	Must be between 3 and 100 characters long
addressLine2	Non-Mandatory	Customer Address line 2	If entered, Shipping address line 2 must be between 3 and 100 characters long.
pinCode	Mandatory	Customer address pincode	Must be 6 digit valid pincode
email	Non-Mandatory	Customer email	
phone	Mandatory	Customer phone number	Phone number must start from 6,7,8,9
},			
billingAddress	Conditionally-Mandatory	Only pass incase billingIsShipping: false	
{			
firstName	Mandatory	Billing customer first name	The combined length of the first and last name in the shipping address must be between 3 and 75 characters.
lastName	Non-Mandatory	Billing customer last name	
addressLine1	Mandatory	Billing customer Address line 1	Billing address line 1 must be between 3 and 100 characters long
addressLine2	Non-Mandatory	Billing customer Address line 2	If entered, Billing address line 2 must be between 3 and 100 characters long
pinCode	Mandatory	Billing customer Address Pincode	Must be 6 digit valid pincode
email	Mandatory	Billing customer email	
phone	Mandatory	Billing customer phone number	Phone number must start from 6,7,8,9
},			
orderItems	Mandatory	Item level details	
{			
itemName	Mandatory	Item Name	Order line item name must be between 3 and 200 characters long
sku	Non-Mandatory	Item SKU Id	Order line item sku must be between 3 and 200 characters long
description	Non-Mandatory	Description of product	Minimum 1 character
units	Mandatory	Quantity of items	Item quantity must be greater than 0 in items
unitPrice (Either this or total unit value)	Conditionally-Mandatory	Unit price of SKU	Item unit price must be greater than 0 in items. Note: Either pass unit price or total order value field, both cannot be passed in the request body.
tax	Mandatory	Tax	Pass 0 incase of zero tax item
hsn	Non-Mandatory	HSN code	
productLength	Non-Mandatory	Product dimension length	In cm
productBreadth	Non-Mandatory	Product dimension breadth	In cm
productHeight	Non-Mandatory	Product dimension height	In cm
productWeight	Non-Mandatory	Product dimension weight	In gm
brand	Non-Mandatory	Brand of product	
imageURL	Non-Mandatory	Image URL	
isFragile	Non-Mandatory	If fragile item, pass true	
isPersonalisable	Non-Mandatory	If personalisable, pass true	
},			
],			
paymentMethod	Mandatory	Payment mode of order	Payment mode — please choose from [COD, PREPAID]
shippingCharges	Non-Mandatory	Shipping charges	
giftWrapCharges	Non-Mandatory	Gift wrap charges	
transactionCharges	Non-Mandatory	Transaction charges	
totalDiscount	Non-Mandatory	Total discount	
totalOrderValue	Conditionally-Mandatory	Total order value	Note: either pass unit price or total order value field — both cannot be passed in the request body.
codCharges	Non-Mandatory	COD charges	
prepaidAmount	Non-Mandatory	Prepaid amount	Pass partially paid amount in case of partial paid order. System then calculates collectible amount. Prepaid amount is only applicable on COD payment mode.
packageDetails	Mandatory	Prepaid amount	
{			
packageLength	Mandatory	packageLength	In cm
packageBreadth	Mandatory	packageBreadth	In cm
packageHeight	Mandatory	packageHeight	In cm
packageWeight	Mandatory	packageWeight	In gm
}			
}			
Response:
JSON



{
    "status": "SUCCESS",
    "remarks": "",
    "orderId": "T9",
    "orderCreated": true,
    "shipment": [
        {
            "shipmentId": "S24073186",
            "awbGenerated": true,
            "labelGenerated": true,
            "pickupScheduled": true,
            "awb": "71*******146",
            "courierCode": "Ecom Express Surface",
            "courierName": "Ecom Express Surface",
            "parentCourierName": "Ecom Express",
            "appliedWeight": 63.0,
            "labelURL": "https://rapidshyp_labels/Label_10Jul24.pdf",
            "manifestURL": "https://rapidshyp-public.s3.ap-south-1.amazonawsanifest_52.pdf",
            "routingCode": "NOI",
            "rtoRoutingCode": "NOI",
            "pickupName": "Home",
            "paymentMethod": "COD",
            "shippingCharges": 100.0,
            "giftWrapCharges": 0.0,
            "transactionCharges": 0.0,
            "totalDiscount": 0.0,
            "totalOrderValue": 150.0,
            "prepaidAmount": 0.0,
            "collectableAmount": 150.0,
            "shipmentLines": [
                {
                    "name": "Pwerew",
                    "sku": "Sqwer",
                    "units": 1,
                    "sellingPrice": 10.0
                },
                {
                    "name": "Product 2",
                    "sku": "Product 2",
                    "units": 2,
                    "sellingPrice": 40.0
                }
            ]
        }
    ]
}


Tracking
Use this API to fetch awb tracking.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/track_order
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Request Sample:
JSON
{

    			"seller_order_id": "O24025", 

    			"contact": "455432345 ",

   			 "email": "mah@rapidshyp.com",

   			 "awb": "RAPP0000000001"

}

Request Parameters	Required	Remark	Validation
seller_order_id	Conditional-Mandatory	Order ID of order created on Rapidshyp	Either order ID is required or AWB
contact		API user to share any of these details in case tracking is fetched based on order ID	
email			
awb	Conditional-Mandatory	AWB of shipment where AWB is assigned on Rapidshyp	Either order ID is required or AWB
Response:
JSON
{
    "success": true,
    "msg": "Record found successfully",
    "records": [
        {
            "seller_order_id": "O2406211",
            "creation_date": "11-06-2024 18:56:14",
            "payment_method": "COD",
            "total_order_value": 454.0,
            "store_name": "DEFAULT",
            "store_brand_name": "test Brand1",
            "store_id": null,
            "shipping_name": "JainAkans",
            "shipping_email": "",
            "shipping_contact": "919876543456",
            "shipping_address": "sdfghfdsa",
            "shipping_address_2": "sdfgbfdsa",
            "shipping_city": "DELHI",
            "shipping_pin_code": "110001",
            "shipping_state": "DELHI",
            "shipping_country": "INDIA",
            "billing_name": "JainAkans",
            "billing_email": "",
            "billing_contact": "919876543456",
            "billing_address": "sdfghfdsa",
            "billing_address_2": "sdfgbfdsa",
            "billing_city": "DELHI",
            "billing_pin_code": "110001",
            "billing_state": "DELHI",
            "billing_country": "INDIA",
            "customer_gstin": "",
            "order_status": "PROCESSING",
            "shipment_details": [
                {
                    "shipment_id": "S2406116",
                    "shipment_creation_date": "11-06-2024 18:56:31",
                    "total_shipment_value": 64.0,
                    "collectable_amount": 64.0,
                    "pickup_warehouse_name": "Delhi 110001",
                    "warehouse_contact_name": "Akansha Jain",
                    "warehouse_email": "abc@gmail.com",
                    "warehouse_contact": "9885645678",
                    "warehouse_address": "23456sdfvgbhfdcs",
                    "warehouse_address_2": "sdfgh",
                    "warehouse_pin_code": "110001",
                    "warehouse_city": "DELHI",
                    "warehouse_state": "DELHI",
                    "warehouse_country": "INDIA",
                    "rto_warehouse_name": "Delhi 110001",
                    "rto_warehouse_contact_name": "Akansha Jain",
                    "rto_warehouse_email": "abc@gmail.com",
                    "rto_warehouse_contact": "9885645678",
                    "rto_warehouse_address": "23456sdfvgbhfdcs",
                    "rto_warehouse_address_2": "sdfgh",
                    "rto_warehouse_pin_code": "110001",
                    "rto_warehouse_city": "DELHI",
                    "rto_warehouse_state": "DELHI",
                    "rto_warehouse_country": "INDIA",
                    "length": 11.0,
                    "breadth": 12.0,
                    "height": 13.0,
                    "dead_weight": 1.0,
                    "applied_weight": 1.0,
                    "invoice_number": "",
                    "shipment_status": "READY_TO_SHIP",
                    "awb": "I99296844",
                    "courier_name": "DTDC",
                    "child_courier_name": "DTDC - Air - 500 Gm",
                    "awb_assigned_date": "11-06-2024 18:57:10",
                    "current_courier_edd": null,
                    "current_tracking_status_code": null,
                    "current_tracking_status_desc": null,
                    "current_status_date": null,
                    "latest_ndr_reason_code": null,
                    "latest_ndr_reason_desc": null,
                    "latest_ndr_date": null,
                    "product_details": [
                        {
                            "product_name": "res",
                            "product_sku": "678",
                            "product_qty": 1
                        }
                    ],
                    "track_scans": [],
                    "delivered_date": null,
                    "rto_delivered_date": null
                },
                {
                    "shipment_id": "S2406115",
                    "shipment_creation_date": "11-06-2024 18:56:30",
                    "total_shipment_value": 390.0,
                    "collectable_amount": 390.0,
                    "pickup_warehouse_name": "Seller 110001",
                    "warehouse_contact_name": "Sudeep Das Gupta",
                    "warehouse_email": "sudeep.dasgupta@rapidshyp.com",
                    "warehouse_contact": "9876543211",
                    "warehouse_address": "Seller RE Plot 110001",
                    "warehouse_address_2": "",
                    "warehouse_pin_code": "110001",
                    "warehouse_city": "DELHI",
                    "warehouse_state": "DELHI",
                    "warehouse_country": "INDIA",
                    "rto_warehouse_name": "Seller 110001",
                    "rto_warehouse_contact_name": "Sudeep Das Gupta",
                    "rto_warehouse_email": "sudeep.dasgupta@rapidshyp.com",
                    "rto_warehouse_contact": "9876543211",
                    "rto_warehouse_address": "Seller RE Plot 110001",
                    "rto_warehouse_address_2": "",
                    "rto_warehouse_pin_code": "110001",
                    "rto_warehouse_city": "DELHI",
                    "rto_warehouse_state": "DELHI",
                    "rto_warehouse_country": "INDIA",
                    "length": 11.0,
                    "breadth": 12.0,
                    "height": 13.0,
                    "dead_weight": 1.0,
                    "applied_weight": 1.0,
                    "invoice_number": "",
                    "shipment_status": "READY_TO_SHIP",
                    "awb": "I99296845",
                    "courier_name": "DTDC",
                    "child_courier_name": "DTDC - Air - 500 Gm",
                    "awb_assigned_date": "11-06-2024 18:56:44",
                    "current_courier_edd": null,
                    "current_tracking_status_code": null,
                    "current_tracking_status_desc": null,
                    "current_status_date": null,
                    "latest_ndr_reason_code": null,
                    "latest_ndr_reason_desc": null,
                    "latest_ndr_date": null,
                    "product_details": [
                        {
                            "product_name": "bag",
                            "product_sku": "546",
                            "product_qty": 1
                        },
                        {
                            "product_name": "teA",
                            "product_sku": "434",
                            "product_qty": 1
                        }
                    ],
                    "track_scans": null,
                    "delivered_date": null,
                    "rto_delivered_date": null
                }
            ]
        }
    ]
}

Tracking status code Rapidshyp:
Rapidshyp Tracking Status Code	Status Description
SCB	Shipment Booked
PSH	Pickup Scheduled
OFP	Out for Pickup
PUE	Pick up Exception
PCN	Pickup Cancelled
PUC	Pickup Completed
SPD	Shipped / Dispatched
INT	In Transit
RAD	Reached at Destination
DED	Delivery Delayed
OFD	Out for Delivery
DEL	Delivered
UND	Undelivered
RTO_REQ	RTO Requested
RTO	RTO Confirmed
RTO_INT	RTO In Transit
RTO_RAD	RTO - Reached at Destination
RTO_OFD	RTO Out for Delivery
RTO_DEL	RTO Delivered
RTO_UND	RTO Undelivered
CAN	Shipment Cancelled
ONH	Shipment On Hold
LST	Shipment Lost
DMG	Shipment Damaged
MSR	Shipment Misrouted
DPO	Shipment Disposed-Off


Create Pickup Location API:
Use this API to Create Pickup Location at Rapidshyp.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/create/pickup_location
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location --globoff 'https://api.rapidshyp.com/rapidshyp/apis/v1/create/pickup_location' \
--header 'rapidshyp-token: {{WR}}' \
--header 'Content-Type: application/json' \
--data-raw '{
    "address_name": "Warehouse1",
    "contact_name": "Cristiano Ronaldo",
    "contact_number": "7302907766",
    "email": "john.doe@example.com",
    "address_line": "123 Main St",
    "address_line2": "Suite 100",
    "pincode": "110001",
    "gstin": "24AAACO4716C1ZZ",
    "dropship_location": true,
    "use_alt_rto_address": true,
    "rto_address": "",
    "create_rto_address": {
        "rto_address_name": "Warehouse2",
        "rto_contact_name": "Sergio Ramos",
        "rto_contact_number": "7302808843",
        "rto_email": "jane.smith@example.com",
        "rto_address_line": "456 RTO Rd",
        "rto_address_line2": "Building B",
        "rto_pincode": "110001",
        "rto_gstin": ""
    }
}'

Request Parameters	Required	Remark	Validation
address_name	Mandatory	Define a name to the warehouse/store/pickup location	Minimum 1 character
contact_name	Mandatory	Warehouse manager name	Only alphabets allowed
contact_number	Mandatory	Contact number of the POC at warehouse	Should start with 7, 8, 9 and should be 10 digits
email	Non-Mandatory	Email of the POC at warehouse	
address_line1	Mandatory	Warehouse/store address line 1	Pickup address line 1 must be between 3 and 100 characters long
address_line2	Non-Mandatory	Warehouse/store address line 1	Pickup address line 1 must be between 3 and 100 characters long
pincode	Mandatory	Location Pincode	Must be 6-digit valid pincode
gstin	Non-Mandatory	Location GSTIN if any	Valid GSTIN number
dropship_location	Non-Mandatory	Mark true if the location is a drop ship location	Accepts boolean value
use_alt_rto_address	Mandatory	Seller can map different RTO location against a pickup location. In case RTO location is same, mark this field as False	Accepts boolean value
rto_address	Conditional-Mandatory	Use to map already defined RTO address against the pickup location	
create_rto_address	Conditional-Mandatory		
{			
rto_address_name	Mandatory	Define a name to the warehouse/store/pickup location	Minimum 1 character
rto_contact_name	Mandatory	Warehouse manager name	Only alphabets allowed
rto_contact_number	Mandatory	Contact number of the POC at warehouse	Should start with 7, 8, 9 and should be 10 digits
rto_email	Non-Mandatory	Email of the POC at warehouse	
rto_address_line	Mandatory	Warehouse/store address line 1	Shipping address line 1 must be between 3 and 100 characters long
rto_address_line2	Non-Mandatory	Warehouse/store address line 2	If entered, Shipping address line 2 must be between 3 and 100 characters long
rto_pincode	Mandatory	Location Pincode	Must be 6-digit valid pincode
rto_gstin	Non-Mandatory	Location GSTIN if any	Valid GSTIN number
}			
Response:
JSON
{
    "status": "success",
    "remark": "Address created successfully",
    "pickup_location_name": "Warehouse1",
    "rto_location_name": "Warehouse2"
}


Fetch Pickup Location:
Usage: Use this API to Approve an order.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/fetch_pickup_location
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Curl:
curl --location 'https://api.rapidshyp.com/rapidshyp/apis/v1/fetch_pickup_location' \
--header 'rapidshyp-token:  HQ$fS*******KHoZ'\
--header 'Content-Type: application/json'

Response:
JSON
{
            "pickup_name": "",
            "contact_name": "",
            "contact_number": "",
            "contact_email": "",
            "pickup_address_1": "adcd",
            "pickup_address_2": "",
            "city": "NEW DELHI",
            "state": "DELHI",
            "pin_code": "110001",
            "country": "INDIA",
            "state_name": "DELHI",
            "status": "enabled",
            "is_rto_address_same": true
        }

        Tracking
Use this API to fetch awb tracking.

Basic Information
NAME	DETAILS
Usage:	Mandatory
URL:	https://api.rapidshyp.com/rapidshyp/apis/v1/track_order
Request Type:	POST
Scheme:	HTTPS
Header (content-type):	application/json
Header (rapidshyp-token):	API-Key
Request Sample:
JSON
{

    			"seller_order_id": "O24025", 

    			"contact": "455432345 ",

   			 "email": "mah@rapidshyp.com",

   			 "awb": "RAPP0000000001"

}

Request Parameters	Required	Remark	Validation
seller_order_id	Conditional-Mandatory	Order ID of order created on Rapidshyp	Either order ID is required or AWB
contact		API user to share any of these details in case tracking is fetched based on order ID	
email			
awb	Conditional-Mandatory	AWB of shipment where AWB is assigned on Rapidshyp	Either order ID is required or AWB
Response:
JSON
{
    "success": true,
    "msg": "Record found successfully",
    "records": [
        {
            "seller_order_id": "O2406211",
            "creation_date": "11-06-2024 18:56:14",
            "payment_method": "COD",
            "total_order_value": 454.0,
            "store_name": "DEFAULT",
            "store_brand_name": "test Brand1",
            "store_id": null,
            "shipping_name": "JainAkans",
            "shipping_email": "",
            "shipping_contact": "919876543456",
            "shipping_address": "sdfghfdsa",
            "shipping_address_2": "sdfgbfdsa",
            "shipping_city": "DELHI",
            "shipping_pin_code": "110001",
            "shipping_state": "DELHI",
            "shipping_country": "INDIA",
            "billing_name": "JainAkans",
            "billing_email": "",
            "billing_contact": "919876543456",
            "billing_address": "sdfghfdsa",
            "billing_address_2": "sdfgbfdsa",
            "billing_city": "DELHI",
            "billing_pin_code": "110001",
            "billing_state": "DELHI",
            "billing_country": "INDIA",
            "customer_gstin": "",
            "order_status": "PROCESSING",
            "shipment_details": [
                {
                    "shipment_id": "S2406116",
                    "shipment_creation_date": "11-06-2024 18:56:31",
                    "total_shipment_value": 64.0,
                    "collectable_amount": 64.0,
                    "pickup_warehouse_name": "Delhi 110001",
                    "warehouse_contact_name": "Akansha Jain",
                    "warehouse_email": "abc@gmail.com",
                    "warehouse_contact": "9885645678",
                    "warehouse_address": "23456sdfvgbhfdcs",
                    "warehouse_address_2": "sdfgh",
                    "warehouse_pin_code": "110001",
                    "warehouse_city": "DELHI",
                    "warehouse_state": "DELHI",
                    "warehouse_country": "INDIA",
                    "rto_warehouse_name": "Delhi 110001",
                    "rto_warehouse_contact_name": "Akansha Jain",
                    "rto_warehouse_email": "abc@gmail.com",
                    "rto_warehouse_contact": "9885645678",
                    "rto_warehouse_address": "23456sdfvgbhfdcs",
                    "rto_warehouse_address_2": "sdfgh",
                    "rto_warehouse_pin_code": "110001",
                    "rto_warehouse_city": "DELHI",
                    "rto_warehouse_state": "DELHI",
                    "rto_warehouse_country": "INDIA",
                    "length": 11.0,
                    "breadth": 12.0,
                    "height": 13.0,
                    "dead_weight": 1.0,
                    "applied_weight": 1.0,
                    "invoice_number": "",
                    "shipment_status": "READY_TO_SHIP",
                    "awb": "I99296844",
                    "courier_name": "DTDC",
                    "child_courier_name": "DTDC - Air - 500 Gm",
                    "awb_assigned_date": "11-06-2024 18:57:10",
                    "current_courier_edd": null,
                    "current_tracking_status_code": null,
                    "current_tracking_status_desc": null,
                    "current_status_date": null,
                    "latest_ndr_reason_code": null,
                    "latest_ndr_reason_desc": null,
                    "latest_ndr_date": null,
                    "product_details": [
                        {
                            "product_name": "res",
                            "product_sku": "678",
                            "product_qty": 1
                        }
                    ],
                    "track_scans": [],
                    "delivered_date": null,
                    "rto_delivered_date": null
                },
                {
                    "shipment_id": "S2406115",
                    "shipment_creation_date": "11-06-2024 18:56:30",
                    "total_shipment_value": 390.0,
                    "collectable_amount": 390.0,
                    "pickup_warehouse_name": "Seller 110001",
                    "warehouse_contact_name": "Sudeep Das Gupta",
                    "warehouse_email": "sudeep.dasgupta@rapidshyp.com",
                    "warehouse_contact": "9876543211",
                    "warehouse_address": "Seller RE Plot 110001",
                    "warehouse_address_2": "",
                    "warehouse_pin_code": "110001",
                    "warehouse_city": "DELHI",
                    "warehouse_state": "DELHI",
                    "warehouse_country": "INDIA",
                    "rto_warehouse_name": "Seller 110001",
                    "rto_warehouse_contact_name": "Sudeep Das Gupta",
                    "rto_warehouse_email": "sudeep.dasgupta@rapidshyp.com",
                    "rto_warehouse_contact": "9876543211",
                    "rto_warehouse_address": "Seller RE Plot 110001",
                    "rto_warehouse_address_2": "",
                    "rto_warehouse_pin_code": "110001",
                    "rto_warehouse_city": "DELHI",
                    "rto_warehouse_state": "DELHI",
                    "rto_warehouse_country": "INDIA",
                    "length": 11.0,
                    "breadth": 12.0,
                    "height": 13.0,
                    "dead_weight": 1.0,
                    "applied_weight": 1.0,
                    "invoice_number": "",
                    "shipment_status": "READY_TO_SHIP",
                    "awb": "I99296845",
                    "courier_name": "DTDC",
                    "child_courier_name": "DTDC - Air - 500 Gm",
                    "awb_assigned_date": "11-06-2024 18:56:44",
                    "current_courier_edd": null,
                    "current_tracking_status_code": null,
                    "current_tracking_status_desc": null,
                    "current_status_date": null,
                    "latest_ndr_reason_code": null,
                    "latest_ndr_reason_desc": null,
                    "latest_ndr_date": null,
                    "product_details": [
                        {
                            "product_name": "bag",
                            "product_sku": "546",
                            "product_qty": 1
                        },
                        {
                            "product_name": "teA",
                            "product_sku": "434",
                            "product_qty": 1
                        }
                    ],
                    "track_scans": null,
                    "delivered_date": null,
                    "rto_delivered_date": null
                }
            ]
        }
    ]
}

Tracking status code Rapidshyp:
Rapidshyp Tracking Status Code	Status Description
SCB	Shipment Booked
PSH	Pickup Scheduled
OFP	Out for Pickup
PUE	Pick up Exception
PCN	Pickup Cancelled
PUC	Pickup Completed
SPD	Shipped / Dispatched
INT	In Transit
RAD	Reached at Destination
DED	Delivery Delayed
OFD	Out for Delivery
DEL	Delivered
UND	Undelivered
RTO_REQ	RTO Requested
RTO	RTO Confirmed
RTO_INT	RTO In Transit
RTO_RAD	RTO - Reached at Destination
RTO_OFD	RTO Out for Delivery
RTO_DEL	RTO Delivered
RTO_UND	RTO Undelivered
CAN	Shipment Cancelled
ONH	Shipment On Hold
LST	Shipment Lost
DMG	Shipment Damaged
MSR	Shipment Misrouted
DPO	Shipment Disposed-Off