import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, X, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getApiUrl } from '../lib/config';
import { useCart } from '../context/CartContext';

export default function Wishlist() {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [enrichedWishlist, setEnrichedWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart } = useCart();

  // Load wishlist on mount
  useEffect(() => {
    loadWishlist();
    fetchProducts();

    // Listen for wishlist updates
    const handleWishlistUpdate = () => {
      loadWishlist();
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
  }, []);

  // Enrich wishlist items with product data
  useEffect(() => {
    if (products.length > 0 && wishlistItems.length > 0) {
      const enriched = wishlistItems.map(item => {
        const product = products.find(p => p.id === item.id) || products.find(p => p.id === item.productId);
        return product ? { ...item, ...product } : item;
      });
      setEnrichedWishlist(enriched);
    } else if (wishlistItems.length > 0) {
      setEnrichedWishlist(wishlistItems);
    } else {
      setEnrichedWishlist([]);
    }
  }, [wishlistItems, products]);

  const fetchProducts = async () => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products for wishlist", error);
    }
  };

  // Load wishlist from localStorage
  const loadWishlist = () => {
    try {
      const wishlist = localStorage.getItem('wishlist');
      const items = wishlist ? JSON.parse(wishlist) : [];
      setWishlistItems(items);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      setWishlistItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = (productId) => {
    const updatedWishlist = wishlistItems.filter(item => item.id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(updatedWishlist));
    setWishlistItems(updatedWishlist);
    window.dispatchEvent(new Event('wishlistUpdated'));

    // Show toast
    showToast('💔 Removed from Wishlist');
  };

  // Clear entire wishlist
  const clearWishlist = () => {
    if (confirm('Are you sure you want to clear your entire wishlist?')) {
      localStorage.setItem('wishlist', JSON.stringify([]));
      setWishlistItems([]);
      window.dispatchEvent(new Event('wishlistUpdated'));
      showToast('🗑️ Wishlist Cleared');
    }
  };



  // Move all to cart
  const moveAllToCart = () => {
    enrichedWishlist.forEach(item => {
      handleAddToCart(item);
    });

    clearWishlist();
    showToast('🛒 All items added to Cart');
  };

  const handleAddToCart = (item) => {
    const variant = {
      sku: item.id,
      price: item.price,
      name: item.name,
      image: item.image
    };
    addToCart(item, variant, 1);
  };

  // Show toast notification
  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-20 right-4 z-[10000] bg-white px-6 py-3 rounded-xl shadow-2xl border border-gray-200';
    toast.innerHTML = `<p class="font-semibold text-heritage">${message}</p>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-heritage"></div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>My Wishlist - Varaha Jewels</title>
        <meta name="description" content="Your saved favorite jewelry items" />
      </Head>

      <Header />

      <main className="min-h-screen bg-gradient-to-b from-warm-sand/30 via-white to-warm-sand/30 py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-royal text-3xl sm:text-4xl md:text-5xl font-bold text-heritage mb-2 flex items-center gap-3">
                  <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 fill-current" />
                  My Wishlist
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
                </p>
              </div>

              {wishlistItems.length > 0 && (
                <div className="flex gap-2 sm:gap-3">
                  <button
                    onClick={moveAllToCart}
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
                  >
                    <ShoppingCart size={18} />
                    Add All to Cart
                  </button>
                  <button
                    onClick={clearWishlist}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 font-semibold rounded-lg hover:bg-red-200 transition-all duration-300"
                  >
                    <Trash2 size={18} />
                    <span className="hidden sm:inline">Clear</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Empty State */}
          {wishlistItems.length === 0 ? (
            <div className="max-w-md mx-auto text-center py-12 md:py-20">
              <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-copper/20 to-heritage/20 rounded-full flex items-center justify-center">
                <Heart className="w-16 h-16 text-heritage" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-heritage mb-4">
                Your Wishlist is Empty
              </h2>
              <p className="text-gray-600 mb-8">
                Start adding your favorite jewelry pieces to your wishlist!
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Continue Shopping
                <ArrowRight size={20} />
              </Link>
            </div>
          ) : (
            <>
              {/* Wishlist Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {enrichedWishlist.map((item) => (
                  <WishlistCard
                    key={item.id}
                    item={item}
                    onRemove={removeFromWishlist}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>

              {/* Mobile Actions */}
              <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
                <button
                  onClick={moveAllToCart}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300"
                >
                  <ShoppingCart size={20} />
                  Add All to Cart ({wishlistItems.length})
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}

// Wishlist Card Component
function WishlistCard({ item, onRemove, onAddToCart }) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
      {/* Image */}
      <Link href={`/product/${item.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100 cursor-pointer">
          <Image
            src={imageError ? '/varaha-assets/logo.png' : (item.image || item.images?.[0] || '/varaha-assets/logo.png')}
            alt={item.name || item.title || 'Product'}
            width={400}
            height={400}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />

          {/* Remove Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              onRemove(item.id);
            }}
            className="absolute top-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 shadow-lg z-10"
            aria-label="Remove from wishlist"
          >
            <X size={20} />
          </button>

          {/* Added Date */}
          {item.addedAt && (
            <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-xs rounded-full">
              Added {new Date(item.addedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </Link>

      {/* Details */}
      <div className="p-4">
        <Link href={`/product/${item.id}`}>
          <h3 className="font-semibold text-heritage mb-2 line-clamp-2 hover:text-copper transition-colors cursor-pointer">
            {item.name || item.title || 'Jewelry Item'}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mb-4">
          <p className="text-2xl font-bold text-heritage">
            {item.price ? `₹${item.price.toLocaleString('en-IN')}` : <span className="text-copper text-lg">Price on Request</span>}
          </p>
          {item.originalPrice && item.originalPrice > item.price && (
            <p className="text-sm text-gray-400 line-through">
              ₹{item.originalPrice.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => {
            onAddToCart(item);
            alert('Added to cart!');
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-300"
        >
          <ShoppingCart size={18} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
