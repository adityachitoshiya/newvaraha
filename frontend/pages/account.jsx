import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { User, Package, Heart, LogOut, Settings, ChevronUp, ChevronDown, MapPin, Loader2 } from 'lucide-react';
import { getApiUrl } from '../lib/config';
import { supabase } from '../lib/supabaseClient';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Account() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    // Bottom Dropdown State
    const [isMoreOpen, setIsMoreOpen] = useState(false);
    const moreMenuRef = useRef(null);

    useEffect(() => {
        // Auth Check
        const token = localStorage.getItem('customer_token');
        const storedUser = localStorage.getItem('customer_user');

        if (!token || !storedUser) {
            router.push('/login');
            return;
        }

        setUser(JSON.parse(storedUser));
        fetchOrders(token);
    }, [router]);

    const fetchOrders = async (token) => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/customer/orders`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                // Map backend fields to UI fields if necessary, or use directly
                // Backend: id, created_at, status, total_amount, items_json
                const formattedOrders = data.map(order => ({
                    id: order.order_id || `ORD-${order.id}`,
                    date: new Date(order.created_at).toLocaleDateString(),
                    status: order.status,
                    total: `₹${order.total_amount}`,
                    items: JSON.parse(order.items_json).length
                }));
                setOrders(formattedOrders);
            }
        } catch (error) {
            console.error("Failed to fetch orders", error);
        } finally {
            setLoading(false);
        }
    };

    // Handle outside click for bottom menu
    useEffect(() => {
        function handleClickOutside(event) {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
                setIsMoreOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [moreMenuRef]);

    const handleLogout = async () => {
        // Clear local storage
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_user');

        // Also sign out from Supabase (for social login users)
        try {
            await supabase.auth.signOut();
        } catch (err) {
            console.log('Supabase signout error (ignorable):', err);
        }

        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <Loader2 className="animate-spin text-copper" size={40} />
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>My Account | Varaha Jewels</title>
            </Head>
            <Header />
            <div className="min-h-screen bg-[#F8F9FA] pb-24">

                {/* Profile Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col sm:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-copper to-heritage flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                            {(user?.full_name || user?.name)?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="text-center sm:text-left">
                            <h1 className="text-3xl font-bold text-gray-900 font-serif mb-1">{user?.full_name || user?.name}</h1>
                            <p className="text-gray-500 flex items-center justify-center sm:justify-start gap-2">
                                {user?.email}
                            </p>
                            <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                                <span className="px-3 py-1 bg-copper/10 text-copper rounded-full text-xs font-bold uppercase tracking-wider">
                                    Gold Member
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Content */}
                <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

                    {/* Stats / Quick Links */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <Link href="/orders" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-copper/50 hover:shadow-md transition-all text-center group cursor-pointer">
                            <Package className="w-8 h-8 mx-auto text-gray-400 group-hover:text-copper mb-3 transition-colors" />
                            <h3 className="font-semibold text-gray-900">Orders</h3>
                            <p className="text-xs text-gray-500 mt-1">{orders.length} active</p>
                        </Link>
                        <Link href="/wishlist" className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-copper/50 hover:shadow-md transition-all text-center group cursor-pointer">
                            <Heart className="w-8 h-8 mx-auto text-gray-400 group-hover:text-red-500 mb-3 transition-colors" />
                            <h3 className="font-semibold text-gray-900">Wishlist</h3>
                            <p className="text-xs text-gray-500 mt-1">View Saved</p>
                        </Link>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-copper/50 hover:shadow-md transition-all text-center group cursor-pointer">
                            <MapPin className="w-8 h-8 mx-auto text-gray-400 group-hover:text-copper mb-3 transition-colors" />
                            <h3 className="font-semibold text-gray-900">Addresses</h3>
                            <p className="text-xs text-gray-500 mt-1">Manage</p>
                        </div>
                        <div onClick={handleLogout} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-red-200 hover:shadow-md transition-all text-center group cursor-pointer">
                            <LogOut className="w-8 h-8 mx-auto text-gray-400 group-hover:text-red-500 mb-3 transition-colors" />
                            <h3 className="font-semibold text-gray-900 group-hover:text-red-600">Logout</h3>
                            <p className="text-xs text-gray-500 mt-1">Sign out</p>
                        </div>
                    </div>

                    {/* Recent Orders Preview */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="font-bold text-gray-900">Recent Orders</h2>
                            <Link href="/orders" className="text-sm text-copper hover:text-heritage font-medium">View All</Link>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {orders.map(order => (
                                <div key={order.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                    <div>
                                        <p className="font-semibold text-gray-900">{order.id} <span className="text-gray-400 font-normal mx-2">•</span> {order.date}</p>
                                        <p className="text-sm text-gray-500 mt-1">{order.items} Items • {order.total}</p>
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {order.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom "More" Dropdown Area */}
                <div className="fixed bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
                    <div className="relative pointer-events-auto" ref={moreMenuRef}>

                        {/* Dropdown Menu (Appears ABOVE the button) */}
                        <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-56 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 transition-all duration-300 origin-bottom ${isMoreOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
                            }`}>
                            <div className="p-2 space-y-1">
                                <button
                                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <Settings size={18} className="mr-3 text-gray-400 group-hover:text-copper" />
                                    Account Settings
                                </button>
                                <button
                                    className="w-full flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <UsersIcon />
                                    Refer a Friend
                                </button>
                                <div className="h-px bg-gray-100 my-1"></div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <LogOut size={18} className="mr-3" />
                                    Logout
                                </button>
                            </div>
                            {/* Little triangle arrow pointing down */}
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white transform rotate-45 shadow-sm"></div>
                        </div>

                        {/* Toggle Button */}
                        <button
                            onClick={() => setIsMoreOpen(!isMoreOpen)}
                            className={`flex items-center gap-2 px-6 py-3 bg-heritage text-white rounded-full shadow-lg hover:bg-heritage/90 transition-all transform hover:scale-105 active:scale-95 ${isMoreOpen ? 'ring-4 ring-copper/30' : ''}`}
                        >
                            <span className="font-medium text-sm">Click here for more</span>
                            {isMoreOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                    </div>
                </div>
            </div>
            <Footer />
        </>
    );
}

function UsersIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 text-gray-400 group-hover:text-copper"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
    )
}
