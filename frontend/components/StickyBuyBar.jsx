import { ShoppingCart } from 'lucide-react';
import { formatCurrency } from '../lib/productData';

export default function StickyBuyBar({ variant, onAddToCart, onBuyNow }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-copper/20 shadow-lg z-30 p-4 safe-area-inset-bottom">
      <div className="flex items-center gap-3">
        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(variant, 1)}
          disabled={!variant.inStock}
          className="flex flex-col items-center justify-center w-16 h-16 border-2 border-copper rounded-lg hover:bg-copper/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Add to cart"
        >
          <ShoppingCart size={20} className="text-copper mb-0.5" />
          <span className="text-[10px] font-medium text-copper">Add</span>
        </button>

        {/* Buy Now Button */}
        <button
          onClick={() => onBuyNow(variant, 1)}
          disabled={!variant.inStock}
          className="flex-1 h-16 px-6 bg-copper text-white font-semibold rounded-lg shadow-lg hover:bg-heritage transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {variant.inStock ? `Buy Now - ${formatCurrency(variant.price)}` : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
}
