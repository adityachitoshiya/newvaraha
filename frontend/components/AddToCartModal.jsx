import { X, ShoppingCart, ArrowRight, Plus, Minus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/productData';
import { useEffect } from 'react';

export default function AddToCartModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  onUpdateQuantity, 
  onRemoveItem, 
  onContinueShopping, 
  onViewCart, 
  onCheckout,
  product 
}) {
  const total = cartItems.reduce((sum, item) => sum + (item.variant.price * item.quantity), 0);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getVariantImage = (variant) => {
    const image = product.images.find(img => img.id === variant.imageId);
    return image ? image.url : product.images[0]?.url;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[60] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Close cart"
          >
            <X size={24} />
          </button>
        </div>

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingCart size={64} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Your cart is empty</h3>
            <p className="text-gray-500 text-sm mb-6">Start adding items to your cart!</p>
            <button
              onClick={onContinueShopping}
              className="px-6 py-3 bg-copper text-white font-semibold rounded-lg hover:bg-heritage transition"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cartItems.map((item) => (
                <div key={item.variant.sku} className="flex gap-4 p-4 bg-white border rounded-lg shadow-sm">
                  <img
                    src={getVariantImage(item.variant)}
                    alt={item.variant.title}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{product.title}</h3>
                    <p className="text-xs text-gray-500">{item.variant.title}</p>
                    <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(item.variant.price)}</p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                        <button
                          onClick={() => onUpdateQuantity(item.variant.sku, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-100 transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-3 text-sm font-medium">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.variant.sku, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-100 transition"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      
                      <button
                        onClick={() => onRemoveItem(item.variant.sku)}
                        className="text-red-500 hover:text-red-700 transition"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Subtotal:</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(total)}</span>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={onCheckout}
                  className="w-full px-6 py-3 bg-copper text-white font-semibold rounded-xl shadow-lg hover:bg-heritage transition flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ArrowRight size={18} />
                </button>
                
                <button
                  onClick={onContinueShopping}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
