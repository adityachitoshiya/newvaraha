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
import RecommendedProducts from '../../components/RecommendedProducts';
import Footer from '../../components/Footer';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;

  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const { addToCart, updateQuantity, removeFromCart, cartItems } = useCart();
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);

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

        // Adapt backend data to frontend structure
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
          name: data.name, // Support both naming conventions
          description: data.description,
          price: data.price,
          images: allImages, // Complete image array with main + additional images
          category: data.category,
          rating: 4.8, // Mocked
          reviewCount: 124, // Mocked
          averageRating: 4.8, // Mocked

          // Mock Variants (Single Variant based on main product)
          variants: [
            {
              id: `${data.id}-default`,
              name: "Standard",
              price: data.price,
              sku: `${data.id}-default`,
              inStock: true
            }
          ],

          // Pass tech specs
          metal: data.metal,
          carat: data.carat,
          polish: data.polish,
          stones: data.stones, // JSON string, will need parsing in display if used

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

          recommendations: [] // We could fetch this too, but leaving empty for now
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
    // Add to Context (handles server sync)
    addToCart(product, variant, quantity);

    // Open cart modal
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

  // Buy Now Handler - Redirect to Checkout Page
  const handleBuyNow = (variant, quantity) => {
    // Redirect to checkout page with product details
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
    return <div className="min-h-screen bg-warm-sand flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-copper"></div>
    </div>;
  }

  if (!product) {
    return <div className="min-h-screen bg-warm-sand flex items-center justify-center">
      <p className="text-heritage text-xl">Product not found.</p>
    </div>;
  }

  return (
    <>
      <Head>
        <title>{product.title} | Premium Jewelry</title>
        <meta name="description" content={product.description} />
      </Head>

      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <Header cartCount={cartCount} onCartClick={() => setIsCartModalOpen(true)} />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          {/* Product Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
            {/* Product Images */}
            <div>
              <ProductCarousel images={product.images} />
            </div>

            {/* Product Info */}
            <div>
              <ProductInfo
                product={product}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
              />
            </div>
          </div>

          {/* Reviews */}
          <div className="max-w-5xl mx-auto">
            <ReviewsSection
              reviews={product.reviews}
              averageRating={product.averageRating}
              reviewCount={product.reviewCount}
            />
          </div>

          {/* Recommended Products */}
          {/* <div className="max-w-5xl mx-auto">
            <RecommendedProducts products={product.recommendations} />
          </div> */}
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
