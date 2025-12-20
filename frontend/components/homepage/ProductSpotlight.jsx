import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { getApiUrl } from '../../lib/config';
import { ChevronRight, ShoppingBag, Star, ArrowRight } from 'lucide-react';
import useScrollAnimation from '../../hooks/useScrollAnimation';

export default function ProductSpotlight() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ref, isVisible] = useScrollAnimation();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const API_URL = getApiUrl();
      console.log("Fetching spotlight from:", API_URL);
      const res = await fetch(`${API_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        console.log("Spotlight data:", data);

        // First try featured/bestseller products
        const featured = data.filter(p => p.tag === 'Featured' || p.tag === 'Bestseller' || p.premium).slice(0, 5);

        // If no featured products, show New Arrivals (sort by newest first)
        if (featured.length === 0 && data.length > 0) {
          // Sort products by ID (assuming higher ID = newer product)
          // Or you can add a 'created_at' field to products
          const newArrivals = [...data].reverse().slice(0, 5);
          setProducts(newArrivals);
        } else if (featured.length > 0) {
          setProducts(featured);
        } else {
          setProducts(data.slice(0, 3)); // Fallback to first 3
        }
      } else {
        setError("Failed to load products");
      }
    } catch (error) {
      console.error("Error fetching spotlight products:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe fallback if no products
  if (isLoading) return <div className="py-24 text-center text-gray-400">Loading Masterpieces...</div>;
  if (error) return <div className="py-24 text-center text-red-500">Error: {error}</div>;
  if (products.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-heritage/60 mb-4">No products available yet</p>
        <Link href="/admin/products/new" className="text-copper underline">Add your first product</Link>
      </div>
    );
  }

  const currentProduct = products[currentIndex];

  // Check if products are featured or new arrivals
  const hasFeaturedProducts = products.some(p => p.tag === 'Featured' || p.tag === 'Bestseller' || p.premium);

  return (
    <section className="py-24 relative overflow-hidden bg-[#faf9f6]">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-copper rounded-full blur-[100px]"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-heritage rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <span className="text-copper font-medium tracking-[0.2em] uppercase text-sm mb-2 block">
            {hasFeaturedProducts ? 'Exquisite Collection' : 'Fresh Designs'}
          </span>
          <h2 className="font-royal text-5xl md:text-7xl font-bold text-heritage mb-6">
            {hasFeaturedProducts ? 'Featured Masterpieces' : 'New Arrivals'}
          </h2>
        </div>

        {/* Main Showcase */}
        <div className={`relative transition - all duration - 1000 delay - 200 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} `}>
          <div className="grid lg:grid-cols-12 gap-8 items-center">

            {/* Image Area - Spans 7 cols */}
            <div className="lg:col-span-7 relative group">
              <div className="aspect-[4/5] md:aspect-[16/10] lg:h-[600px] w-full relative rounded-2xl overflow-hidden shadow-2xl shadow-copper/10">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  onError={(e) => { e.target.src = '/varaha-assets/logo.png'; }}
                />

                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>

                {/* Tags on Image */}
                <div className="absolute top-6 left-6 flex gap-2">
                  {currentProduct.premium && (
                    <span className="px-4 py-1 bg-white/90 backdrop-blur-md text-heritage text-xs font-bold uppercase tracking-wider rounded-sm">
                      Premium
                    </span>
                  )}
                  {currentProduct.tag && (
                    <span className="px-4 py-1 bg-copper/90 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider rounded-sm">
                      {currentProduct.tag}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Content Area - Floating Glass Card - Spans 5 cols */}
            <div className="lg:col-span-5 lg:-ml-12 relative z-20">
              <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-8 md:p-12 rounded-2xl shadow-xl">
                <div className="flex items-center gap-2 text-copper mb-4">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <span className="text-xs text-gray-500 font-medium ml-2">(Bestseller)</span>
                </div>

                <h3 className="font-royal text-4xl md:text-5xl font-bold text-heritage mb-6 leading-[1.1]">
                  {currentProduct.name}
                </h3>

                <p className="font-playfair text-lg text-gray-600 mb-8 leading-relaxed line-clamp-3">
                  {currentProduct.description || "Experience the timeless elegance of our handcrafted masterpiece, designed to illuminate your grace."}
                </p>

                <div className="flex items-baseline gap-4 mb-10">
                  <span className="text-4xl font-light text-copper">
                    {currentProduct.price ? `₹${currentProduct.price.toLocaleString('en-IN')} ` : 'Price on Request'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/ product / ${currentProduct.id} `}
                    className="flex-1 py-4 bg-heritage text-white text-center rounded-lg font-medium hover:bg-copper transition-colors flex items-center justify-center gap-2 group"
                  >
                    Shop Now
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href={`/ product / ${currentProduct.id} `}
                    className="px-6 py-4 border border-heritage/20 text-heritage rounded-lg hover:bg-heritage/5 transition-colors flex items-center justify-center"
                  >
                    <ShoppingBag size={20} />
                  </Link>
                </div>

              </div>

              {/* Thumbnails Navigation */}
              <div className="mt-8 flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
                {products.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex - shrink - 0 w - 20 h - 20 rounded - lg overflow - hidden border - 2 transition - all ${idx === currentIndex ? 'border-copper scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'} `}
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = '/varaha-assets/logo.png'; }}
                    />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
