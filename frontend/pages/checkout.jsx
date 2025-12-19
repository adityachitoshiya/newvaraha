import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/config';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script'; // Import Script for Razorpay
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShoppingBag, ArrowLeft, Lock, CreditCard, Truck, Check, Tag } from 'lucide-react';

export default function Checkout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Customer details
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState(0);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('online'); // 'online' or 'cod'

  // COD Confirmation Modal state
  const [showCODConfirmation, setShowCODConfirmation] = useState(false);

  // Cart items state
  const [cartItems, setCartItems] = useState([]);

  // Product details from URL params (for direct checkout from product page)
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    // Check if coming from cart or direct product checkout
    const { productId, variantId, quantity, amount, productName, fromCart } = router.query;

    if (fromCart === 'true') {
      // Load cart items from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        try {
          const items = JSON.parse(savedCart);
          setCartItems(items);
        } catch (e) {
          console.error('Failed to parse cart:', e);
        }
      }
    } else if (productId && variantId && quantity && amount) {
      // Direct checkout from product page
      const { image, description } = router.query;
      setOrderDetails({
        productId,
        variantId,
        quantity: parseInt(quantity),
        amount: parseFloat(amount),
        productName: productName || 'Product',
        image: image || null,
        description: description || ''
      });
    }
  }, [router.query]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-fetch city and state when pincode is entered (6 digits)
    if (name === 'pincode' && value.length === 6) {
      fetchPincodeDetails(value);
    }
  };

  // Fetch city and state from pincode
  const fetchPincodeDetails = async (pincode) => {
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const data = await response.json();

      if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
        const postOffice = data[0].PostOffice[0];
        setFormData(prev => ({
          ...prev,
          city: postOffice.District,
          state: postOffice.State
        }));
      }
    } catch (error) {
      console.error('Error fetching pincode details:', error);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError('');
    setAppliedCoupon(null);
    setDiscount(0);

    if (couponCode.trim() === '') {
      setCouponError('Please enter a coupon code');
      return;
    }

    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode })
      });

      if (res.ok) {
        const data = await res.json();
        setAppliedCoupon(data); // Store full coupon object: { code, discount_type, discount_value }
      } else {
        const err = await res.json();
        setCouponError(err.detail || 'Invalid Coupon');
      }
    } catch (e) {
      setCouponError('Failed to validate coupon');
    }
  };

  const calculateTotal = () => {
    if (cartItems.length > 0) {
      return cartItems.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);
    } else if (orderDetails) {
      return orderDetails.amount;
    }
    return 0;
  };

  const totalAmount = calculateTotal();
  const COD_CHARGE = 59; // Cash on delivery charges

  // Calculate discounted amount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (totalAmount * appliedCoupon.discount_value) / 100;
    } else if (appliedCoupon.discount_type === 'fixed') {
      discountAmount = appliedCoupon.discount_value;
    } else if (appliedCoupon.discount_type === 'flat_price') {
      // If flat price is 1, essentially discount is Total - 1
      discountAmount = totalAmount - appliedCoupon.discount_value;
    }
  }

  // Calculate final amount
  let finalAmount = totalAmount - discountAmount;
  if (finalAmount < 0) finalAmount = 0;

  if (paymentMethod === 'cod') {
    finalAmount += COD_CHARGE;
  }

  // Handle Razorpay Payment Success
  const handleRazorpaySuccess = async (response) => {
    // Order is already saved in backend through Razorpay webhook/callback
    // Just redirect to success page
    router.push({
      pathname: '/payment-success',
      query: {
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        amount: finalAmount,
        email: formData.email,
        name: formData.name
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validation
    if (!formData.name || !formData.email || !formData.contact || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      setError('Please fill all required fields');
      setIsLoading(false);
      return;
    }

    if (!/^[0-9]{10}$/.test(formData.contact)) {
      setError('Please enter a valid 10-digit mobile number');
      setIsLoading(false);
      return;
    }

    // Prepare order data
    const orderData = cartItems.length > 0
      ? {
        items: cartItems.map(item => ({
          productId: item.productId || item.id,
          productName: item.productName || item.name,
          variantId: item.variant.id,
          variantName: item.variant.name,
          quantity: item.quantity,
          price: item.variant.price,
        })),
        amount: Math.round(finalAmount),
        name: formData.name,
        email: formData.email,
        contact: formData.contact,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        isCartCheckout: true,
        paymentMethod: paymentMethod
      }
      : {
        productId: orderDetails.productId,
        variantId: orderDetails.variantId,
        quantity: orderDetails.quantity,
        amount: Math.round(finalAmount),
        name: formData.name,
        email: formData.email,
        contact: formData.contact,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode,
        paymentMethod: paymentMethod
      };

    if (paymentMethod === 'cod') {
      try {
        const API_URL = getApiUrl();
        const token = localStorage.getItem('customer_token') || localStorage.getItem('token');
        if (!token) {
          setError('Please login to place an order');
          setIsLoading(false);
          // Optionally redirect to login
          // router.push('/login?redirect=/checkout');
          return;
        }

        const response = await fetch(`${API_URL}/api/create-cod-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ...orderData, codCharges: COD_CHARGE })
        });
        const data = await response.json();
        if (response.ok) {
          // Order saved to Supabase backend successfully
          if (cartItems.length > 0) localStorage.removeItem('cart');
          router.push({
            pathname: '/payment-success',
            query: { orderId: data.orderId, amount: finalAmount, codMode: 'true', email: formData.email, name: formData.name }
          });
        } else {
          throw new Error(data.detail || 'Failed to place order');
        }
      } catch (err) {
        setError(err.message);
        setIsLoading(false);
      }
      return;
    }

    // Online Payment (Razorpay)
    try {
      const token = localStorage.getItem('customer_token') || localStorage.getItem('token');
      if (!token) {
        setError('Please login to place an order');
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${getApiUrl()}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.detail || 'Failed to initiate payment');

      console.log('Checkout Session Data:', data);

      if (data && data.key && data.orderId) {
        const options = {
          key: data.key,
          amount: data.amount,
          currency: data.currency,
          name: "Varaha Jewels",
          description: "Purchase from Varaha Jewels",
          image: "/varaha-assets/logo.png",
          order_id: data.orderId,
          handler: handleRazorpaySuccess,
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.contact
          },
          theme: {
            color: "#B76E79" // Copper color
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setIsLoading(false);
      } else {
        console.error('Missing config:', data);
        throw new Error(`Invalid payment configuration. Key: ${data?.key ? 'OK' : 'MISSING'}, OrderId: ${data?.orderId ? 'OK' : 'MISSING'}`);
      }

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (!orderDetails && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-warm-sand flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-heritage mb-4">Your cart is empty</h1>
          <Link href="/shop" className="text-copper underline">Go to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Checkout - Varaha Jewels</title>
      </Head>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <Header />

      <main className="min-h-screen bg-warm-sand py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-royal font-bold text-heritage mb-8">Checkout</h1>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form Section */}
            <div className="bg-white p-8 rounded-sm border border-copper/30">
              <h2 className="text-2xl font-bold text-heritage mb-6">Details</h2>
              {error && <div className="bg-red-50 text-red-600 p-4 mb-4 rounded">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <input name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                  <input name="email" placeholder="Email" value={formData.email} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                  <input name="contact" placeholder="Phone Number" value={formData.contact} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                  <textarea name="address" placeholder="Address" value={formData.address} onChange={handleInputChange} className="p-3 border rounded w-full" required rows={3} />
                  <div className="grid grid-cols-2 gap-4">
                    <input name="city" placeholder="City" value={formData.city} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                    <input name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                    <input name="state" placeholder="State" value={formData.state} onChange={handleInputChange} className="p-3 border rounded w-full" required />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-bold mb-4">Payment Method</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 border rounded cursor-pointer">
                      <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
                      <span>Online (UPI/Cards)</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border rounded cursor-pointer">
                      <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                      <span>Cash on Delivery (+₹{COD_CHARGE})</span>
                    </label>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-4 bg-copper text-white font-bold rounded hover:bg-heritage transition-colors disabled:opacity-50">
                  {isLoading ? 'Processing...' : `Pay ₹${finalAmount}`}
                </button>
              </form>
            </div>

            {/* Summary Section */}
            <div className="bg-white p-8 rounded-sm border border-copper/30 h-fit">
              <h2 className="text-2xl font-bold text-heritage mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto pr-2">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex gap-4 border-b border-copper/10 pb-4 last:border-0">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-copper text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-10">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-heritage text-sm sm:text-base truncate">{item.productName || item.name}</h3>
                      <p className="text-xs text-warm-brown line-clamp-2 mb-1">{item.description}</p>
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs text-gray-500 font-medium">{item.variant.name || item.variant.title}</p>
                        <p className="font-medium text-heritage">₹{(item.variant.price * item.quantity).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {orderDetails && (
                  <div className="flex gap-4 border-b border-copper/10 pb-4 last:border-0">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                      {orderDetails.image ? (
                        <Image
                          src={orderDetails.image}
                          alt={orderDetails.productName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag size={20} />
                        </div>
                      )}
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-copper text-white text-xs rounded-full flex items-center justify-center font-bold shadow-md z-10">
                        {orderDetails.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-heritage text-sm sm:text-base truncate">{orderDetails.productName}</h3>
                      <p className="text-xs text-warm-brown line-clamp-2 mb-1">{orderDetails.description}</p>
                      <div className="flex justify-between items-baseline">
                        <p className="text-xs text-gray-500 font-medium">Quantity: {orderDetails.quantity}</p>
                        <p className="font-medium text-heritage">₹{orderDetails.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Coupon Section */}
              <div className="mb-6 pt-4 border-t border-copper/20">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Coupon Code"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-copper text-sm uppercase"
                      disabled={!!appliedCoupon}
                    />
                  </div>
                  {appliedCoupon ? (
                    <button
                      onClick={() => { setAppliedCoupon(null); setDiscount(0); setCouponCode(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded text-sm hover:bg-gray-300"
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-heritage text-white font-medium rounded text-sm hover:bg-heritage/90 disabled:opacity-50"
                      disabled={!couponCode}
                    >
                      Apply
                    </button>
                  )}
                </div>
                {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-xs text-green-600 mt-1 flex items-center">
                    <Check size={12} className="mr-1" /> Coupon applied!
                  </p>
                )}
              </div>

              <div className="border-t border-copper/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>

                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-gray-600">
                    <span>COD Charges</span>
                    <span>₹{COD_CHARGE}</span>
                  </div>
                )}

                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Discount</span>
                    <span>-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between font-bold text-heritage text-lg pt-2 border-t border-dashed border-gray-300 mt-2">
                  <span>Total</span>
                  <span>₹{Math.round(finalAmount).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
