import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

/**
 * Wishlist Button Component
 * Add/Remove products from wishlist with heart animation
 */
export default function WishlistButton({
  productId,
  productData = null,
  size = 'md',
  showToast = true,
  showText = false,
  className = ''
}) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const { showNotification } = useNotification();

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
    let type = 'wishlist';

    if (isInWishlist) {
      // Remove from wishlist
      newWishlist = wishlist.filter(item => item.id !== productId);
      message = 'Removed from Wishlist';
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
      message = 'Added to Wishlist';
      setIsInWishlist(true);
    }

    saveWishlist(newWishlist);

    // Animate
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 600);

    // Show toast notification
    if (showToast) {
      showNotification(type, productData || { name: 'Product' }, message);
    }
  };

  // Size variants (for icon-only mode)
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

  // Full button with text (Varaha theme)
  if (showText) {
    return (
      <button
        onClick={toggleWishlist}
        className={`
          flex items-center justify-center gap-2
          transition-all duration-300
          ${isInWishlist
            ? 'bg-copper/10 text-copper border-copper'
            : 'bg-warm-sand text-heritage border-copper/50 hover:border-copper'
          }
          ${isAnimating ? 'animate-heartbeat' : ''}
          ${className}
        `}
        aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          size={20}
          className={`transition-all duration-300 ${isInWishlist ? 'fill-current text-copper' : 'text-copper'}`}
        />
        <span className="font-bold">WISHLIST</span>
      </button>
    );
  }

  // Icon-only button (original)
  return (
    <button
      onClick={toggleWishlist}
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        transition-all duration-300
        ${isInWishlist
          ? 'bg-copper text-white shadow-lg shadow-copper/30 hover:bg-heritage hover:scale-110'
          : 'bg-warm-sand/90 backdrop-blur-sm text-heritage hover:bg-warm-sand hover:text-copper hover:scale-110 shadow-md'
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


