import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../../lib/config';
import { useCart } from '../../context/CartContext';
import Head from 'next/head';
import Header from '../../components/Header';
import ProductCarousel from '../../components/ProductCarousel';
import ProductInfo from '../../components/ProductInfo';
import StickyBuyBar from '../../components/StickyBuyBar';
import AddToCartModal from '../../components/AddToCartModal';
import ReviewsSection from '../../components/ReviewsSection';
import Footer from '../../components/Footer';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { addToCart, updateQuantity, removeFromCart, cartItems } = useCart();
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId) => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();

        // Parse additional images from JSON string
        let additionalImages = [];
        try {
          additionalImages = data.additional_images ? JSON.parse(data.additional_images) : [];
        } catch (e) {
          console.error("Error parsing additional_images:", e);
          additionalImages = [];
        }

        // Build complete images array: main image first, then additional images
        const allImages = [
          { id: 1, type: 'image', url: data.image, alt: data.name }
        ];

        // Add additional images with sequential IDs
        additionalImages.forEach((imageUrl, index) => {
          if (imageUrl && imageUrl.trim()) {
            allImages.push({
              id: index + 2,
              type: 'image',
              url: imageUrl,
              alt: `${data.name} - Image ${index + 2}`
            });
          }
        });

        const adaptedProduct = {
          id: data.id,
          title: data.name,
          name: data.name,
          description: data.description,
          price: data.price,
          images: allImages,
          category: data.category,
          rating: 4.8,
          reviewCount: 124,
          averageRating: 4.8,

          // Variants
          variants: [
            {
              id: `${data.id}-default`,
              name: "Standard",
              price: data.price,
              sku: `${data.id}-default`,
              inStock: true
            }
          ],

          // Tech specs
          metal: data.metal,
          carat: data.carat,
          polish: data.polish,
          stones: data.stones,

          // Mock Reviews
          reviews: [
            {
              id: 1,
              user: "Priya S.",
              rating: 5,
              comment: "Absolutely stunning piece! The craftsmanship is unmatched.",
              date: "2 days ago"
            },
            {
              id: 2,
              user: "Rahul M.",
              rating: 5,
              comment: "Looks even better in person. Packaging was premium too.",
              date: "1 week ago"
            }
          ],

          recommendations: []
        };

        setProduct(adaptedProduct);
      } else {
        console.error("Product not found");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total cart count from Context
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Add to Cart Handler
  const handleAddToCart = (variant, quantity) => {
    addToCart(product, variant, quantity);
    setIsCartModalOpen(true);
  };

  // Update Cart Item Quantity
  const handleUpdateQuantity = (sku, newQuantity) => {
    updateQuantity(sku, newQuantity);
  };

  // Remove Cart Item
  const handleRemoveItem = (sku) => {
    removeFromCart(null, sku);
  };

  // Buy Now Handler
  const handleBuyNow = (variant, quantity) => {
    router.push({
      pathname: '/checkout',
      query: {
        productId: product.id,
        variantId: variant.id,
        quantity,
        amount: variant.price * quantity,
        productName: product.name,
        image: product.images[0]?.url,
        description: product.description?.substring(0, 100)
      }
    });
  };

  // Checkout from Cart
  const handleCheckoutFromCart = async () => {
    router.push('/checkout?fromCart=true');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-warm-sand flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper"></div>
          <p className="text-heritage">Loading...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-warm-sand flex items-center justify-center">
        <div className="text-center">
          <p className="text-heritage text-xl mb-4">Product not found.</p>
          <button
            onClick={() => router.push('/shop')}
            className="px-6 py-2 bg-copper text-white rounded-md hover:bg-heritage transition"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.title} | Varaha Jewels</title>
        <meta name="description" content={product.description} />
      </Head>

      <div className="min-h-screen flex flex-col bg-white">
        {/* Header */}
        <Header cartCount={cartCount} onCartClick={() => setIsCartModalOpen(true)} />

        {/* Main Content - Myntra Style Layout */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Desktop Layout: Image Grid Left, Info Right (Sticky) */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">

              {/* Left Column - Product Images (2x2 Grid) */}
              <div className="lg:col-span-7 xl:col-span-7">
                <ProductCarousel
                  images={product.images}
                  rating={product.averageRating}
                  reviewCount={product.reviewCount}
                />
              </div>

              {/* Right Column - Product Info (Sticky on desktop) */}
              <div className="lg:col-span-5 xl:col-span-5 mt-6 lg:mt-0">
                <div className="lg:sticky lg:top-24">
                  <ProductInfo
                    product={product}
                    onAddToCart={handleAddToCart}
                    onBuyNow={handleBuyNow}
                  />
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="mt-12 border-t border-gray-200 pt-8">
              <ReviewsSection
                reviews={product.reviews}
                averageRating={product.averageRating}
                reviewCount={product.reviewCount}
              />
            </div>
          </div>
        </main>

        {/* Sticky Mobile Buy Bar */}
        <StickyBuyBar
          variant={product.variants[0]}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />

        {/* Footer */}
        <Footer />

        {/* Cart Modal */}
        <AddToCartModal
          isOpen={isCartModalOpen}
          onClose={() => setIsCartModalOpen(false)}
          cartItems={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onContinueShopping={() => setIsCartModalOpen(false)}
          onViewCart={() => setIsCartModalOpen(true)}
          onCheckout={handleCheckoutFromCart}
          product={product}
        />
      </div>
    </>
  );
}
