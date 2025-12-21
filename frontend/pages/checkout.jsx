import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/config';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ShoppingBag, ArrowLeft, ArrowRight, Lock, CreditCard, Truck, Check, Tag, MapPin, User, Wallet, ChevronLeft } from 'lucide-react';

export default function Checkout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mobile step state (1 = Address, 2 = Payment, 3 = Review)
  const [currentStep, setCurrentStep] = useState(1);

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

  // Step 1 validation errors
  const [stepErrors, setStepErrors] = useState({});

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [discount, setDiscount] = useState(0);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('online');

  // Cart items state
  const [cartItems, setCartItems] = useState([]);
  const [orderDetails, setOrderDetails] = useState(null);

  useEffect(() => {
    const { productId, variantId, quantity, amount, productName, fromCart } = router.query;

    if (fromCart === 'true') {
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

    // Clear error for this field
    if (stepErrors[name]) {
      setStepErrors(prev => ({ ...prev, [name]: null }));
    }

    if (name === 'pincode' && value.length === 6) {
      fetchPincodeDetails(value);
    }
  };

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
        setAppliedCoupon(data);
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
  const COD_CHARGE = 59;

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === 'percentage') {
      discountAmount = (totalAmount * appliedCoupon.discount_value) / 100;
    } else if (appliedCoupon.discount_type === 'fixed') {
      discountAmount = appliedCoupon.discount_value;
    } else if (appliedCoupon.discount_type === 'flat_price') {
      discountAmount = totalAmount - appliedCoupon.discount_value;
    }
  }

  let finalAmount = totalAmount - discountAmount;
  if (finalAmount < 0) finalAmount = 0;
  if (paymentMethod === 'cod') {
    finalAmount += COD_CHARGE;
  }

  // Step validation
  const validateStep1 = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.contact.trim()) errors.contact = 'Phone is required';
    else if (!/^[0-9]{10}$/.test(formData.contact)) errors.contact = 'Enter valid 10-digit number';
    if (!formData.address.trim()) errors.address = 'Address is required';
    if (!formData.pincode.trim() || formData.pincode.length !== 6) errors.pincode = 'Valid pincode required';
    if (!formData.city.trim()) errors.city = 'City is required';
    if (!formData.state.trim()) errors.state = 'State is required';

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
        window.scrollTo(0, 0);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // Razorpay Success Handler
  const handleRazorpaySuccess = async (response) => {
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
    if (e) e.preventDefault();
    setIsLoading(true);
    setError(null);

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

    // Online Payment
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
          theme: { color: "#A3562A" }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        setIsLoading(false);
      } else {
        throw new Error('Invalid payment configuration');
      }

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  // Get items to display
  const displayItems = cartItems.length > 0 ? cartItems : (orderDetails ? [orderDetails] : []);

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

  // Step Indicator Component
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[
        { num: 1, label: 'Address', icon: MapPin },
        { num: 2, label: 'Payment', icon: Wallet },
        { num: 3, label: 'Review', icon: Check }
      ].map((step, index) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${currentStep > step.num
              ? 'bg-copper border-copper text-white'
              : currentStep === step.num
                ? 'border-copper text-copper bg-white'
                : 'border-gray-300 text-gray-400 bg-white'
              }`}>
              {currentStep > step.num ? <Check size={18} /> : <step.icon size={18} />}
            </div>
            <span className={`text-xs mt-1 font-medium ${currentStep >= step.num ? 'text-heritage' : 'text-gray-400'
              }`}>{step.label}</span>
          </div>
          {index < 2 && (
            <div className={`w-12 h-0.5 mx-2 ${currentStep > step.num ? 'bg-copper' : 'bg-gray-300'
              }`} />
          )}
        </div>
      ))}
    </div>
  );

  // Mobile Step 1: Address
  const renderAddressStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-heritage flex items-center gap-2">
        <MapPin size={20} className="text-copper" />
        Delivery Address
      </h2>

      <div className="space-y-3">
        <div>
          <input
            name="name"
            placeholder="Full Name *"
            value={formData.name}
            onChange={handleInputChange}
            className={`p-3 border rounded-lg w-full bg-white ${stepErrors.name ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stepErrors.name && <p className="text-xs text-red-500 mt-1">{stepErrors.name}</p>}
        </div>

        <div>
          <input
            name="email"
            type="email"
            placeholder="Email Address *"
            value={formData.email}
            onChange={handleInputChange}
            className={`p-3 border rounded-lg w-full bg-white ${stepErrors.email ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stepErrors.email && <p className="text-xs text-red-500 mt-1">{stepErrors.email}</p>}
        </div>

        <div>
          <input
            name="contact"
            type="tel"
            placeholder="Phone Number *"
            value={formData.contact}
            onChange={handleInputChange}
            className={`p-3 border rounded-lg w-full bg-white ${stepErrors.contact ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stepErrors.contact && <p className="text-xs text-red-500 mt-1">{stepErrors.contact}</p>}
        </div>

        <div>
          <textarea
            name="address"
            placeholder="Full Address (House No, Street, Landmark) *"
            value={formData.address}
            onChange={handleInputChange}
            rows={3}
            className={`p-3 border rounded-lg w-full bg-white ${stepErrors.address ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stepErrors.address && <p className="text-xs text-red-500 mt-1">{stepErrors.address}</p>}
        </div>

        <div>
          <input
            name="pincode"
            placeholder="Pincode *"
            value={formData.pincode}
            onChange={handleInputChange}
            maxLength={6}
            className={`p-3 border rounded-lg w-full bg-white ${stepErrors.pincode ? 'border-red-500' : 'border-gray-300'}`}
          />
          {stepErrors.pincode && <p className="text-xs text-red-500 mt-1">{stepErrors.pincode}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <input
              name="city"
              placeholder="City *"
              value={formData.city}
              onChange={handleInputChange}
              className={`p-3 border rounded-lg w-full bg-white ${stepErrors.city ? 'border-red-500' : 'border-gray-300'}`}
            />
            {stepErrors.city && <p className="text-xs text-red-500 mt-1">{stepErrors.city}</p>}
          </div>
          <div>
            <input
              name="state"
              placeholder="State *"
              value={formData.state}
              onChange={handleInputChange}
              className={`p-3 border rounded-lg w-full bg-white ${stepErrors.state ? 'border-red-500' : 'border-gray-300'}`}
            />
            {stepErrors.state && <p className="text-xs text-red-500 mt-1">{stepErrors.state}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  // Mobile Step 2: Payment Method
  const renderPaymentStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-heritage flex items-center gap-2">
        <Wallet size={20} className="text-copper" />
        Payment Method
      </h2>

      <div className="space-y-3">
        <label
          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'online' ? 'border-copper bg-copper/5' : 'border-gray-200 bg-white'
            }`}
        >
          <input
            type="radio"
            name="payment"
            value="online"
            checked={paymentMethod === 'online'}
            onChange={() => setPaymentMethod('online')}
            className="w-5 h-5 text-copper"
          />
          <div className="flex-1">
            <div className="font-semibold text-heritage">Online Payment</div>
            <div className="text-xs text-matte-brown">UPI, Credit/Debit Cards, Net Banking</div>
          </div>
          <CreditCard size={24} className="text-copper" />
        </label>

        <label
          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-copper bg-copper/5' : 'border-gray-200 bg-white'
            }`}
        >
          <input
            type="radio"
            name="payment"
            value="cod"
            checked={paymentMethod === 'cod'}
            onChange={() => setPaymentMethod('cod')}
            className="w-5 h-5 text-copper"
          />
          <div className="flex-1">
            <div className="font-semibold text-heritage">Cash on Delivery</div>
            <div className="text-xs text-matte-brown">+₹{COD_CHARGE} handling charges</div>
          </div>
          <Truck size={24} className="text-copper" />
        </label>
      </div>

      {/* Coupon Section */}
      <div className="pt-4 border-t border-copper/20 mt-4">
        <h3 className="font-semibold text-heritage mb-3 flex items-center gap-2">
          <Tag size={18} className="text-copper" />
          Have a Coupon?
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              className="w-full p-3 border border-gray-300 rounded-lg uppercase bg-white"
              disabled={!!appliedCoupon}
            />
          </div>
          {appliedCoupon ? (
            <button
              onClick={() => { setAppliedCoupon(null); setCouponCode(''); }}
              className="px-4 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg"
            >
              Remove
            </button>
          ) : (
            <button
              onClick={handleApplyCoupon}
              className="px-4 py-3 bg-copper text-white font-semibold rounded-lg"
              disabled={!couponCode}
            >
              Apply
            </button>
          )}
        </div>
        {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
        {appliedCoupon && (
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <Check size={12} /> Coupon applied! You save ₹{discountAmount.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );

  // Mobile Step 3: Review & Pay
  const renderReviewStep = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-heritage flex items-center gap-2">
        <ShoppingBag size={20} className="text-copper" />
        Order Summary
      </h2>

      {/* Delivery Address Summary */}
      <div className="bg-white p-4 rounded-lg border border-copper/20">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-heritage text-sm">Delivering to</h3>
          <button onClick={() => setCurrentStep(1)} className="text-xs text-copper font-semibold">Edit</button>
        </div>
        <p className="text-sm text-matte-brown">{formData.name}</p>
        <p className="text-xs text-matte-brown">{formData.address}</p>
        <p className="text-xs text-matte-brown">{formData.city}, {formData.state} - {formData.pincode}</p>
        <p className="text-xs text-matte-brown mt-1">📞 {formData.contact}</p>
      </div>

      {/* Payment Method Summary */}
      <div className="bg-white p-4 rounded-lg border border-copper/20">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-heritage text-sm">Payment</h3>
          <button onClick={() => setCurrentStep(2)} className="text-xs text-copper font-semibold">Edit</button>
        </div>
        <p className="text-sm text-matte-brown flex items-center gap-2">
          {paymentMethod === 'cod' ? <Truck size={16} /> : <CreditCard size={16} />}
          {paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
        </p>
      </div>

      {/* Products */}
      <div className="bg-white p-4 rounded-lg border border-copper/20">
        <h3 className="font-semibold text-heritage text-sm mb-3">Items ({displayItems.length})</h3>
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {cartItems.map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="relative w-14 h-14 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {item.image ? (
                  <Image src={item.image} alt={item.productName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-heritage truncate">{item.productName || item.name}</p>
                <p className="text-xs text-matte-brown">Qty: {item.quantity}</p>
                <p className="text-sm font-semibold text-heritage">₹{(item.variant.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {orderDetails && (
            <div className="flex gap-3">
              <div className="relative w-14 h-14 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                {orderDetails.image ? (
                  <Image src={orderDetails.image} alt={orderDetails.productName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <ShoppingBag size={16} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-heritage truncate">{orderDetails.productName}</p>
                <p className="text-xs text-matte-brown">Qty: {orderDetails.quantity}</p>
                <p className="text-sm font-semibold text-heritage">₹{orderDetails.amount.toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-white p-4 rounded-lg border border-copper/20">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-matte-brown">
            <span>Subtotal</span>
            <span>₹{totalAmount.toLocaleString()}</span>
          </div>
          {paymentMethod === 'cod' && (
            <div className="flex justify-between text-matte-brown">
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
          <div className="flex justify-between font-bold text-heritage text-lg pt-2 border-t border-dashed mt-2">
            <span>Total</span>
            <span>₹{Math.round(finalAmount).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
    </div>
  );

  return (
    <>
      <Head>
        <title>Checkout - Varaha Jewels</title>
      </Head>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-50 bg-white border-b border-copper/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => currentStep > 1 ? prevStep() : router.back()} className="p-2 -ml-2">
            <ChevronLeft size={24} className="text-heritage" />
          </button>
          <h1 className="text-lg font-bold text-heritage">Checkout</h1>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block">
        <Header />
      </div>

      <main className="min-h-screen bg-warm-sand pb-24 lg:pb-0 lg:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Title */}
          <h1 className="hidden lg:block text-4xl font-royal font-bold text-heritage mb-8">Checkout</h1>

          {/* Mobile Step Indicator */}
          <div className="lg:hidden py-4">
            {renderStepIndicator()}
          </div>

          {/* Mobile Steps */}
          <div className="lg:hidden">
            {currentStep === 1 && renderAddressStep()}
            {currentStep === 2 && renderPaymentStep()}
            {currentStep === 3 && renderReviewStep()}
          </div>

          {/* Desktop Layout (unchanged side-by-side) */}
          <div className="hidden lg:grid lg:grid-cols-2 gap-12">
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
                  {isLoading ? 'Processing...' : `Pay ₹${Math.round(finalAmount).toLocaleString()}`}
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
                        <Image src={item.image} alt={item.productName} fill className="object-cover" />
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
                        <Image src={orderDetails.image} alt={orderDetails.productName} fill className="object-cover" />
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

      {/* Mobile Sticky Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-copper/20 px-4 py-3 z-40 safe-area-inset-bottom">
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              onClick={prevStep}
              className="flex items-center justify-center gap-1 px-4 py-3 border-2 border-copper/50 rounded-lg text-heritage font-semibold"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-copper text-white font-bold rounded-lg"
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-copper text-white font-bold rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : `Pay ₹${Math.round(finalAmount).toLocaleString()}`}
              <Lock size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Desktop Footer */}
      <div className="hidden lg:block">
        <Footer />
      </div>
    </>
  );
}
