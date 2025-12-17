import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';

/**
 * Wishlist Button Component
 * Add/Remove products from wishlist with heart animation
 */
export default function WishlistButton({ 
  productId, 
  productData = null,
  size = 'md',
  showToast = true,
  className = ''
}) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if product is in wishlist on mount
  useEffect(() => {
    const wishlist = getWishlist();
    setIsInWishlist(wishlist.some(item => item.id === productId));
  }, [productId]);

  // Get wishlist from localStorage
  const getWishlist = () => {
    if (typeof window === 'undefined') return [];
    try {
      const wishlist = localStorage.getItem('wishlist');
      return wishlist ? JSON.parse(wishlist) : [];
    } catch (error) {
      console.error('Error reading wishlist:', error);
      return [];
    }
  };

  // Save wishlist to localStorage
  const saveWishlist = (wishlist) => {
    try {
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      // Dispatch custom event for wishlist count update
      window.dispatchEvent(new Event('wishlistUpdated'));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  };

  // Toggle wishlist
  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const wishlist = getWishlist();
    let newWishlist;
    let message;

    if (isInWishlist) {
      // Remove from wishlist
      newWishlist = wishlist.filter(item => item.id !== productId);
      message = '💔 Removed from Wishlist';
      setIsInWishlist(false);
    } else {
      // Add to wishlist
      const wishlistItem = productData ? {
        id: productId,
        ...productData,
        addedAt: new Date().toISOString()
      } : {
        id: productId,
        addedAt: new Date().toISOString()
      };
      newWishlist = [...wishlist, wishlistItem];
      message = '❤️ Added to Wishlist';
      setIsInWishlist(true);
    }

    saveWishlist(newWishlist);

    // Animate
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    // Show toast notification
    if (showToast) {
      showToastNotification(message);
    }
  };

  // Show toast notification
  const showToastNotification = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 z-[10000] bg-white px-6 py-3 rounded-xl shadow-2xl border border-gray-200 animate-slideInRight';
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <span class="text-2xl">${isInWishlist ? '💔' : '❤️'}</span>
        <p class="font-semibold text-heritage">${message}</p>
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // Size variants
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14'
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28
  };

  return (
    <button
      onClick={toggleWishlist}
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        transition-all duration-300
        ${isInWishlist 
          ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:scale-110' 
          : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-red-500 hover:scale-110 shadow-md'
        }
        ${isAnimating ? 'animate-heartbeat' : ''}
        ${className}
      `}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        size={iconSizes[size]}
        className={`transition-all duration-300 ${isInWishlist ? 'fill-current' : ''}`}
      />
    </button>
  );
}
