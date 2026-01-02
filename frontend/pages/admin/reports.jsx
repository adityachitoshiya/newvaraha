import AdminLayout from '../../components/admin/AdminLayout';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Download } from 'lucide-react';
import Head from 'next/head';

export default function Reports() {
    const [loading, setLoading] = useState(true);

    // Mock data for now, ideally fetch from /api/stats or calculate from /api/orders
    useEffect(() => {
        setTimeout(() => setLoading(false), 1000);
    }, []);

    return (
        <AdminLayout>
            <Head>
                <title>Reports & Analytics | Admin</title>
            </Head>

            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 font-serif">Reports & Analytics</h1>
                        <p className="text-gray-500 mt-1">Detailed breakdown of your store's performance</p>
                    </div>
                    <div className="flex gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                            <Calendar size={16} />
                            <span>Last 30 Days</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:bg-copper/90 transition-colors shadow-sm">
                            <Download size={16} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+12.5%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">₹45,231</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <BarChart3 size={20} />
                            </div>
                            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+5.2%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Orders</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">156</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Calendar size={20} />
                            </div>
                            <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">-2.4%</span>
                        </div>
                        <h3 className="text-sm font-medium text-gray-500">Avg. Order Value</h3>
                        <p className="text-2xl font-bold text-gray-900 mt-1">₹2,450</p>
                    </div>
                </div>

                {/* Placeholder for Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[400px] flex items-center justify-center text-gray-400">
                    <div className="text-center">
                        <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                        <p>Detailed Sales Chart functionality coming soon...</p>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
