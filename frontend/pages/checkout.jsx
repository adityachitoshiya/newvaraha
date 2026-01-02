import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // Import portal
import { getApiUrl } from '../lib/config';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script'; // Import Script for Razorpay
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShoppingBag, ArrowLeft, Lock, CreditCard, Truck, Check, Tag, ChevronDown } from 'lucide-react';

export default function Checkout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false); // Mounted state for portal

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

  // Handle mounting for Portals
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

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
    let sanitizedValue = value;

    // Validate based on field type
    if (name === 'name') {
      // Only allow letters and spaces for name
      sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
    } else if (name === 'contact') {
      // Allow digits, + sign at start for country code
      // Remove all non-digit characters except + at start
      if (value.startsWith('+')) {
        sanitizedValue = '+' + value.slice(1).replace(/[^0-9]/g, '');
      } else {
        sanitizedValue = value.replace(/[^0-9]/g, '');
      }
    } else if (name === 'pincode') {
      // Only digits for pincode
      sanitizedValue = value.replace(/[^0-9]/g, '');
    } else if (name === 'city' || name === 'state') {
      // Only letters and spaces for city and state
      sanitizedValue = value.replace(/[^a-zA-Z\s]/g, '');
    }
    // Address allows all characters

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Auto-fetch city and state when pincode is entered (6 digits)
    if (name === 'pincode' && sanitizedValue.length === 6) {
      fetchPincodeDetails(sanitizedValue);
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
      const res = await fetch(`${API_URL}/api/coupons/param/${couponCode}`);

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

    // Phone validation: 10 digits, or 0+10 digits, or +91+10 digits
    const phoneRegex = /^(\+91[0-9]{10}|0[0-9]{10}|[0-9]{10})$/;
    if (!phoneRegex.test(formData.contact)) {
      setError('Please enter a valid mobile number (10 digits, or with 0 or +91 prefix)');
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
        // Guest Checkout Allowed - No forced login check


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
      // Guest Checkout Allowed - No forced login check


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

  const [currentStep, setCurrentStep] = useState(1); // 1: Address, 2: Order Summary/Coupon, 3: Payment
  const [isOrderSummaryOpen, setIsOrderSummaryOpen] = useState(false);

  const handleValidation = () => {
    if (!formData.name || !formData.email || !formData.contact || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      setError('Please fill all required fields');
      return false;
    }
    // Phone validation: 10 digits, or 0+10 digits, or +91+10 digits
    const phoneRegex = /^(\+91[0-9]{10}|0[0-9]{10}|[0-9]{10})$/;
    if (!phoneRegex.test(formData.contact)) {
      setError('Please enter a valid mobile number (10 digits, or with 0 or +91 prefix)');
      return false;
    }
    setError(null);
    return true;
  };

  const handleContinueToStep2 = () => {
    if (handleValidation()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleContinueToStep3 = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
        <title>Checkout - Varaha Jewels</title>
      </Head>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Simplified Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/varaha-assets/logo.png" alt="Varaha" width={100} height={30} className="h-6 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button onClick={() => setCurrentStep(currentStep - 1)} className="text-sm text-heritage font-medium flex items-center gap-1">
              ← Back
            </button>
          )}
        </div>
      </div>

      <div className="hidden lg:block">
        <Header />
      </div>

      <main className="min-h-screen bg-warm-sand/30 pb-32 lg:pb-16 lg:pt-12">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">


          <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start lg:pt-0">

            {/* LEFT COLUMN: Main Process */}
            <div className="lg:col-span-7 bg-white lg:rounded-2xl lg:shadow-sm lg:p-8 px-4 py-6">

              {/* Desktop Details Heading */}
              <h1 className="hidden lg:block text-3xl font-royal font-bold text-heritage mb-8">Checkout</h1>

              {/* Steps Indicator (Mobile 3-step) */}
              <div className="lg:hidden flex items-center justify-center gap-1 text-xs font-medium text-gray-400 mb-6">
                <span className={`flex items-center gap-1 ${currentStep >= 1 ? 'text-copper font-semibold' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${currentStep >= 1 ? 'bg-copper text-white' : 'bg-gray-200'}`}>1</span>
                  Address
                </span>
                <span className="text-gray-300">—</span>
                <span className={`flex items-center gap-1 ${currentStep >= 2 ? 'text-copper font-semibold' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${currentStep >= 2 ? 'bg-copper text-white' : 'bg-gray-200'}`}>2</span>
                  Summary
                </span>
                <span className="text-gray-300">—</span>
                <span className={`flex items-center gap-1 ${currentStep >= 3 ? 'text-copper font-semibold' : ''}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${currentStep >= 3 ? 'bg-copper text-white' : 'bg-gray-200'}`}>3</span>
                  Payment
                </span>
              </div>

              {/* Desktop Steps Indicator */}
              <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-gray-500 mb-8">
                <span className={`${currentStep >= 1 ? 'text-copper' : ''}`}>Shipping</span>
                <span className="text-gray-300">/</span>
                <span className={`${currentStep >= 2 ? 'text-copper' : ''}`}>Payment</span>
              </div>

              {error && <div className="bg-red-50 text-red-600 p-4 mb-6 rounded-lg text-sm border border-red-100 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-red-500" /> {error}
              </div>}

              {/* STEP 1: ADDRESS (Mobile Step 1) */}
              <div className={currentStep === 1 ? 'block animate-fadeIn' : 'hidden lg:block lg:opacity-50 lg:pointer-events-none'}>
                <h2 className="text-xl font-bold text-heritage mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-heritage text-white flex items-center justify-center text-sm">1</span>
                  Contact & Shipping
                </h2>

                <form onSubmit={(e) => { e.preventDefault(); handleContinueToStep2(); }} className="space-y-5">
                  {/* Modern Floating Inputs or Clean Border Inputs */}
                  <div className="space-y-4">
                    <input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />

                    <div className="grid grid-cols-1 gap-4">
                      <input name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />
                      <input name="contact" type="tel" placeholder="Phone Number" value={formData.contact} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />
                    </div>

                    <input name="address" placeholder="Address (House No, Street)" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />

                    <div className="grid grid-cols-2 gap-4">
                      <input name="pincode" placeholder="Pincode" value={formData.pincode} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />
                      <input name="city" placeholder="City" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />
                    </div>
                    <input name="state" placeholder="State" value={formData.state} onChange={handleInputChange} className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-copper focus:ring-1 focus:ring-copper outline-none transition-all" required />
                  </div>
                </form>
              </div>

              {/* STEP 2: ORDER SUMMARY & COUPON (Mobile Only) */}
              <div className={`lg:hidden mt-8 ${currentStep === 2 ? 'block animate-fadeIn' : 'hidden'}`}>
                <h2 className="text-xl font-bold text-heritage mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-heritage text-white flex items-center justify-center text-sm">2</span>
                  Order Summary
                </h2>

                {/* Cart Items */}
                <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
                  {(cartItems.length > 0 ? cartItems : (orderDetails ? [{
                    image: orderDetails.image,
                    productName: orderDetails.productName,
                    quantity: orderDetails.quantity,
                    variant: { name: 'Standard', price: orderDetails.amount / orderDetails.quantity }
                  }] : [])).map((item, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="relative w-16 h-16 bg-white rounded-lg border border-gray-100 overflow-hidden flex-shrink-0">
                        {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" />}
                        <span className="absolute top-0 right-0 bg-copper/90 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-bl-lg font-bold">{item.quantity}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-heritage truncate">{item.productName || item.name}</p>
                        <p className="text-xs text-gray-500">{item.variant?.name || 'Standard'}</p>
                      </div>
                      <p className="text-sm font-medium text-heritage">₹{(item.variant?.price * item.quantity || 0).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Coupon Code */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-heritage mb-3 flex items-center gap-2">
                    <Tag size={16} /> Apply Discount Code
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !appliedCoupon) {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter Discount Code"
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-copper text-sm uppercase"
                      disabled={!!appliedCoupon}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (appliedCoupon) {
                          setAppliedCoupon(null);
                          setDiscount(0);
                          setCouponCode('');
                        } else {
                          handleApplyCoupon();
                        }
                      }}
                      className={`px-5 py-3 rounded-lg text-sm font-medium transition-colors ${appliedCoupon ? 'bg-gray-200 text-gray-700' : 'bg-heritage text-white active:bg-heritage/90'}`}
                    >
                      {appliedCoupon ? 'Remove' : 'Apply'}
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                  {appliedCoupon && <p className="text-xs text-green-600 mt-2 flex items-center"><Check size={12} className="mr-1" /> Code applied successfully!</p>}
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-2 p-4 bg-copper/5 rounded-xl text-sm">
                  <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{totalAmount.toLocaleString()}</span></div>
                  {appliedCoupon && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discountAmount.toLocaleString()}</span></div>}
                  <div className="flex justify-between font-bold text-heritage text-base pt-2 border-t border-copper/20"><span>Total</span><span>₹{Math.round(totalAmount - discountAmount).toLocaleString()}</span></div>
                </div>

                {/* Estimated Delivery */}
                <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex items-center gap-3">
                    <Truck size={20} className="text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Estimated Delivery</p>
                      <p className="text-xs text-green-600">
                        {(() => {
                          const today = new Date();
                          const minDate = new Date(today);
                          const maxDate = new Date(today);
                          minDate.setDate(today.getDate() + 5);
                          maxDate.setDate(today.getDate() + 7);
                          const options = { day: 'numeric', month: 'short' };
                          return `${minDate.toLocaleDateString('en-IN', options)} - ${maxDate.toLocaleDateString('en-IN', options)}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 3: PAYMENT (Mobile) / STEP 2: PAYMENT (Desktop) */}
              <div className={`mt-8 ${currentStep === 3 ? 'block animate-fadeIn lg:block' : currentStep === 2 ? 'hidden lg:block' : 'hidden lg:block'}`}>
                <h2 className="text-xl font-bold text-heritage mb-5 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-heritage text-white flex items-center justify-center text-sm lg:hidden">3</span>
                  <span className="w-7 h-7 rounded-full bg-heritage text-white flex items-center justify-center text-sm hidden lg:flex">2</span>
                  Payment Method
                </h2>

                <div className="space-y-3">
                  <label className={`relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'online' ? 'border-copper bg-copper/5 ring-1 ring-copper' : 'border-gray-200 hover:border-copper/50'}`}>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white">
                      {paymentMethod === 'online' && <div className="w-2.5 h-2.5 rounded-full bg-copper" />}
                    </div>
                    <input type="radio" name="payment" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="hidden" />
                    <div className="flex-1">
                      <span className="font-semibold text-heritage block">Online Payment</span>
                      <span className="text-xs text-gray-500">UPI, Credit/Debit Card, Netbanking</span>
                    </div>
                    <CreditCard size={20} className="text-heritage/60" />
                  </label>

                  <label className={`relative flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-copper bg-copper/5 ring-1 ring-copper' : 'border-gray-200 hover:border-copper/50'}`}>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 bg-white">
                      {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 rounded-full bg-copper" />}
                    </div>
                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" />
                    <div className="flex-1">
                      <span className="font-semibold text-heritage block">Cash on Delivery</span>
                      <span className="text-xs text-gray-500">Add ₹{COD_CHARGE} for COD handling</span>
                    </div>
                    <Truck size={20} className="text-heritage/60" />
                  </label>
                </div>

                {/* Secure Badge */}
                <div className="flex items-center gap-2 justify-center mt-6 text-xs text-gray-400">
                  <Lock size={12} />
                  <span>Payments are SSL encrypted and 100% secure</span>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Desktop Summary (Hidden on Mobile) */}
            <div className="hidden lg:block lg:col-span-5 bg-white lg:rounded-2xl lg:shadow-sm lg:p-8 bg-gray-50 h-fit">
              <h2 className="text-xl font-bold text-heritage mb-6">Order Summary</h2>
              {/* Desktop Product List */}
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item, i) => (
                  <div key={i} className="flex gap-4 py-2">
                    <div className="relative w-16 h-16 bg-white rounded-md border border-gray-200 overflow-hidden flex-shrink-0">
                      {item.image && <Image src={item.image} alt={item.productName} fill className="object-cover" />}
                      <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-heritage">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.variant.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-heritage">₹{(item.variant.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Coupon Desktop */}
              <div className="mb-6 pt-4 border-t border-dashed border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="Discount Code"
                    className="bg-white flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-copper text-sm uppercase"
                    disabled={!!appliedCoupon}
                  />
                  <button
                    onClick={appliedCoupon ? () => { setAppliedCoupon(null); setDiscount(0); setCouponCode(''); } : handleApplyCoupon}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${appliedCoupon ? 'bg-gray-200 text-gray-700' : 'bg-heritage text-white hover:bg-heritage/90'}`}
                  >
                    {appliedCoupon ? 'Remove' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                {appliedCoupon && <p className="text-xs text-green-600 mt-2 flex items-center"><Check size={12} className="mr-1" /> Code applied!</p>}
              </div>

              {/* Breakdown Desktop */}
              <div className="space-y-3 pt-4 border-t border-gray-200 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{totalAmount.toLocaleString()}</span></div>
                {paymentMethod === 'cod' && <div className="flex justify-between text-gray-600"><span>COD Charges</span><span>₹{COD_CHARGE}</span></div>}
                {appliedCoupon && <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discountAmount.toLocaleString()}</span></div>}
                <div className="flex justify-between font-bold text-heritage text-xl pt-4"><span>Total</span><span>₹{Math.round(finalAmount).toLocaleString()}</span></div>
              </div>
            </div>

          </div>
        </div>

        {/* STICKY BOTTOM ACTION BAR (Mobile Only) - Portaled to escape Stacking Context */}
        {mounted && createPortal(
          <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-[9999]">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500">Total to Pay</p>
                <p className="text-lg font-bold text-heritage">₹{Math.round(finalAmount).toLocaleString()}</p>
              </div>
              {currentStep === 1 ? (
                <button
                  onClick={handleContinueToStep2}
                  className="bg-heritage text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-heritage/20 active:scale-95 transition-transform"
                >
                  Continue
                </button>
              ) : currentStep === 2 ? (
                <button
                  onClick={handleContinueToStep3}
                  className="bg-heritage text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-heritage/20 active:scale-95 transition-transform"
                >
                  Continue to Payment
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-royal-orange text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-royal-orange/20 active:scale-95 transition-transform disabled:opacity-70 disabled:scale-100 flex items-center gap-2"
                >
                  {isLoading ? 'Processing...' : 'Place Order'}
                </button>
              )}
            </div>
          </div>,
          document.body
        )}

      </main>

      {/* Footer only on Desktop or simple version */}
      <div className="hidden lg:block">
        <Footer />
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 4px;
        }
      `}</style>
    </>
  );
}
