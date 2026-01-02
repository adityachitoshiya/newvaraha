import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/config';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/collections/ProductCard';
import QuickLookModal from '../components/collections/QuickLookModal';
import { SlidersHorizontal, Grid3x3, LayoutGrid, X, Search } from 'lucide-react';

export default function Collections() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedQuickLook, setSelectedQuickLook] = useState(null);
  const [isQuickLookOpen, setIsQuickLookOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMetal, setSelectedMetal] = useState('All');
  const [selectedStyle, setSelectedStyle] = useState('All');
  const [priceRange, setPriceRange] = useState([0, 5000000]); // Increased limit
  const [selectedTags, setSelectedTags] = useState([]);
  const [sortBy, setSortBy] = useState('popular');
  const [showFilters, setShowFilters] = useState(false);

  // Grid view
  const [gridCols, setGridCols] = useState(3);

  // Cart state
  const [cartItems, setCartItems] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  useEffect(() => {
    // Read search query from URL
    if (router.query.search) {
      setSearchQuery(router.query.search);
    }
    fetchProducts();
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, [router.query.search]);

  const fetchProducts = async () => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
        setFilteredProducts(data);
      } else {
        console.error("Failed to fetch products");
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Extract unique values for filters
  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const metals = ['All', ...new Set(products.map(p => p.metal).filter(Boolean))];
  const styles = ['All', ...new Set(products.map(p => p.style).filter(Boolean))];
  const tags = [...new Set(products.map(p => p.tag).filter(Boolean))];

  // Apply filters
  useEffect(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description?.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Metal filter
    if (selectedMetal !== 'All') {
      filtered = filtered.filter(p => p.metal === selectedMetal);
    }

    // Style filter
    if (selectedStyle !== 'All') {
      filtered = filtered.filter(p => p.style === selectedStyle);
    }

    // Price range filter
    filtered = filtered.filter(p => {
      if (p.price === null || p.price === undefined) return true; // Include premium items
      return p.price >= priceRange[0] && p.price <= priceRange[1];
    });

    // Tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(p => selectedTags.includes(p.tag));
    }

    // Sorting
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => {
          if (!a.price) return 1;
          if (!b.price) return -1;
          return a.price - b.price;
        });
        break;
      case 'price-high':
        filtered.sort((a, b) => {
          if (!a.price) return -1;
          if (!b.price) return 1;
          return b.price - a.price;
        });
        break;
      case 'newest':
        // Sort by ID descending as proxy for newest
        filtered.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
      default: // popular
        // Just default order for now
        break;
    }

    setFilteredProducts(filtered);
  }, [selectedCategory, selectedMetal, selectedStyle, priceRange, selectedTags, sortBy, products, searchQuery]);

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleQuickLook = (product) => {
    setSelectedQuickLook(product);
    setIsQuickLookOpen(true);
  };

  const resetFilters = () => {
    setSelectedCategory('All');
    setSelectedMetal('All');
    setSelectedStyle('All');
    setPriceRange([0, 5000000]);
    setSelectedTags([]);
    setSortBy('popular');
    setSearchQuery('');
  };

  const activeFiltersCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedMetal !== 'All' ? 1 : 0) +
    (selectedStyle !== 'All' ? 1 : 0) +
    (selectedTags.length > 0 ? selectedTags.length : 0) +
    (searchQuery ? 1 : 0);

  return (
    <>
      <Head>
        <title>Explore Collection | Varaha Jewels</title>
        <meta name="description" content="Explore our exquisite collection of handcrafted jewelry" />
      </Head>

      <Header cartCount={cartCount} onCartClick={() => setIsCartModalOpen(true)} />

      <div className="min-h-screen bg-gradient-to-b from-warm-sand/30 via-ivory/50 to-warm-sand/30">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-heritage via-copper to-heritage text-white py-16 px-4">
          <div className="absolute inset-0 bg-[url('/varaha-assets/heroimage.avif')] opacity-10 bg-cover bg-center"></div>
          <div className="relative max-w-7xl mx-auto text-center">
            <h1 className="font-cormorant text-4xl md:text-6xl font-bold mb-4">
              Royal Collection
            </h1>
            <p className="text-warm-sand/90 text-lg md:text-xl max-w-2xl mx-auto">
              Discover timeless elegance in our handcrafted jewelry collection
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-heritage/10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: Filter Toggle & Active Filters */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 bg-heritage text-white rounded-lg hover:bg-copper transition-colors duration-300"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="font-semibold">Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-white text-heritage px-2 py-0.5 rounded-full text-xs font-bold">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-heritage/60 hover:text-heritage flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Clear all
                  </button>
                )}
              </div>

              {/* Search Input */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-heritage/40 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-heritage/20 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-heritage/30"
                />
              </div>

              {/* Center: Quick Category Tabs (Desktop) */}
              <div className="hidden lg:flex gap-2 flex-wrap">
                {categories.slice(0, 6).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${selectedCategory === cat
                      ? 'bg-heritage text-white'
                      : 'bg-heritage/5 text-heritage hover:bg-heritage/10'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Right: Sort & Grid View */}
              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-heritage/20 rounded-lg text-sm font-semibold text-heritage focus:outline-none focus:ring-2 focus:ring-heritage/30"
                >
                  <option value="popular">Popular</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>

                {/* Grid Toggle (Desktop) */}
                <div className="hidden md:flex gap-1 bg-heritage/5 p-1 rounded-lg">
                  <button
                    onClick={() => setGridCols(3)}
                    className={`p-2 rounded transition-colors ${gridCols === 3 ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    title="3 columns"
                  >
                    <Grid3x3 className="w-4 h-4 text-heritage" />
                  </button>
                  <button
                    onClick={() => setGridCols(4)}
                    className={`p-2 rounded transition-colors ${gridCols === 4 ? 'bg-white shadow-sm' : 'hover:bg-white/50'
                      }`}
                    title="4 columns"
                  >
                    <LayoutGrid className="w-4 h-4 text-heritage" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-heritage/10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Metal Filter */}
                <div>
                  <h3 className="font-semibold text-heritage mb-3">Metal Type</h3>
                  <div className="space-y-2">
                    {metals.map((metal) => (
                      <label key={metal} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="metal"
                          checked={selectedMetal === metal}
                          onChange={() => setSelectedMetal(metal)}
                          className="w-4 h-4 text-heritage focus:ring-heritage"
                        />
                        <span className="text-sm text-heritage/70 group-hover:text-heritage">
                          {metal}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Style Filter */}
                <div>
                  <h3 className="font-semibold text-heritage mb-3">Style</h3>
                  <div className="space-y-2">
                    {styles.map((style) => (
                      <label key={style} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          name="style"
                          checked={selectedStyle === style}
                          onChange={() => setSelectedStyle(style)}
                          className="w-4 h-4 text-heritage focus:ring-heritage"
                        />
                        <span className="text-sm text-heritage/70 group-hover:text-heritage">
                          {style}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tags Filter */}
                <div>
                  <h3 className="font-semibold text-heritage mb-3">Collections</h3>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <label key={tag} className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag)}
                          onChange={() => toggleTag(tag)}
                          className="w-4 h-4 text-heritage focus:ring-heritage rounded"
                        />
                        <span className="text-sm text-heritage/70 group-hover:text-heritage">
                          {tag}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="font-semibold text-heritage mb-3">Price Range</h3>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="5000000"
                      step="10000"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                      className="w-full accent-heritage"
                    />
                    <div className="flex justify-between text-sm text-heritage/70">
                      <span>₹0</span>
                      <span className="font-semibold text-heritage">
                        ₹{(priceRange[1] / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters Tags */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategory !== 'All' && (
                <span className="inline-flex items-center gap-1.5 bg-heritage/10 text-heritage px-3 py-1.5 rounded-full text-sm">
                  {selectedCategory}
                  <button onClick={() => setSelectedCategory('All')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedMetal !== 'All' && (
                <span className="inline-flex items-center gap-1.5 bg-heritage/10 text-heritage px-3 py-1.5 rounded-full text-sm">
                  {selectedMetal}
                  <button onClick={() => setSelectedMetal('All')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedStyle !== 'All' && (
                <span className="inline-flex items-center gap-1.5 bg-heritage/10 text-heritage px-3 py-1.5 rounded-full text-sm">
                  {selectedStyle}
                  <button onClick={() => setSelectedStyle('All')}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 bg-heritage/10 text-heritage px-3 py-1.5 rounded-full text-sm">
                  {tag}
                  <button onClick={() => toggleTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Results Count */}
          <div className="mb-6 flex justify-between items-center">
            <p className="text-heritage/60">
              Showing <span className="font-semibold text-heritage">{filteredProducts.length}</span> products
            </p>
            {isLoading && <span className="text-copper animate-pulse">Loading collection...</span>}
          </div>

          {/* Products Grid */}
          <div className={`grid grid-cols-2 ${gridCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'
            } gap-4 md:gap-6 lg:gap-8 mb-12`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickLook={handleQuickLook}
              />
            ))}
          </div>

          {/* No Results */}
          {filteredProducts.length === 0 && !isLoading && (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-heritage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <SlidersHorizontal className="w-10 h-10 text-heritage/30" />
              </div>
              <h3 className="font-cormorant text-2xl font-bold text-heritage mb-2">
                No products found
              </h3>
              <p className="text-heritage/60 mb-6">
                Try adjusting your filters to see more results
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-heritage text-white rounded-lg font-semibold hover:bg-copper transition-colors duration-300"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Quick Look Modal */}
      <QuickLookModal
        isOpen={isQuickLookOpen}
        onClose={() => setIsQuickLookOpen(false)}
        product={selectedQuickLook}
      />
    </>
  );
}
