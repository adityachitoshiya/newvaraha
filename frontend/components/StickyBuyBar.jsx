import { Heart, ShoppingBag, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function StickyBuyBar({ variant, onAddToCart, onBuyNow }) {
  const [isInWishlist, setIsInWishlist] = useState(false);

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

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-copper/20 shadow-2xl z-30 safe-area-inset-bottom">
      {/* Myntra-style 3-button layout: Heart | Buy Now | Add to Bag */}
      <div className="flex items-stretch">

        {/* Wishlist Heart Button */}
        <button
          onClick={toggleWishlist}
          className="px-4 flex items-center justify-center border-r border-copper/20"
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
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border-r border-copper/20 text-copper font-bold text-sm transition disabled:opacity-50"
        >
          <CreditCard size={18} />
          Buy Now
        </button>

        {/* Add to Bag Button - Filled Copper */}
        <button
          onClick={() => onAddToCart(variant, 1)}
          disabled={!variant?.inStock}
          className="flex-1 flex items-center justify-center gap-2 py-4 bg-copper text-white font-bold text-sm transition hover:bg-heritage disabled:opacity-50"
        >
          <ShoppingBag size={18} />
          Add to Bag
        </button>
      </div>
    </div>
  );
}
