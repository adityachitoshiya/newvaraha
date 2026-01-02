import { useEffect, useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { ShoppingBag, Heart, X, Check } from 'lucide-react';

export default function NotificationPopup() {
    const { notification, hideNotification } = useNotification();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (notification.show) {
            setVisible(true);
        } else {
            const timer = setTimeout(() => setVisible(false), 300); // Wait for exit animation
            return () => clearTimeout(timer);
        }
    }, [notification.show]);

    if (!visible && !notification.show) return null;

    const isCart = notification.type === 'cart';
    const isWishlist = notification.type === 'wishlist';

    // Animation classes
    const animationClass = notification.show
        ? 'translate-y-0 opacity-100 scale-100'
        : '-translate-y-4 opacity-0 scale-95';

    return (
        <div className="fixed top-24 right-4 sm:right-8 z-[9999] pointer-events-none">
            <div
                className={`
                    pointer-events-auto
                    w-full max-w-[350px]
                    bg-white/95 backdrop-blur-md
                    border border-copper/20
                    shadow-[0_8px_30px_rgb(0,0,0,0.12)]
                    rounded-lg
                    p-4
                    flex gap-4
                    transform transition-all duration-300 ease-out
                    ${animationClass}
                `}
                role="alert"
            >
                {/* Product Image */}
                {notification.product?.image && (
                    <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100 border border-gray-100">
                        <img
                            src={notification.product.image}
                            alt={notification.product.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className="font-royal font-bold text-heritage text-sm uppercase tracking-wide flex items-center gap-1.5">
                            {isCart ? (
                                <>
                                    <ShoppingBag size={14} className="text-copper" />
                                    Added to Bag
                                </>
                            ) : isWishlist ? (
                                <>
                                    <Heart size={14} className="text-copper fill-copper" />
                                    {notification.message.includes('Removed') ? 'Removed from Wishlist' : 'Added to Wishlist'}
                                </>
                            ) : (
                                <span className="text-copper">Notification</span>
                            )}
                        </h4>
                        <button
                            onClick={hideNotification}
                            className="text-gray-400 hover:text-heritage transition-colors -mt-1 -mr-1 p-1"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <p className="text-heritage/80 text-sm mt-1 font-medium truncate">
                        {notification.product?.name || notification.message}
                    </p>

                    {notification.product?.price && (
                        <p className="text-copper font-bold text-sm mt-0.5">
                            {notification.type === 'cart' ? 'Added successfully' : ''}
                        </p>
                    )}
                </div>

                {/* Status Bar */}
                <div className={`absolute bottom-0 left-0 h-0.5 bg-copper transition-all duration-[3000ms] ease-linear ${notification.show ? 'w-full' : 'w-0'}`} />
            </div>
        </div>
    );
}
