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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div className="fixed inset-0 lg:top-0 lg:right-0 lg:left-auto lg:h-full lg:w-full lg:max-w-md bg-white z-[70] shadow-2xl flex flex-col animate-slide-in-right font-sans">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-royal font-bold text-heritage">Shopping Cart</h2>
            <p className="text-xs text-heritage/60 mt-1">{cartItems.length} items</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition"
            aria-label="Close cart"
          >
            <X size={28} />
          </button>
        </div>

        {/* Cart Items */}
        {cartItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
            <div className="w-24 h-24 bg-copper/10 rounded-full flex items-center justify-center mb-6">
              <ShoppingCart size={40} className="text-copper" />
            </div>
            <h3 className="text-xl font-royal font-bold text-heritage mb-2">Your cart is empty</h3>
            <p className="text-heritage/60 text-base mb-8 max-w-xs">Looks like you haven't added any exquisite pieces yet.</p>
            <button
              onClick={onContinueShopping}
              className="px-8 py-4 bg-heritage text-warm-sand font-semibold rounded-sm hover:bg-copper transition-all shadow-md hover:shadow-lg w-full max-w-xs"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 overscroll-contain">
              {cartItems.map((item) => (
                <div key={item.variant.sku} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative flex-shrink-0">
                    <img
                      src={item.image || item.variant.image || '/varaha-assets/og.jpg'}
                      alt={item.productName || item.variant.title}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-100"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-royal font-semibold text-heritage text-base leading-tight line-clamp-2">{item.productName}</h3>
                        <button
                          onClick={() => onRemoveItem(item.variant.sku)}
                          className="text-gray-400 hover:text-red-500 transition -mt-1 -mr-1 p-2"
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-heritage/60 mt-1 font-medium">{item.variant.title || item.variant.name}</p>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <p className="text-lg font-bold text-copper">{formatCurrency(item.variant.price)}</p>

                      {/* Quantity Controls */}
                      <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200">
                        <button
                          onClick={() => onUpdateQuantity(item.variant.sku, item.quantity - 1)}
                          className="w-9 h-9 flex items-center justify-center text-heritage hover:bg-white hover:shadow-sm rounded-l-lg transition active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-heritage">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.variant.sku, item.quantity + 1)}
                          className="w-9 h-9 flex items-center justify-center text-heritage hover:bg-white hover:shadow-sm rounded-r-lg transition active:scale-95"
                          aria-label="Increase quantity"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-gray-100 bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+20px)] lg:pb-5 space-y-4 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-10">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-heritage/70 text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between text-heritage font-bold text-xl">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={onCheckout}
                  className="w-full py-4 bg-copper text-white font-bold text-lg rounded-sm shadow-lg hover:bg-heritage hover:shadow-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  Proceed to Checkout <ArrowRight size={20} />
                </button>

                <button
                  onClick={onContinueShopping}
                  className="w-full py-3 text-heritage/60 font-medium text-sm hover:text-heritage transition text-center"
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
