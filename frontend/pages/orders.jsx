import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/config';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Package, CheckCircle, Clock, XCircle, Search } from 'lucide-react';

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('customer_token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchOrders(token);
  }, [router]);

  const fetchOrders = async (token) => {
    try {
      // Use customer orders API with token - only returns user's own orders
      const response = await fetch(`${getApiUrl()}/api/customer/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns list of orders with flat structure and items_json string
        // We need to adapt it for the UI
        const adaptedOrders = data.map(order => {
          let products = [];
          try {
            products = JSON.parse(order.items_json);
          } catch (e) {
            console.error("Error parsing items_json for order", order.id);
          }

          // UI expects 'product' object for display - let's take the first item
          const mainProduct = products.length > 0 ? products[0] : { name: 'Unknown Product', quantity: 0, variant: 'N/A' };

          return {
            id: order.order_id || order.id,
            status: order.status.toLowerCase(),
            createdAt: order.created_at,
            amount: order.total_amount,
            paymentId: order.payment_status === 'Paid' ? 'Paid Online' : 'Pending', // Simplified
            customer: {
              name: order.customer_name,
              email: order.email,
              contact: order.phone,
              address: order.address
            },
            discount: { couponCode: null, discountAmount: 0 }, // Backend doesn't send this explicitly yet
            product: {
              productName: mainProduct.name,
              quantity: mainProduct.quantity,
              variantId: mainProduct.variant || 'Standard'
            },
            itemCount: products.length
          };
        });

        // Sort by date desc
        adaptedOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setOrders(adaptedOrders);
        setFilteredOrders(adaptedOrders);
      } else if (response.status === 401) {
        // Token expired - redirect to login
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');
        router.push('/login');
      } else {
        console.error("Failed to fetch orders");
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchEmail.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const filtered = orders.filter(order =>
      order.customer.email.toLowerCase().includes(searchEmail.toLowerCase())
    );
    setFilteredOrders(filtered);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'pending':
        return <Clock className="text-yellow-600" size={20} />;
      case 'failed':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Package className="text-heritage" size={20} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <Head>
        <title>My Orders - Varaha Jewels</title>
        <meta name="description" content="View your order history" />
      </Head>

      <Header />

      <main className="min-h-screen bg-warm-sand py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">My Orders</h1>
            <div className="w-20 h-px bg-copper"></div>
          </div>

          {/* Search */}
          <div className="bg-white border border-copper/30 rounded-sm p-6 mb-8">
            <label className="block text-sm font-medium text-heritage mb-2">
              Search by Email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 border border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-copper text-warm-sand font-medium rounded-sm hover:bg-heritage transition-all duration-300 flex items-center gap-2"
              >
                <Search size={20} />
                Search
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-copper border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-heritage/70">Loading orders...</p>
            </div>
          )}

          {/* No Orders */}
          {!loading && filteredOrders.length === 0 && (
            <div className="bg-white border border-copper/30 rounded-sm p-12 text-center">
              <Package className="mx-auto mb-4 text-heritage/50" size={64} />
              <h2 className="text-2xl font-royal font-bold text-heritage mb-2">No Orders Found</h2>
              <p className="text-heritage/70 mb-6">
                {searchEmail ? 'No orders found for this email.' : "You haven't placed any orders yet."}
              </p>
              <Link
                href="/"
                className="inline-block px-8 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all duration-300"
              >
                Start Shopping
              </Link>
            </div>
          )}

          {/* Orders List */}
          {!loading && filteredOrders.length > 0 && (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-copper/30 rounded-sm p-6 hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b border-copper/30">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-heritage">Order #{order.id}</h3>
                        <span className={`px-3 py-1 text-xs font-medium border rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-heritage/60">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="mt-4 md:mt-0 text-left md:text-right">
                      <p className="text-2xl font-royal font-bold text-copper">
                        ₹{order.amount.toLocaleString('en-IN')}
                      </p>
                      {order.discount.couponCode && (
                        <p className="text-xs text-green-600 mt-1">
                          Saved ₹{order.discount.discountAmount.toLocaleString('en-IN')} with {order.discount.couponCode}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Product Details */}
                    <div>
                      <h4 className="text-sm font-medium text-heritage/70 mb-2">Product Details</h4>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(order.status)}
                        <p className="font-medium text-heritage">{order.product.productName}</p>
                      </div>
                      {order.itemCount > 1 && <p className="text-xs text-heritage/50 italic">+ {order.itemCount - 1} more items</p>}
                      <p className="text-sm text-heritage/60">Quantity: {order.product.quantity}</p>
                      <p className="text-sm text-heritage/60">Variant: {order.product.variantId}</p>
                    </div>

                    {/* Customer Details */}
                    <div>
                      <h4 className="text-sm font-medium text-heritage/70 mb-2">Delivery Information</h4>
                      <p className="text-sm text-heritage mb-1">{order.customer.name}</p>
                      <p className="text-sm text-heritage/60">{order.customer.email}</p>
                      <p className="text-sm text-heritage/60">{order.customer.contact}</p>
                      {order.customer.address && (
                        <p className="text-sm text-heritage/60 mt-2">{order.customer.address}</p>
                      )}
                    </div>
                  </div>

                  {order.paymentId && order.paymentId !== 'Pending' && (
                    <div className="mt-4 pt-4 border-t border-copper/30">
                      <p className="text-xs text-heritage/60">
                        Payment Status: <span className="font-mono">{order.paymentId}</span>
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <Link href={`/orders/${order.id}`} className="px-4 py-2 bg-heritage text-warm-sand text-sm font-medium rounded-sm hover:bg-copper transition-colors">
                      View Details & Track
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {!loading && filteredOrders.length > 0 && (
            <div className="mt-8 bg-white border border-copper/30 rounded-sm p-6">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-3xl font-royal font-bold text-heritage">
                    {filteredOrders.length}
                  </p>
                  <p className="text-sm text-heritage/60 mt-1">Total Orders</p>
                </div>
                <div>
                  <p className="text-3xl font-royal font-bold text-green-600">
                    {filteredOrders.filter(o => o.status === 'completed').length}
                  </p>
                  <p className="text-sm text-heritage/60 mt-1">Completed</p>
                </div>
                <div>
                  <p className="text-3xl font-royal font-bold text-copper">
                    ₹{filteredOrders.reduce((sum, o) => sum + o.amount, 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-sm text-heritage/60 mt-1">Total Spent</p>
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
