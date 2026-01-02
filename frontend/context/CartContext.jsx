import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getApiUrl } from '../lib/config';
import { useNotification } from './NotificationContext';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const { showNotification } = useNotification();

    // Initialize: Load token & Local Cart & Listen for Auth Changes
    useEffect(() => {
        // 1. Load Local Cart immediately
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse local cart", e);
            }
        }

        // 2. Set up Supabase Auth Listener
        // This handles initial session AND updates (Sign In, Sign Out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("CartContext: Auth Event:", event);

            if (session) {
                // User Logged In
                setToken(session.access_token);
                // Optional: Set user data in local storage if not already there
                localStorage.setItem('customer_token', session.access_token);
            } else {
                // User Logged Out
                setToken(null);
                setLoading(false); // Stop loading if no user
            }
        });

        // 3. Check for legacy local storage token (Fallback)
        const storedToken = localStorage.getItem('customer_token');
        if (storedToken) {
            setToken(storedToken);
        }

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    // Sync with Backend when Token Changes
    useEffect(() => {
        if (token && !loading) {
            syncCartWithBackend();
        }
    }, [token, loading]);

    // Persist to Local Storage (Always, for offline/optimistic UI)
    useEffect(() => {
        if (!loading) {
            localStorage.setItem('cart', JSON.stringify(cartItems));
            // Dispatch event for legacy components (Header.jsx)
            window.dispatchEvent(new Event('cartUpdated'));
        }
    }, [cartItems, loading]);

    const syncCartWithBackend = async () => {
        try {
            const API_URL = getApiUrl();
            // Prepare local items for sync
            const syncPayload = {
                local_items: cartItems.map(item => ({
                    product_id: item.productId || item.product_id || item.variant.sku.split('-')[0], // Fallback logic
                    quantity: item.quantity,
                    variant_sku: item.variant?.sku
                }))
            };

            const res = await fetch(`${API_URL}/api/cart/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(syncPayload)
            });

            if (res.ok) {
                const serverCart = await res.json();
                // Server cart structure is different? Let's check main.py
                // It returns list of items with "variant" object.
                // We should replace local cart with server cart as truth
                setCartItems(serverCart);
            }
        } catch (err) {
            console.error("Cart Sync Failed:", err);
        }
    };

    const addToCart = async (product, variant, quantity) => {
        // 1. Optimistic Update
        const newItem = {
            productId: product.id,
            productName: product.name,
            variant, // { sku, price, image, name }
            quantity,
            // Legacy fields for UI
            image: variant.image || product.images?.[0]?.url,
            description: product.description?.substring(0, 100)
        };

        setCartItems(prev => {
            const existingIdx = prev.findIndex(item => item.variant.sku === variant.sku);
            if (existingIdx > -1) {
                const updated = [...prev];
                updated[existingIdx].quantity += quantity;
                return updated;
            }
            return [...prev, newItem];
        });

        // Show Notification
        showNotification('cart', {
            name: product.name,
            image: variant.image || product.images?.[0]?.url,
            price: variant.price
        }, 'Added to Bag');

        // 2. Server Update (if logged in)
        if (token) {
            try {
                const API_URL = getApiUrl();
                const res = await fetch(`${API_URL}/api/cart/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        product_id: product.id,
                        quantity: quantity,
                        variant_sku: variant.sku
                    })
                });

                if (res.ok) {
                    const serverItem = await res.json();

                    // Attach Server ID to the local item
                    setCartItems(prev => prev.map(item => {
                        // Match based on SKU (Variant)
                        if (item.variant.sku === variant.sku) {
                            return { ...item, id: serverItem.id };
                        }
                        return item;
                    }));
                }

            } catch (e) {
                console.error("Failed to add to server cart", e);
            }
        }
    };

    const removeFromCart = async (itemId, variantSku) => {
        // 1. Optimistic Update (Handle both ID and SKU matches)
        setCartItems(prev => prev.filter(item => {
            // If SKU matches, remove it
            if (variantSku && item.variant?.sku === variantSku) return false;
            // If ID matches, remove it
            if (itemId && item.id === itemId) return false;
            // Keep otherwise
            return true;
        }));

        // 2. Server Update
        if (token && itemId) {
            try {
                const API_URL = getApiUrl();
                await fetch(`${API_URL}/api/cart/items/${itemId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) { console.error(e); }
        }
    };

    const updateQuantity = async (variantSku, newQty, itemId) => {
        if (newQty <= 0) {
            return removeFromCart(itemId, variantSku);
        }

        // 1. Optimistic Update
        let itemToUpdate = null;

        setCartItems(prev => prev.map(item => {
            const matchesSku = variantSku && item.variant?.sku === variantSku;
            const matchesId = itemId && item.id === itemId;

            if (matchesSku || matchesId) {
                itemToUpdate = item;
                return { ...item, quantity: newQty };
            }
            return item;
        }));

        // 2. Server Update
        if (token && itemToUpdate && itemToUpdate.id) {
            try {
                const API_URL = getApiUrl();
                await fetch(`${API_URL}/api/cart/items/${itemToUpdate.id}?quantity=${newQty}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) { console.error(e); }
        }
    };

    const clearCart = () => {
        setCartItems([]);
        if (localStorage) localStorage.removeItem('cart');
        // We don't necessarily clear server cart on "Clear Cart" uless requested, but usually yes.
        // For now, let's keep it simple.
    };

    return (
        <CartContext.Provider value={{
            cartItems,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            cartCount: cartItems.reduce((sum, i) => sum + i.quantity, 0)
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
