# 🧪 API TESTING GUIDE - New Features

Quick reference for testing newly implemented APIs using curl or REST client.

---

## 🎁 WISHLIST APIs

### 1. Get Wishlist
```bash
curl -X GET "http://localhost:8000/api/wishlist" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Add to Wishlist
```bash
curl -X POST "http://localhost:8000/api/wishlist?product_id=PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Remove from Wishlist
```bash
curl -X DELETE "http://localhost:8000/api/wishlist/PRODUCT_ID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Sync Wishlist
```bash
curl -X POST "http://localhost:8000/api/wishlist/sync" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '["product1", "product2", "product3"]'
```

---

## 📍 ADDRESS APIs

### 1. Get All Addresses
```bash
curl -X GET "http://localhost:8000/api/addresses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Add New Address
```bash
curl -X POST "http://localhost:8000/api/addresses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Home",
    "full_name": "John Doe",
    "phone": "9876543210",
    "address_line1": "123 Main Street",
    "address_line2": "Apartment 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India",
    "is_default": true,
    "address_type": "both"
  }'
```

### 3. Update Address
```bash
curl -X PUT "http://localhost:8000/api/addresses/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Office",
    "full_name": "John Doe",
    "phone": "9876543210",
    "address_line1": "456 Business Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002",
    "is_default": false,
    "address_type": "shipping"
  }'
```

### 4. Delete Address
```bash
curl -X DELETE "http://localhost:8000/api/addresses/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. Set Default Address
```bash
curl -X PUT "http://localhost:8000/api/addresses/1/default" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🎨 PRODUCT VARIANT APIs

### 1. Get Product Variants
```bash
curl -X GET "http://localhost:8000/api/products/PRODUCT_ID/variants"
```

### 2. Add Variant (Admin)
```bash
curl -X POST "http://localhost:8000/api/products/PRODUCT_ID/variants" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "RING-18K-SIZE7",
    "name": "18K Gold - Ring Size 7",
    "price": 25000,
    "stock": 10,
    "attributes": "{\"size\": \"7\", \"metal\": \"18K Gold\", \"weight\": \"5g\"}",
    "is_available": true
  }'
```

### 3. Update Variant
```bash
curl -X PUT "http://localhost:8000/api/variants/1" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "stock": 15,
    "price": 26000
  }'
```

### 4. Get Inventory Status
```bash
curl -X GET "http://localhost:8000/api/inventory/PRODUCT_ID"
```

---

## 🔄 ORDER RETURN APIs

### 1. Create Return Request
```bash
curl -X POST "http://localhost:8000/api/orders/ORD12345/return" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Size not suitable",
    "description": "Ring size is too small",
    "refund_amount": 25000,
    "refund_method": "original",
    "items": ["item1", "item2"]
  }'
```

### 2. Get All Returns (Admin)
```bash
curl -X GET "http://localhost:8000/api/returns" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 3. Get Customer Returns
```bash
curl -X GET "http://localhost:8000/api/customer/returns" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Update Return Status (Admin)
```bash
curl -X PUT "http://localhost:8000/api/returns/1" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "admin_notes": "Return approved. Please ship back the product.",
    "tracking_number": "TRACK123456"
  }'
```

### 5. Process Refund (Admin)
```bash
curl -X POST "http://localhost:8000/api/returns/1/refund" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🔍 SEARCH & FILTER APIs

### 1. Search Products
```bash
curl -X GET "http://localhost:8000/api/products/search?q=ring&category=Heritage&metal=Gold&min_price=10000&max_price=50000&sort=price_asc&limit=20"
```

### 2. Get Search Suggestions
```bash
curl -X GET "http://localhost:8000/api/products/suggestions?q=gold&limit=10"
```

### Example Response:
```json
{
  "suggestions": [
    {"name": "Gold Ring", "id": "product1"},
    {"name": "Gold Necklace", "id": "product2"},
    {"name": "Gold Earrings", "id": "product3"}
  ]
}
```

---

## ⭐ RATING APIs

### 1. Get Rating Summary
```bash
curl -X GET "http://localhost:8000/api/products/PRODUCT_ID/rating-summary"
```

### Example Response:
```json
{
  "average_rating": 4.3,
  "total_reviews": 25,
  "distribution": {
    "5": 12,
    "4": 8,
    "3": 3,
    "2": 1,
    "1": 1
  },
  "rating_percentages": {
    "5": 48.0,
    "4": 32.0,
    "3": 12.0,
    "2": 4.0,
    "1": 4.0
  }
}
```

### 2. Mark Review Helpful
```bash
curl -X POST "http://localhost:8000/api/reviews/1/helpful"
```

---

## 🔐 GETTING AUTH TOKEN

### 1. Customer Login
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'
```

### Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "customer@example.com",
    "full_name": "John Doe"
  }
}
```

### 2. Use Token in Requests
```bash
# Replace YOUR_TOKEN_HERE with the access_token from login response
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🧪 POSTMAN COLLECTION

### Import to Postman:
1. Create new Collection: "Varaha Jewels - New Features"
2. Add Environment Variables:
   - `base_url`: http://localhost:8000
   - `token`: (Your JWT token)
   - `admin_token`: (Admin JWT token)

### Request Structure:
```
GET {{base_url}}/api/wishlist
Authorization: Bearer {{token}}
```

---

## 📊 TEST DATA EXAMPLES

### Test User:
```json
{
  "email": "test@varahajewels.com",
  "password": "Test@123",
  "full_name": "Test User"
}
```

### Test Product:
```json
{
  "id": "heritage-gold-ring-001",
  "name": "Heritage Gold Ring",
  "price": 25000,
  "category": "Heritage",
  "metal": "Gold"
}
```

### Test Address:
```json
{
  "label": "Home",
  "full_name": "Test User",
  "phone": "9876543210",
  "address_line1": "123 Test Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "is_default": true
}
```

---

## ✅ TESTING CHECKLIST

### Wishlist:
- [ ] Add product to wishlist (authenticated)
- [ ] Get wishlist with product details
- [ ] Remove product from wishlist
- [ ] Sync multiple products at once
- [ ] Prevent duplicate entries

### Address:
- [ ] Create new address
- [ ] Get all addresses (sorted by default)
- [ ] Update existing address
- [ ] Delete address
- [ ] Set/unset default address

### Variants:
- [ ] Get variants for product
- [ ] Create variant with attributes
- [ ] Update variant stock
- [ ] Check inventory status
- [ ] Verify SKU uniqueness

### Returns:
- [ ] Customer creates return request
- [ ] Verify order ownership
- [ ] Admin views all returns
- [ ] Update return status
- [ ] Process refund

### Search:
- [ ] Search by query
- [ ] Filter by category, metal, price
- [ ] Sort by price, newest
- [ ] Pagination works
- [ ] Suggestions return relevant results

### Ratings:
- [ ] Get rating summary
- [ ] Verify distribution percentages
- [ ] Mark review helpful
- [ ] Check auto-update on new review

---

## 🚨 COMMON ERRORS

### 401 Unauthorized
```json
{"detail": "Not authenticated"}
```
**Solution:** Add Authorization header with valid token

### 404 Not Found
```json
{"detail": "Product not found"}
```
**Solution:** Verify product_id exists in database

### 400 Bad Request
```json
{"detail": "Return request already exists"}
```
**Solution:** Check if return already created for this order

### 403 Forbidden
```json
{"detail": "Not authorized"}
```
**Solution:** User doesn't own the resource (order/address)

---

## 📖 API DOCUMENTATION

Full interactive API documentation available at:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

**Happy Testing! 🎉**
