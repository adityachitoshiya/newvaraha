import { useState } from 'react';
import { Star, Heart, ShoppingBag, Truck, RotateCcw, Shield, ChevronDown, ChevronUp, MapPin, Check, Gift, CreditCard, X } from 'lucide-react';
import { formatCurrency } from '../lib/productData';
import WishlistButton from './WishlistButton';

export default function ProductInfo({ product, onAddToCart, onBuyNow }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || {});
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showOffers, setShowOffers] = useState(true);

  // Calculate discount percentage
  const originalPrice = selectedVariant.compareAt || selectedVariant.price * 1.15;
  const discountPercent = Math.round(((originalPrice - selectedVariant.price) / originalPrice) * 100);

  const handleAddToCart = () => {
    onAddToCart(selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    onBuyNow(selectedVariant, quantity);
  };

  const checkPincode = () => {
    if (pincode.length === 6) {
      setDeliveryInfo({
        available: true,
        date: 'Sat, 27 Dec',
        cod: true,
        freeDelivery: selectedVariant.price > 999
      });
    }
  };

  // Mock offers data
  const offers = [
    { title: '10% Instant Discount on Axis Bank Cards', subtitle: 'Min Spend ₹3,500, Max Discount ₹500' },
    { title: '5% Unlimited Cashback on Credit Cards', subtitle: '' },
    { title: 'EMI option available', subtitle: 'EMI starting from ₹500/month' },
  ];

  // Mock size options with stock
  const sizeOptions = product.variants?.length > 1
    ? product.variants.map(v => ({
      ...v,
      stockLeft: Math.floor(Math.random() * 10),
      disabled: !v.inStock
    }))
    : null;

  return (
    <div className="space-y-4 px-4 lg:px-0 pb-24 lg:pb-0">
      {/* Brand & Title */}
      <div className="border-b border-copper/20 pb-4">
        <h1 className="text-lg md:text-2xl font-royal font-bold text-heritage tracking-wide">
          Varaha Jewels
        </h1>
        <p className="text-base text-matte-brown mt-1">{product.title}</p>

        {/* Rating - Hidden on mobile (shown on carousel) */}
        <div className="hidden lg:flex items-center mt-3 space-x-2">
          <div className="flex items-center bg-heritage text-cream px-2 py-0.5 rounded text-sm font-semibold">
            <span>{product.averageRating || 4.5}</span>
            <Star size={12} className="ml-1 fill-white" />
          </div>
          <span className="text-matte-brown text-sm border-b border-copper/40 cursor-pointer hover:text-heritage">
            {product.reviewCount || 124} Ratings
          </span>
        </div>
      </div>

      {/* Price Section */}
      <div className="pb-4 border-b border-copper/20">
        <div className="flex items-baseline flex-wrap">
          <span className="text-matte-brown/60 text-sm mr-2">MRP</span>
          <span className="text-base text-matte-brown/60 line-through mr-2">
            {formatCurrency(originalPrice)}
          </span>
          <span className="text-2xl font-bold text-heritage font-royal mr-2">
            {formatCurrency(selectedVariant.price)}
          </span>
          <span className="text-base font-semibold text-royal-orange">
            ({discountPercent}% OFF)
          </span>
        </div>
        <p className="text-xs text-heritage/70 mt-1">inclusive of all taxes</p>
      </div>

      {/* Bank Offer Banner - Myntra Style */}
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded">MEGA DEAL</span>
            <span className="text-sm font-semibold text-heritage">Get at {formatCurrency(selectedVariant.price * 0.9)}</span>
            <span className="bg-royal-orange text-white text-xs px-2 py-0.5 rounded">Extra ₹{Math.round(selectedVariant.price * 0.1)} Off</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs text-matte-brown">With 🏦 Bank Offer</p>
          <button className="text-xs font-semibold text-copper">Details &gt;</button>
        </div>
      </div>

      {/* Size Selector with Stock Info */}
      {sizeOptions && sizeOptions.length > 1 && (
        <div className="pb-4 border-b border-copper/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-base font-semibold text-heritage">
              Select Size
            </span>
            <button className="text-sm font-semibold text-copper hover:text-heritage flex items-center">
              Size Chart &gt;
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {sizeOptions.map((variant) => (
              <div key={variant.id} className="flex flex-col items-center">
                <button
                  onClick={() => setSelectedVariant(variant)}
                  disabled={variant.disabled}
                  className={`w-14 h-14 rounded-full border-2 font-medium text-sm transition-all ${selectedVariant.id === variant.id
                    ? 'border-copper text-copper bg-copper/10'
                    : variant.disabled
                      ? 'border-gray-200 text-gray-300 line-through cursor-not-allowed'
                      : 'border-matte-brown/30 text-heritage hover:border-copper'
                    }`}
                >
                  {variant.name || variant.title}
                </button>
                {/* Stock indicator */}
                {!variant.disabled && variant.stockLeft < 5 && variant.stockLeft > 0 && (
                  <span className="text-[10px] text-royal-orange mt-1 font-medium">{variant.stockLeft} left</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Action Buttons - Hidden on Mobile */}
      <div className="hidden lg:flex gap-3 pb-4 border-b border-copper/20">
        <button
          onClick={handleAddToCart}
          disabled={!selectedVariant.inStock}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-copper hover:bg-heritage text-white font-bold text-base rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          <ShoppingBag size={20} />
          ADD TO BAG
        </button>
        <WishlistButton
          productId={product.id}
          productData={{
            id: product.id,
            name: product.title,
            price: selectedVariant.price,
            image: product.images?.[0],
            title: product.title
          }}
          size="lg"
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 border-2 border-copper/50 hover:border-copper text-heritage font-bold text-base rounded-md transition-colors"
          showText={true}
        />
      </div>

      {/* Delivery & Services */}
      <div className="pb-4 border-b border-copper/20">
        <h3 className="text-base font-semibold text-heritage mb-3">Delivery & Services</h3>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Enter pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border border-copper/30 rounded-md text-sm focus:outline-none focus:border-copper bg-warm-sand/30"
            />
          </div>
          <button
            onClick={checkPincode}
            className="px-4 py-3 text-copper font-semibold text-sm hover:text-heritage transition"
          >
            Change
          </button>
        </div>

        {deliveryInfo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-copper/10 rounded-full flex items-center justify-center">
                <Truck size={16} className="text-copper" />
              </div>
              <div>
                <p className="text-sm text-heritage">Get it by <span className="font-semibold">{deliveryInfo.date}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                <X size={16} className="text-red-500" />
              </div>
              <p className="text-sm text-heritage">Pay on Delivery is not available</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-copper/10 rounded-full flex items-center justify-center">
                <RotateCcw size={16} className="text-copper" />
              </div>
              <p className="text-sm text-heritage">Hassle free 7 days Return & Exchange</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-matte-brown">Please enter PIN code to check delivery time & Pay on Delivery Availability</p>
        )}
      </div>

      {/* Best Offers */}
      <div className="pb-4 border-b border-copper/20">
        <button
          onClick={() => setShowOffers(!showOffers)}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-royal-orange" />
            <span className="text-base font-semibold text-heritage">
              Best Offers
            </span>
          </div>
          {showOffers ? <ChevronUp size={18} className="text-copper" /> : <ChevronDown size={18} className="text-copper" />}
        </button>

        {showOffers && (
          <div className="mt-3 space-y-3">
            {offers.map((offer, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-copper rounded-full mt-2 flex-shrink-0" />
                <div>
                  <p className="text-sm text-heritage">{offer.title}</p>
                  {offer.subtitle && <p className="text-xs text-matte-brown">{offer.subtitle}</p>}
                </div>
              </div>
            ))}
            <button className="text-sm text-copper font-semibold hover:text-heritage">
              View all offers &gt;
            </button>
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="pb-4">
        <button
          onClick={() => setShowProductDetails(!showProductDetails)}
          className="w-full flex items-center justify-between py-2"
        >
          <span className="text-base font-semibold text-heritage">
            Product Details
          </span>
          {showProductDetails ? <ChevronUp size={18} className="text-copper" /> : <ChevronDown size={18} className="text-copper" />}
        </button>

        {showProductDetails && (
          <div className="mt-3 space-y-4">
            <p className="text-sm text-matte-brown leading-relaxed">{product.description}</p>

            {/* Specifications Table */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {product.metal && (
                <>
                  <div className="text-matte-brown">Metal</div>
                  <div className="text-heritage">{product.metal}</div>
                </>
              )}
              {product.carat && (
                <>
                  <div className="text-matte-brown">Purity</div>
                  <div className="text-heritage">{product.carat}</div>
                </>
              )}
              {product.polish && (
                <>
                  <div className="text-matte-brown">Finish</div>
                  <div className="text-heritage">{product.polish}</div>
                </>
              )}
              {product.category && (
                <>
                  <div className="text-matte-brown">Category</div>
                  <div className="text-heritage">{product.category}</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trust Badges */}
      <div className="grid grid-cols-3 gap-4 py-4 border-t border-copper/20 bg-warm-sand/30 rounded-lg">
        <div className="text-center">
          <Shield size={24} className="mx-auto text-copper mb-1" />
          <p className="text-xs text-heritage">100% Authentic</p>
        </div>
        <div className="text-center">
          <RotateCcw size={24} className="mx-auto text-copper mb-1" />
          <p className="text-xs text-heritage">Easy Returns</p>
        </div>
        <div className="text-center">
          <Truck size={24} className="mx-auto text-copper mb-1" />
          <p className="text-xs text-heritage">Free Shipping</p>
        </div>
      </div>
    </div>
  );
}
