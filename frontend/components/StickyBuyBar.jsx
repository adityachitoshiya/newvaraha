import { Heart, ShoppingBag, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function StickyBuyBar({ variant, onAddToCart, onBuyNow }) {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check wishlist status
  useEffect(() => {
    const checkWishlist = () => {
      const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
      setIsInWishlist(wishlist.some(item => item.id === variant?.id));
    };
    checkWishlist();
    window.addEventListener('wishlistUpdated', checkWishlist);
    return () => window.removeEventListener('wishlistUpdated', checkWishlist);
  }, [variant?.id]);

  const toggleWishlist = () => {
    const wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    if (isInWishlist) {
      const newWishlist = wishlist.filter(item => item.id !== variant?.id);
      localStorage.setItem('wishlist', JSON.stringify(newWishlist));
      setIsInWishlist(false);
    } else {
      wishlist.push({ id: variant?.id, addedAt: new Date().toISOString() });
      localStorage.setItem('wishlist', JSON.stringify(wishlist));
      setIsInWishlist(true);
    }
    window.dispatchEvent(new Event('wishlistUpdated'));
  };

  const content = (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-copper/20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[9999] safe-area-inset-bottom">
      {/* Myntra-style 3-button layout: Heart | Buy Now | Add to Bag */}
      <div className="flex items-stretch h-16">

        {/* Wishlist Heart Button */}
        <button
          onClick={toggleWishlist}
          className="w-16 flex items-center justify-center border-r border-copper/20 bg-white active:bg-gray-50 transition-colors"
        >
          <Heart
            size={24}
            className={`transition-colors duration-200 ${isInWishlist ? 'fill-copper text-copper' : 'text-copper'
              }`}
          />
        </button>

        {/* Buy Now Button - Outlined */}
        <button
          onClick={() => onBuyNow(variant, 1)}
          disabled={!variant?.inStock}
          className="flex-1 flex items-center justify-center gap-2 bg-white border-r border-copper/20 text-copper font-bold text-sm transition active:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CreditCard size={18} />
          Buy Now
        </button>

        {/* Add to Bag Button - Filled Copper */}
        <button
          onClick={() => onAddToCart(variant, 1)}
          disabled={!variant?.inStock}
          className="flex-1 flex items-center justify-center gap-2 bg-copper text-white font-bold text-sm transition active:bg-heritage disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ShoppingBag size={18} />
          Add to Bag
        </button>
      </div>
    </div>
  );

  // Use Portal to render outside of any potential overflow/transform parents
  if (!mounted) return null;

  return (
    <>
      {createPortal(content, document.body)}
      {/* Spacer to prevent content from being hidden behind the bar */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
