import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../lib/config';
import AdminLayout from '../../../components/admin/AdminLayout';
import Head from 'next/head';
import { Search, Eye, Filter, Truck } from 'lucide-react';

export default function Orders() {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/orders`);
            if (res.ok) {
                const data = await res.json();
                // Parse items_json
                const processedData = data.map(order => ({
                    ...order,
                    items: order.items_json ? JSON.parse(order.items_json) : []
                }));
                // Sort by date desc
                processedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                setOrders(processedData);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const shipOrder = async (orderId) => {
        if (!confirm('Are you sure you want to ship this order with RapidShyp?')) return;

        try {
            const API_URL = getApiUrl();
            // Using the admin-specific endpoint
            const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/ship`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({}) // Send empty object for defaults
            });

            const data = await res.json();

            if (res.ok) {
                const shipment = data.shipment;
                // Handle case where keys might be camelCase (RapidShyp) or snake_case (our mock)
                // Mock: courierName, awb
                // Real: courierName, awb
                if (shipment.courierName === 'Mock Courier') {
                    alert(`Order shipped (SIMULATION). AWB: ${shipment.awb}`);
                } else {
                    alert(`Order shipped successfully via ${shipment.courierName}! AWB: ${shipment.awb}`);
                }
                fetchOrders(); // Refresh list to show new status
                setSelectedOrder(null); // Close modal
            } else {
                alert(`Failed to ship order: ${data.detail || 'Unknown error'}`);
            }
        } catch (e) {
            console.error(e);
            alert(`Error processing shipping request: ${e.message}`);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AdminLayout>
            <Head>
                <title>Orders - Varaha Admin</title>
            </Head>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tools Bar */}
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper focus:border-transparent"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter size={20} className="text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-copper"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading orders...</td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No orders found</td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm text-copper font-medium">
                                            {order.order_id}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(order.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{order.customer_name}</div>
                                            <div className="text-xs text-gray-500">{order.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                            ₹{order.total_amount?.toLocaleString() || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button
                                                onClick={() => setSelectedOrder(order)}
                                                className="text-gray-400 hover:text-copper transition-colors"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Order Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Order #{selectedOrder.order_id}</h2>
                                <p className="text-sm text-gray-500">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-1 h-5 bg-copper rounded-full"></span> Customer Details
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <p><span className="text-gray-500 w-24 inline-block">Name:</span> {selectedOrder.customer_name}</p>
                                        <p><span className="text-gray-500 w-24 inline-block">Email:</span> {selectedOrder.email}</p>
                                        <p><span className="text-gray-500 w-24 inline-block">Phone:</span> {selectedOrder.phone}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                        <span className="w-1 h-5 bg-copper rounded-full"></span> Shipping Address
                                    </h3>
                                    <div className="space-y-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                        <p>{selectedOrder.address}</p>
                                        {selectedOrder.city && <p>{selectedOrder.city}, {selectedOrder.pincode}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-8">
                                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-copper rounded-full"></span> Order Items
                                </h3>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                                            <tr>
                                                <th className="p-3">Product</th>
                                                <th className="p-3">Variant</th>
                                                <th className="p-3 text-center">Qty</th>
                                                <th className="p-3 text-right">Price</th>
                                                <th className="p-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedOrder.items && selectedOrder.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-medium text-gray-900">{item.name || item.productName}</td>
                                                    <td className="p-3 text-gray-500">{item.variant || item.variantName || '-'}</td>
                                                    <td className="p-3 text-center">{item.quantity}</td>
                                                    <td className="p-3 text-right">₹{item.price.toLocaleString()}</td>
                                                    <td className="p-3 text-right font-medium">₹{(item.price * item.quantity).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Payment Method</span>
                                        <span className="font-medium text-gray-900 uppercase">{selectedOrder.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Payment Status</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${selectedOrder.payment_status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>{selectedOrder.payment_status || 'Pending'}</span>
                                    </div>
                                    <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-900 text-lg">
                                        <span>Total Amount</span>
                                        <span>₹{selectedOrder.total_amount?.toLocaleString()}</span>
                                    </div>

                                    {/* Shipping Action */}
                                    <div className="border-t border-gray-200 pt-4 mt-4">
                                        <h4 className="text-sm font-semibold text-gray-800 mb-2">Shipping</h4>
                                        {selectedOrder.shipping_id ? (
                                            <div className="text-sm bg-emerald-50 text-emerald-800 p-2 rounded-lg">
                                                <p className="font-bold flex items-center gap-1"><Truck size={14} /> Shipped via {selectedOrder.courier_name}</p>
                                                <p>AWB: {selectedOrder.awb_number}</p>
                                                <p className="text-xs mt-1">Ref: {selectedOrder.shipping_id}</p>
                                            </div>
                                        ) : (
                                            selectedOrder.status !== 'cancelled' ? (
                                                <button
                                                    onClick={() => shipOrder(selectedOrder.id)}
                                                    className="w-full py-2 bg-copper text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                                                >
                                                    <Truck size={16} /> Ship with RapidShyp
                                                </button>
                                            ) : <p className="text-sm text-gray-500">Order Cancelled</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
