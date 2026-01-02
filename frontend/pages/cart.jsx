import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShoppingBag, ArrowLeft, Plus, Minus, Trash2, Heart, Tag, ArrowRight, X } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartCount } = useCart();
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState(0);

  const handleUpdateQuantity = (item, newQuantity) => {
    updateQuantity(item.variant?.sku, newQuantity, item.id);
  };

  const handleRemoveItem = (item) => {
    removeFromCart(item.id, item.variant.sku);
  };

  const handleMoveToWishlist = (item) => {
    // Get existing wishlist
    const savedWishlist = localStorage.getItem('wishlist');
    const wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];

    // Add to wishlist if not already there
    if (!wishlist.find(w => w.id === item.productId || w.id === item.id)) {
      wishlist.push({
        id: item.productId || item.id,
        productName: item.productName || item.name
      });
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }

    // Remove from cart
    handleRemoveItem(item);
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setAppliedCoupon(null);
    setDiscount(0);

    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    try {
      const { getApiUrl } = require('../lib/config');
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/coupons/param/${couponCode.trim()}`);

      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data.code);
        setDiscount(data.discount_value);
        // Note: Logic below needs to handle percentage vs fixed based on data.discount_type
        // For now, let's store the full coupon object
        window.localStorage.setItem('temp_coupon', JSON.stringify(data));
      } else {
        const err = await res.json();
        setCouponError(err.detail || 'Invalid coupon code');
      }
    } catch (error) {
      setCouponError('Failed to apply coupon');
      console.error(error);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
    setCouponError('');
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      handleRemoveCoupon();
    }
  };

  // Calculate totals
  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + ((item.element?.price || item.variant?.price || 0) * item.quantity), 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    // Check localStorage for coupon details since we only stored code in state
    // ideal refactor: store full coupon object in state
    const savedCoupon = typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('temp_coupon') || '{}') : {};

    if (savedCoupon.code === appliedCoupon) {
      if (savedCoupon.discount_type === 'percentage') {
        discountAmount = (subtotal * savedCoupon.discount_value) / 100;
      } else if (savedCoupon.discount_type === 'fixed') {
        discountAmount = savedCoupon.discount_value;
      } else if (savedCoupon.discount_type === 'flat_price') {
        discountAmount = subtotal - savedCoupon.discount_value;
      }
    } else if (appliedCoupon === 'TESTADI') {
      // Legacy fallback (should ideally remove)
      discountAmount = subtotal - 1;
    }
  }

  const total = subtotal - discountAmount;

  return (
    <>
      <Head>
        <title>Shopping Cart - Varaha Jewels</title>
        <meta name="description" content="Review your shopping cart and proceed to checkout" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Header cartCount={cartCount} />

      <main className="min-h-screen bg-warm-sand py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-heritage hover:text-copper transition-colors mb-4 sm:mb-6"
            >
              <ArrowLeft size={20} />
              Continue Shopping
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">Shopping Cart</h1>
            <div className="w-20 h-px bg-copper"></div>
          </div>

          {!cartItems || cartItems.length === 0 ? (
            /* Empty Cart State */
            <div className="bg-white border border-copper/30 rounded-sm p-8 sm:p-12 text-center">
              <ShoppingBag className="mx-auto mb-6 text-heritage/30" size={64} />
              <h2 className="text-2xl sm:text-3xl font-royal font-bold text-heritage mb-4">Your cart is empty</h2>
              <p className="text-heritage/70 mb-8 max-w-md mx-auto">
                Looks like you haven't added any items to your cart yet. Explore our exquisite collections!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/shop"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all duration-300"
                >
                  <ShoppingBag size={20} />
                  Browse Collections
                </Link>
                <Link
                  href="/wishlist"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-copper text-copper font-semibold rounded-sm hover:bg-copper hover:text-warm-sand transition-all duration-300"
                >
                  <Heart size={20} />
                  View Wishlist
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {/* Clear Cart Button */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-heritage/70 text-sm">
                    {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in cart
                  </p>
                  <button
                    onClick={handleClearCart}
                    className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    Clear Cart
                  </button>
                </div>

                {cartItems.map((item) => (
                  <div
                    key={item.variant?.sku || item.id}
                    className="bg-white border border-copper/30 rounded-sm p-4 sm:p-6 hover:shadow-lg transition-shadow duration-300"
                  >
                    <div className="flex gap-4 sm:gap-6">
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        <Image
                          src={item.variant?.image || item.image || '/varaha-assets/dp1.avif'}
                          alt={item.productName || item.name}
                          width={120}
                          height={120}
                          className="w-20 h-20 sm:w-32 sm:h-32 object-cover rounded-sm"
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-base sm:text-lg font-royal font-bold text-heritage mb-1">
                              {item.productName || item.name}
                            </h3>
                            <p className="text-sm text-heritage/60">{item.variant?.name}</p>
                          </div>
                          <button
                            onClick={() => handleRemoveItem(item)}
                            className="text-heritage/40 hover:text-red-600 transition-colors p-2"
                            aria-label="Remove item"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-4">
                            <span className="hidden sm:inline text-sm text-heritage/70">Quantity:</span>
                            <div className="flex items-center border-2 border-copper/30 rounded-sm overflow-hidden">
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                className="p-2 hover:bg-copper/10 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus size={16} className="text-copper" />
                              </button>
                              <span className="px-4 sm:px-6 py-2 font-semibold text-heritage min-w-[50px] sm:min-w-[60px] text-center text-sm sm:text-base">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                className="p-2 hover:bg-copper/10 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus size={16} className="text-copper" />
                              </button>
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-left sm:text-right">
                            <p className="text-lg sm:text-2xl font-bold text-heritage">
                              ₹{((item.variant?.price || 0) * item.quantity).toLocaleString('en-IN')}
                            </p>
                            <p className="text-xs text-heritage/60">
                              ₹{(item.variant?.price || 0).toLocaleString('en-IN')} each
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4 mt-4 pt-4 border-t border-copper/20">
                          <button
                            onClick={() => handleMoveToWishlist(item)}
                            className="text-sm text-copper hover:text-heritage font-medium flex items-center gap-2 transition-colors"
                          >
                            <Heart size={16} />
                            Move to Wishlist
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-copper/30 rounded-sm p-6 sticky top-24">
                  <h2 className="text-2xl font-royal font-bold text-heritage mb-6">Order Summary</h2>

                  {/* Coupon Section */}
                  <div className="mb-6 pb-6 border-b border-copper/30">
                    {!appliedCoupon ? (
                      <div>
                        <label className="block text-sm font-medium text-heritage mb-2 flex items-center gap-2">
                          <Tag size={16} className="text-copper" />
                          Have a Coupon Code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter code"
                            className="flex-1 w-full px-4 py-2 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all text-sm"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            className="px-4 py-2 bg-copper text-warm-sand font-medium rounded-sm hover:bg-heritage transition-all duration-300 text-sm whitespace-nowrap"
                          >
                            Apply
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-600 text-xs mt-2">{couponError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-sm">
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-green-600" />
                          <span className="text-sm font-semibold text-green-700">{appliedCoupon}</span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          aria-label="Remove coupon"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-heritage/70">
                      <span>Subtotal</span>
                      <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {appliedCoupon && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({appliedCoupon})</span>
                        <span className="font-semibold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-heritage/70">
                      <span>Shipping</span>
                      <span className="font-semibold text-green-600">
                        {subtotal >= 5000 ? 'FREE' : '₹99'}
                      </span>
                    </div>

                    {subtotal < 5000 && (
                      <p className="text-xs text-heritage/60 bg-copper/10 p-2 rounded-sm">
                        Add ₹{(5000 - subtotal).toLocaleString('en-IN')} more for FREE shipping!
                      </p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t-2 border-copper/30 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-heritage">Total</span>
                      <span className="text-3xl font-bold text-heritage">
                        ₹{Math.round(total + (subtotal >= 5000 ? 0 : 99)).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-heritage/60 mt-1">Inclusive of all taxes</p>
                  </div>

                  {/* Checkout Button */}
                  <Link
                    href="/checkout?fromCart=true"
                    className="w-full px-8 py-4 bg-copper text-warm-sand font-bold rounded-sm hover:bg-heritage transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
                  >
                    Proceed to Checkout
                    <ArrowRight size={20} />
                  </Link>

                  {/* Trust Badges */}
                  <div className="mt-6 pt-6 border-t border-copper/20 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-heritage/70">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Secure Checkout</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-heritage/70">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>7-Day Easy Returns</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-heritage/70">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>100% Authentic Products</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
