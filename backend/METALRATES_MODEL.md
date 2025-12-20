# Metal Rates Model Addition

## Add this to the END of backend/models.py:

```python
# ==========================================
# 💰 METAL RATES MODEL
# ==========================================

class MetalRates(SQLModel, table=True):
    """Store current gold and silver rates for display"""
    id: Optional[int] = Field(default=None, primary_key=True)
    gold_rate: float = Field(default=124040.0)  # 22 Carat per 10g
    silver_rate: float = Field(default=208900.0)  # 999 Purity per 1kg
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[str] = None  # Admin username
```

## Update main.py imports (line 9-12):

```python
from models import (
    Product, Order, AdminUser, PaymentGateway, Notification, Customer, Review, 
    Coupon, VisitorLog, ActiveVisitor, HeroSlide, CreatorVideo, StoreSettings, 
    Cart, CartItem, Wishlist, Address, ProductVariant, Inventory, OrderReturn,
    MetalRates  # ADD THIS
)
```
