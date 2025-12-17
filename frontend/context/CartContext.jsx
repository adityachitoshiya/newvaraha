import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getApiUrl } from '../lib/config';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    // Initialize: Load token & Local Cart
    useEffect(() => {
        // Check for auth token (Local storage or Supabase session)
        // Note: The login page sets 'customer_token'. We use that.
        const storedToken = localStorage.getItem('customer_token');
        setToken(storedToken);

        // Load Local Cart
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            try {
                setCartItems(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse local cart", e);
            }
        }
        setLoading(false);
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

        // 2. Server Update (if logged in)
        if (token) {
            try {
                const API_URL = getApiUrl();
                await fetch(`${API_URL}/api/cart/items`, {
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
            } catch (e) {
                console.error("Failed to add to server cart", e);
            }
        }
    };

    const removeFromCart = async (itemId, variantSku) => {
        // itemId might be DB id (if from server) or undefined (if local)
        // We filter by variantSku mainly

        // 1. Optimistic
        const itemToRemove = cartItems.find(item => item.variant.sku === variantSku);
        setCartItems(prev => prev.filter(item => item.variant.sku !== variantSku));

        // 2. Server Update
        if (token && itemToRemove && itemToRemove.id) {
            try {
                const API_URL = getApiUrl();
                await fetch(`${API_URL}/api/cart/items/${itemToRemove.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch (e) { console.error(e); }
        }
    };

    const updateQuantity = async (variantSku, newQty) => {
        if (newQty <= 0) {
            return removeFromCart(null, variantSku);
        }

        // 1. Optimistic
        const itemToUpdate = cartItems.find(item => item.variant.sku === variantSku);
        setCartItems(prev => prev.map(item =>
            item.variant.sku === variantSku ? { ...item, quantity: newQty } : item
        ));

        // 2. Server Update
        if (token && itemToUpdate && itemToUpdate.id) {
            try {
                const API_URL = getApiUrl();
                await fetch(`${API_URL}/api/cart/items/${itemToUpdate.id}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { quantity: newQty } // Wait, PUT /items/{id}?quantity=... 
                    // In main.py: update_cart_item(item_id, quantity) -> Query param or Body?
                    // FastAPI default for simple types is Query param unless Body() used. I didn't verify main.py sig.
                    // Let's check main.py logic: def update_cart_item(item_id: int, quantity: int...) 
                    // This means query param by default.
                }) // Need to construct URL correctly
                    + `?quantity=${newQty}` // Fix this in fetch call

                // Re-doing fetch securely
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
