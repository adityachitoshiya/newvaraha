import { useState, useEffect } from 'react';
import { getApiUrl } from '../../lib/config';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/admin/AdminLayout';
import { Bell, Check, Clock, ShoppingBag } from 'lucide-react';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/notifications?limit=50`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const markAsRead = async (id) => {
        try {
            const API_URL = getApiUrl();
            const response = await fetch(`${API_URL}/api/notifications/${id}/read`, {
                method: 'POST',
            });
            if (response.ok) {
                // Update local state
                setNotifications(prev =>
                    prev.map(n => n.id === id ? { ...n, is_read: true } : n)
                );
                // Dispatch event to update Header badge
                window.dispatchEvent(new Event('notificationRead'));
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        // For now, iterate (ideal would be a backend endpoint for batch update)
        const unread = notifications.filter(n => !n.is_read);
        for (const n of unread) {
            await markAsRead(n.id);
        }
    };

    const getTimeAgo = (dateStr) => {
        const date = new Date(dateStr + 'Z'); // Ensure UTC
        const now = new Date();
        const headers = Math.floor((now - date) / 1000);

        if (headers < 60) return 'Just now';
        if (headers < 3600) return `${Math.floor(headers / 60)}m ago`;
        if (headers < 86400) return `${Math.floor(headers / 3600)}h ago`;
        return `${Math.floor(headers / 86400)}d ago`;
    };

    return (
        <AdminLayout>
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
                        <p className="text-gray-500">Stay updated with latest orders and alerts</p>
                    </div>
                    <button
                        onClick={markAllAsRead}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-heritage"></div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                        <p className="text-gray-500 mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`p-4 sm:p-6 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${!notification.is_read ? 'bg-copper text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            <ShoppingBag className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <p className={`text-sm font-medium ${!notification.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {notification.message}
                                                </p>
                                                <span className="flex items-center text-xs text-gray-500 whitespace-nowrap ml-4">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    {getTimeAgo(notification.created_at)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="text-xs text-gray-500">
                                                    ID: #{notification.order_id}
                                                </div>
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className="text-xs text-copper hover:text-heritage font-medium flex items-center gap-1 transition-colors"
                                                    >
                                                        Mark as read
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
