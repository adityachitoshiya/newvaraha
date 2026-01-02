import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { TrendingUp, ShoppingCart, DollarSign, Package, Clock, ArrowUpRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalOrders: 0,
        totalProducts: 0,
        pendingOrders: 0
    });
    const [recentOrders, setRecentOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const API_URL = getApiUrl();
            const ordersRes = await fetch(`${API_URL}/api/orders`);
            const orders = ordersRes.ok ? await ordersRes.json() : [];

            const productsRes = await fetch(`${API_URL}/api/products`);
            const products = productsRes.ok ? await productsRes.json() : [];

            const totalSales = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            const pending = orders.filter(o => o.status === 'pending').length;

            setStats({
                totalSales,
                totalOrders: orders.length,
                totalProducts: products.length,
                pendingOrders: pending
            });

            setRecentOrders(orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Revenue',
            value: `₹${stats.totalSales.toLocaleString()}`,
            icon: DollarSign,
            gradient: 'from-emerald-500 to-teal-400',
            shadow: 'shadow-emerald-200'
        },
        {
            title: 'Total Orders',
            value: stats.totalOrders,
            icon: ShoppingCart,
            gradient: 'from-blue-500 to-cyan-400',
            shadow: 'shadow-blue-200'
        },
        {
            title: 'Products',
            value: stats.totalProducts,
            icon: Package,
            gradient: 'from-violet-500 to-purple-400',
            shadow: 'shadow-purple-200'
        },
        {
            title: 'Pending',
            value: stats.pendingOrders,
            icon: Clock,
            gradient: 'from-amber-500 to-orange-400',
            shadow: 'shadow-orange-200'
        },
    ];

    return (
        <AdminLayout>
            <Head>
                <title>Dashboard - Varaha Admin</title>
            </Head>

            <div className="mb-10">
                <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Overview</h1>
                <p className="text-gray-500 mt-1">Here's what's happening with your store today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {statCards.map((stat, index) => (
                    <div key={index} className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{isLoading ? '-' : stat.value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg ${stat.shadow}`}>
                                <stat.icon size={22} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm">
                            <span className="text-emerald-500 flex items-center font-medium">
                                <ArrowUpRight size={16} className="mr-1" />
                                +12%
                            </span>
                            <span className="text-gray-400 ml-2">from last month</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Orders Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                        <Link href="/admin/orders" className="text-sm font-medium text-copper hover:text-amber-700 transition-colors">
                            View All
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoading ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading data...</td></tr>
                                ) : recentOrders.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No recent orders found</td></tr>
                                ) : (
                                    recentOrders.map(order => (
                                        <tr key={order.id} className="hover:bg-gray-50/80 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm font-medium text-gray-900 group-hover:text-copper transition-colors">
                                                    {order.order_id || `#${order.id}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 mr-3">
                                                        {order.customer_name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900">{order.customer_name}</p>
                                                        <p className="text-xs text-gray-400">{order.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        'bg-gray-50 text-gray-700 border border-gray-200'
                                                    }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${order.status === 'completed' ? 'bg-emerald-500' :
                                                        order.status === 'pending' ? 'bg-amber-500' :
                                                            'bg-gray-400'
                                                        }`}></span>
                                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="text-sm font-bold text-gray-900">
                                                    ₹{order.total_amount?.toLocaleString() || 0}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link href="/admin/products/new" className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-copper/30 hover:bg-copper/5 transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-copper/10 text-copper flex items-center justify-center group-hover:bg-copper group-hover:text-white transition-all">
                                <Package size={20} />
                            </div>
                            <div className="ml-4">
                                <p className="text-sm font-bold text-gray-900">Add New Product</p>
                                <p className="text-xs text-gray-500">Create a listing</p>
                            </div>
                            <ArrowUpRight size={18} className="ml-auto text-gray-300 group-hover:text-copper" />
                        </Link>

                        <Link href="/admin/reports" className="w-full flex items-center p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all group">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <TrendingUp size={20} />
                            </div>
                            <div className="ml-4 text-left">
                                <p className="text-sm font-bold text-gray-900">View Reports</p>
                                <p className="text-xs text-gray-500">Sales analysis</p>
                            </div>
                            <ArrowUpRight size={18} className="ml-auto text-gray-300 group-hover:text-blue-600" />
                        </Link>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-semibold text-gray-900">System Status</h4>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">All Systems Normal</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Server Usage</span>
                                    <span>24%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '24%' }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Database Storage</span>
                                    <span>45%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
