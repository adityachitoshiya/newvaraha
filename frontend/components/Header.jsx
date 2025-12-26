import { useState, useRef, useEffect } from 'react';
import { Search, Menu, ShoppingBag, X, Heart, User, LogOut, ChevronDown } from 'lucide-react';
import { useCart } from '../context/CartContext';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import AddToCartModal from './AddToCartModal';

export default function Header({ cartCount = 0, onCartClick }) {
  const router = useRouter();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const { cartCount: contextCartCount, cartItems, removeFromCart, updateQuantity } = useCart();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  const searchRef = useRef(null);
  const profileRef = useRef(null);

  // Desktop sticky header only
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 1024) {
        setIsSticky(window.scrollY > 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update counts (Wishlist only now, Cart is from Context) & Check Auth
  useEffect(() => {
    const updateState = () => {
      try {
        // Wishlist
        const wishlist = localStorage.getItem('wishlist');
        const wishlistItems = wishlist ? JSON.parse(wishlist) : [];
        setWishlistCount(wishlistItems.length);

        // User
        const storedUser = localStorage.getItem('customer_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error reading storage:', error);
      }
    };

    // Initial load
    updateState();

    // Listen for updates
    window.addEventListener('wishlistUpdated', updateState);
    // window.addEventListener('cartUpdated', updateState); // Handled by Context now
    window.addEventListener('storage', updateState); // Also listen to cross-tab updates

    return () => {
      window.removeEventListener('wishlistUpdated', updateState);
      // window.removeEventListener('cartUpdated', updateState);
      window.removeEventListener('storage', updateState);
    };
  }, []);

  // Handle outside click for profile dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileRef]);

  // Use prop if provided (override) or context
  const displayCartCount = cartCount > 0 ? cartCount : contextCartCount;

  // Focus search input when opened
  useEffect(() => {
    if (isSearchOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isSearchOpen]);

  const handleLogout = () => {
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_user');
    setUser(null);
    setIsProfileOpen(false);
    router.push('/');
  };

  const handleCartClick = (e) => {
    if (e) e.preventDefault();
    if (onCartClick) {
      onCartClick();
    } else {
      setIsCartModalOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#EFE9E2] border-b border-heritage/15 shadow-sm backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex flex-col items-start sm:items-center justify-center group py-2 flex-shrink min-w-0">
              <Image
                src="/varaha-assets/logo.png"
                alt="Varaha Jewels"
                width={160}
                height={50}
                className="h-8 sm:h-10 w-auto transition-transform duration-300 group-hover:scale-105"
                priority
              />
              <span className="text-[8px] sm:text-[9px] text-heritage/60 font-light tracking-[0.12em] sm:tracking-[0.15em] mt-0.5 italic whitespace-nowrap">
                Where heritage meets royalty
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-10">
              <Link href="/shop" className="text-heritage hover:text-copper transition-colors duration-200 font-medium border-b-2 border-transparent hover:border-copper pb-1">
                Collections
              </Link>
              <Link href="/heritage" className="text-heritage hover:text-copper transition-colors duration-200 font-medium border-b-2 border-transparent hover:border-copper pb-1">
                Heritage
              </Link>
              <Link href="/new-arrivals" className="text-heritage hover:text-copper transition-colors duration-200 font-medium border-b-2 border-transparent hover:border-copper pb-1">
                New Arrivals
              </Link>
              <Link href="/contact" className="text-heritage hover:text-copper transition-colors duration-200 font-medium border-b-2 border-transparent hover:border-copper pb-1">
                Contact
              </Link>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3 md:gap-3 lg:gap-4">
              {/* Search - Hidden on mobile */}
              <button
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className="hidden md:flex items-center justify-center w-10 h-10 text-heritage hover:text-copper transition-colors duration-200"
                aria-label="Search"
              >
                <Search size={22} />
              </button>

              {/* Wishlist - Visible on desktop only now (moved to bottom nav for mobile) */}
              <Link
                href="/wishlist"
                className="hidden lg:flex relative items-center justify-center w-10 h-10 text-heritage hover:text-copper transition-colors duration-200 group flex-shrink-0"
                aria-label="Wishlist"
              >
                <Heart size={18} className="sm:w-5 sm:h-5 group-hover:fill-current transition-all duration-200" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-0.5 leading-none">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart - Visible on all devices */}
              <button
                onClick={handleCartClick}
                className="relative flex items-center justify-center w-12 h-12 text-heritage hover:text-copper transition-colors duration-200 flex-shrink-0 touch-manipulation"
                aria-label="Shopping cart"
              >
                <ShoppingBag size={20} className="sm:w-5 sm:h-5" />
                {displayCartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-copper text-warm-sand text-[9px] sm:text-[10px] font-bold rounded-full min-w-[16px] h-4 sm:min-w-[18px] sm:h-[18px] flex items-center justify-center px-0.5 leading-none">
                    {displayCartCount}
                  </span>
                )}
              </button>

              {/* User Profile / Login - Visible on desktop only (moved to bottom nav for mobile) */}
              <div className="hidden lg:block relative">
                {user ? (
                  <button
                    onClick={() => router.push('/account')}
                    className="flex items-center gap-2 text-heritage hover:text-copper transition-colors duration-200 flex-shrink-0"
                    aria-label="My Account"
                  >
                    <User size={18} className="sm:w-5 sm:h-5" />
                    <span className="hidden sm:block text-sm font-medium whitespace-nowrap">
                      Hi {user.full_name?.split(' ')[0] || user.name?.split(' ')[0] || 'User'}!
                    </span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center justify-center w-10 h-10 text-heritage hover:text-copper transition-colors duration-200 flex-shrink-0"
                    aria-label="Sign In"
                  >
                    <User size={18} className="sm:w-5 sm:h-5" />
                  </Link>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden flex items-center justify-center w-10 h-10 text-heritage hover:text-copper transition-colors duration-200 flex-shrink-0"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Search Bar - Desktop */}
          {isSearchOpen && (
            <div className="hidden md:block pb-4">
              <div className="relative">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search for jewelry..."
                  className="w-full px-4 py-3 pl-12 pr-4 border-2 border-copper/30 rounded-lg focus:outline-none focus:border-copper bg-white text-heritage"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setIsSearchOpen(false);
                  }}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-copper" size={20} />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-heritage/60 hover:text-copper"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
            }`}
        >
          <div className="border-t border-heritage/15 bg-gradient-to-b from-warm-sand to-ivory-smoke backdrop-blur-lg">
            <nav className="px-4 py-6 space-y-2">
              {/* Mobile Search with animation */}
              <div className="relative mb-6 transform transition-all duration-300 animate-slideDown">
                <input
                  type="text"
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && mobileSearchQuery.trim()) {
                      setIsMobileMenuOpen(false);
                      router.push(`/collections?search=${encodeURIComponent(mobileSearchQuery.trim())}`);
                    }
                  }}
                  placeholder="Search for jewelry..."
                  className="w-full px-4 py-3.5 pl-12 pr-4 border-2 border-copper/30 rounded-xl focus:outline-none focus:border-copper focus:ring-2 focus:ring-copper/20 bg-white text-heritage shadow-sm transition-all duration-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-copper" size={20} />
              </div>

              {/* Mobile Auth Status */}
              <div className="mb-4">
                {user ? (
                  <div className="bg-white/50 rounded-lg p-3 flex items-center justify-between border border-heritage/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-copper/10 flex items-center justify-center text-copper font-bold">
                        {(user.full_name || user.name)?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-heritage">{user.full_name || user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-red-500"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-center py-2.5 bg-heritage text-white rounded-lg font-medium hover:bg-heritage/90 transition-colors shadow-sm"
                  >
                    Sign In / Register
                  </Link>
                )}
              </div>

              {/* Menu Items with staggered animation */}
              <Link
                href="/shop"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group block relative overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/50 backdrop-blur-sm border border-heritage/10 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 transform hover:translate-x-2 hover:shadow-md">
                  <span className="text-heritage group-hover:text-copper transition-colors duration-200 font-medium">
                    Collections
                  </span>
                  <div className="w-2 h-2 rounded-full bg-copper/0 group-hover:bg-copper transition-all duration-300"></div>
                </div>
              </Link>

              <Link
                href="/heritage"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group block relative overflow-hidden"
                style={{ animationDelay: '50ms' }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/50 backdrop-blur-sm border border-heritage/10 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 transform hover:translate-x-2 hover:shadow-md">
                  <span className="text-heritage group-hover:text-copper transition-colors duration-200 font-medium">
                    Heritage
                  </span>
                  <div className="w-2 h-2 rounded-full bg-copper/0 group-hover:bg-copper transition-all duration-300"></div>
                </div>
              </Link>

              <Link
                href="/new-arrivals"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group block relative overflow-hidden"
                style={{ animationDelay: '100ms' }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/50 backdrop-blur-sm border border-heritage/10 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 transform hover:translate-x-2 hover:shadow-md">
                  <span className="text-heritage group-hover:text-copper transition-colors duration-200 font-medium">
                    New Arrivals
                  </span>
                  <div className="w-2 h-2 rounded-full bg-copper/0 group-hover:bg-copper transition-all duration-300"></div>
                </div>
              </Link>

              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group block relative overflow-hidden"
                style={{ animationDelay: '150ms' }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-white/50 backdrop-blur-sm border border-heritage/10 hover:border-copper/50 hover:bg-copper/5 transition-all duration-300 transform hover:translate-x-2 hover:shadow-md">
                  <span className="text-heritage group-hover:text-copper transition-colors duration-200 font-medium">
                    Contact
                  </span>
                  <div className="w-2 h-2 rounded-full bg-copper/0 group-hover:bg-copper transition-all duration-300"></div>
                </div>
              </Link>

              {/* Wishlist Link - Mobile Menu */}
              <Link
                href="/wishlist"
                onClick={() => setIsMobileMenuOpen(false)}
                className="group block relative overflow-hidden"
                style={{ animationDelay: '200ms' }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 rounded-lg bg-gradient-to-r from-red-50 to-pink-50 backdrop-blur-sm border border-red-200 hover:border-red-400 hover:bg-red-100 transition-all duration-300 transform hover:translate-x-2 hover:shadow-md">
                  <div className="flex items-center gap-3">
                    <Heart size={18} className="text-red-500 group-hover:fill-current transition-all duration-200" />
                    <span className="text-heritage group-hover:text-red-600 transition-colors duration-200 font-medium">
                      My Wishlist
                    </span>
                  </div>
                  {wishlistCount > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                      {wishlistCount}
                    </span>
                  )}
                </div>
              </Link>

              {/* Decorative element */}
              <div className="mt-6 pt-4 border-t border-heritage/10">
                <p className="text-center text-xs text-heritage/60 italic">
                  Discover timeless elegance
                </p>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>

      {/* Global Cart Modal */}
      <AddToCartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cartItems={cartItems || []}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={(sku) => removeFromCart(null, sku)}
        onContinueShopping={() => setIsCartModalOpen(false)}
        onViewCart={() => {
          setIsCartModalOpen(false);
          // Optional: Navigate to /cart if you have a page, but modal is enough usually
        }}
        onCheckout={() => {
          setIsCartModalOpen(false);
          window.location.href = '/checkout?fromCart=true';
        }}
      />
    </>
  );
}
