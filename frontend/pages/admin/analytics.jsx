import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import AdminLayout from '../../components/admin/AdminLayout';
import Head from 'next/head';
import { Users, Activity, Calendar, TrendingUp } from 'lucide-react';

export default function Analytics() {
    const [stats, setStats] = useState({
        active_users: 0,
        daily_stats: [],
        total_visits: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
        // Auto-refresh every 30 seconds for live feel
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchAnalytics = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/analytics`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AdminLayout>
            <Head>
                <title>Analytics - Varaha Admin</title>
            </Head>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">Traffic Analytics</h1>
                <p className="text-gray-500">Real-time visitor tracking & insights</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Active Users */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Live Active Users</p>
                        <h2 className="text-3xl font-bold text-gray-800 animate-pulse">
                            {stats.active_users}
                        </h2>
                    </div>
                </div>

                {/* Total Visits */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Visits (All Time)</p>
                        <h2 className="text-3xl font-bold text-gray-800">
                            {stats.total_visits}
                        </h2>
                    </div>
                </div>

                {/* Trend (Placeholder) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Growth Limit</p>
                        <h2 className="text-3xl font-bold text-gray-800">--</h2>
                    </div>
                </div>
            </div>

            {/* Charts Section (Simple List for MVP) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Calendar size={20} className="text-gray-500" />
                        Last 30 Days Traffic
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Visits</th>
                                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Trend</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {stats.daily_stats.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="p-8 text-center text-gray-500">
                                        No data yet. Stats will appear here tomorrow.
                                    </td>
                                </tr>
                            ) : (
                                stats.daily_stats.map((day, idx) => (
                                    <tr key={day.date} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-gray-700">{day.date}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-800">{day.visits}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-block w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-copper"
                                                    style={{ width: `${Math.min(100, day.visits * 5)}%` }} // Simple scaling
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
