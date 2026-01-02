import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    ShoppingBag,
    Users,
    Settings,
    LogOut,
    Package,
    Menu,
    ChevronRight,
    Search,
    Bell,
    Tag,
    Activity,
    Image as ImageIcon,
    TrendingUp
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { getApiUrl } from '../../lib/config';

export default function AdminLayout({ children }) {
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Notifications Logic
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(`${getApiUrl()}/api/notifications`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    // Handle outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target)) {
                setShowNotifications(false);
            }
        };

        if (showNotifications) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showNotifications]);

    const markAsRead = async (id) => {
        try {
            await fetch(`${getApiUrl()}/api/notifications/${id}/read`, { method: 'POST' });
            // Update local state
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error("Failed to mark read", error);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    // Check auth on mount
    useEffect(() => {
        // If we continue to use localStorage for auth token
        const token = localStorage.getItem('admin_token') || localStorage.getItem('token');

        // If on login page, we don't need to block
        if (router.pathname === '/admin/login') {
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
        }

        if (!token) {
            router.push('/admin/login');
        } else {
            setIsAuthenticated(true);
        }
        setIsLoading(false);

        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('token');
        router.push('/admin/login');
    };

    const [isMobile, setIsMobile] = useState(false);

    // Resize Handler
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false); // Default close on mobile
            } else {
                setSidebarOpen(true); // Default open on desktop
            }
        };

        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navItems = [
        { name: 'Overview', href: '/admin', icon: LayoutDashboard },
        { name: 'Analytics', href: '/admin/analytics', icon: Activity },
        { name: 'Content', href: '/admin/cms', icon: ImageIcon },
        { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { name: 'Products', href: '/admin/products', icon: Package },
        { name: 'Coupons', href: '/admin/coupons', icon: Tag },
        { name: 'Customers', href: '/admin/customers', icon: Users },
        { name: 'Settings', href: '/admin/settings', icon: Settings },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
                <div className="w-16 h-16 border-4 border-copper border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isAuthenticated && router.pathname !== '/admin/login') {
        return null; // Don't render protected content
    }

    if (router.pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex font-sans text-gray-800">
            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out bg-white border-r border-gray-100 shadow-xl shadow-gray-200/50 
                    ${isMobile
                        ? (sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72')
                        : (sidebarOpen ? 'translate-x-0 w-72' : 'translate-x-0 w-20')
                    }
                `}
            >
                <div className="h-24 flex items-center justify-center border-b border-gray-50/50 mb-2">
                    <div className={`transition-all duration-300 flex items-center justify-center ${!isMobile && !sidebarOpen ? 'w-12 h-12' : 'w-48'}`}>
                        {(!isMobile && !sidebarOpen) ? (
                            <img src="/varaha-assets/logo.png" alt="V" className="h-10 w-10 object-contain" />
                        ) : (
                            <img src="/varaha-assets/logo.png" alt="Varaha Jewels" className="h-auto w-full max-w-[160px] object-contain" />
                        )}
                    </div>
                    {/* Close button for mobile */}
                    {isMobile && (
                        <button onClick={() => setSidebarOpen(false)} className="absolute right-4 top-8 text-gray-400">
                            <ChevronRight className="rotate-180" size={24} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-6 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = router.pathname === item.href;
                        // On desktop collapsed, hide text. On mobile, always show text (since sidebar is full width when open)
                        const showText = isMobile || sidebarOpen;

                        return (
                            <Link key={item.name} href={item.href}>
                                <div className={`group flex items-center px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 ${isActive
                                    ? 'bg-copper/10 text-copper font-semibold shadow-sm'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                    }`}>
                                    <item.icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`transition-colors duration-200 ${isActive ? 'text-copper' : 'group-hover:text-gray-700'}`}
                                    />
                                    <span className={`ml-3 whitespace-nowrap transition-all duration-300 ${showText ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 absolute'
                                        }`}>
                                        {item.name}
                                    </span>
                                    {isActive && showText && (
                                        <ChevronRight size={16} className="ml-auto text-copper" />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-gray-100 bg-white">
                    <button
                        onClick={handleLogout}
                        className={`flex items-center w-full px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all duration-200 group ${(!isMobile && !sidebarOpen) && 'justify-center'
                            }`}
                    >
                        <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
                        <span className={`ml-3 font-medium transition-all duration-300 ${(isMobile || sidebarOpen) ? 'opacity-100' : 'opacity-0 w-0 hidden'
                            }`}>
                            Sign Out
                        </span>
                    </button>

                    {!isMobile && (
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="mt-4 flex items-center justify-center w-full py-2 text-gray-300 hover:text-gray-500 transition-colors"
                        >
                            <div className="w-8 h-1 bg-gray-200 rounded-full"></div>
                        </button>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 
                ${isMobile ? 'ml-0' : (sidebarOpen ? 'ml-72' : 'ml-20')}
            `}>
                {/* Navbar */}
                <header className={`sticky top-0 z-20 h-20 px-4 md:px-8 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
                    }`}>

                    <div className="flex items-center gap-4">
                        {isMobile && (
                            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600">
                                <Menu size={24} />
                            </button>
                        )}
                        <div>
                            {/* Breadcrumb or Page Title can act here */}
                            <p className="text-sm text-gray-500 font-medium hidden md:block">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </p>
                            {/* Short Date for Mobile */}
                            <p className="text-sm text-gray-500 font-medium md:hidden">
                                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="relative hidden md:block group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-copper transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Quick search..."
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-copper/20 focus:border-copper transition-all w-64 shadow-sm"
                            />
                        </div>

                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <Bell size={22} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full border border-white text-[10px] flex items-center justify-center text-white font-bold">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                                    <div className="p-3 border-b border-gray-50 flex justify-between items-center">
                                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                                        <button onClick={fetchNotifications} className="text-xs text-copper">Refresh</button>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-400 text-sm">No notifications</div>
                                        ) : (
                                            notifications.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => markAsRead(n.id)}
                                                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                                                >
                                                    <p className={`text-sm ${!n.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>{n.message}</p>
                                                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                                                </div>
                                            ))
                                        )}

                                    </div>
                                    <div className="p-2 border-t border-gray-50 bg-gray-50/50 text-center">
                                        <Link href="/admin/notifications" className="text-xs font-medium text-copper hover:text-heritage block w-full py-1">
                                            See all notifications
                                        </Link>
                                    </div>
                                </div>

                            )}
                        </div>

                        <div className="flex items-center gap-3 pl-3 md:pl-6 border-l border-gray-200">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900">Admin</p>
                                <p className="text-xs text-copper font-medium">Super User</p>
                            </div>
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-white shadow-md flex items-center justify-center overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=Admin&background=B45309&color=fff`} alt="Admin" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main View */}
                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div >
        </div >
    );
}
