
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getApiUrl } from '../lib/config';
import { Search, SlidersHorizontal, Grid, List, Heart, X, ChevronDown, Filter, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useRouter } from 'next/router';

export default function Shop() {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle

    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedMetals, setSelectedMetals] = useState([]);
    const [selectedStyles, setSelectedStyles] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 5000000]);
    const [sortBy, setSortBy] = useState('featured');

    const { addToCart } = useCart();
    const [wishlist, setWishlist] = useState([]);

    useEffect(() => {
        fetchProducts();
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
            setWishlist(JSON.parse(savedWishlist));
        }
    }, []);

    // Apply filters from URL query params
    useEffect(() => {
        if (!router.isReady) return;

        const { category, style, metal, search } = router.query;

        if (category) {
            const cats = Array.isArray(category) ? category : [category];
            setSelectedCategories(cats);
        }

        if (style) {
            const styles = Array.isArray(style) ? style : [style];
            setSelectedStyles(styles);
        }

        if (metal) {
            const mets = Array.isArray(metal) ? metal : [metal];
            setSelectedMetals(mets);
        }

        if (search) {
            setSearchQuery(search);
        }

    }, [router.isReady, router.query]);



    const fetchProducts = async () => {
        try {
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            } else {
                console.error("Failed to fetch products");
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Derived unique values
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    const metals = [...new Set(products.map(p => p.metal))].filter(Boolean);
    const styles = [...new Set(products.map(p => p.style))].filter(Boolean);
    const tags = [...new Set(products.map(p => p.tag))].filter(Boolean);

    // Filtering Logic
    const filteredProducts = products.filter(product => {
        // Search
        if (searchQuery) {
            const term = searchQuery.toLowerCase();
            const matcheSearch =
                product.name.toLowerCase().includes(term) ||
                product.description?.toLowerCase().includes(term);
            if (!matcheSearch) return false;
        }

        // Category
        if (selectedCategories.length > 0 && !selectedCategories.includes(product.category)) return false;

        // Metal
        if (selectedMetals.length > 0 && !selectedMetals.includes(product.metal)) return false;

        // Style
        if (selectedStyles.length > 0 && !selectedStyles.includes(product.style)) return false;

        // Tags
        if (selectedTags.length > 0 && !selectedTags.includes(product.tag)) return false;

        // Price
        const price = product.price || 0;
        if (product.price !== null && (price < priceRange[0] || price > priceRange[1])) return false;

        return true;
    }).sort((a, b) => {
        switch (sortBy) {
            case 'price-low': return (a.price || Infinity) - (b.price || Infinity);
            case 'price-high': return (b.price || 0) - (a.price || 0);
            case 'name': return a.name.localeCompare(b.name);
            case 'featured':
            default:
                // Timestamp based ID sort
                const idA = String(a.id).replace(/\D/g, '');
                const idB = String(b.id).replace(/\D/g, '');
                return (Number(idB) || 0) - (Number(idA) || 0);

        }
    });

    const toggleFilter = (state, setState, value) => {
        if (state.includes(value)) {
            setState(state.filter(item => item !== value));
        } else {
            setState([...state, value]);
        }
    };

    const clearAllFilters = () => {
        setSelectedCategories([]);
        setSelectedMetals([]);
        setSelectedStyles([]);
        setSelectedTags([]);
        setPriceRange([0, 5000000]);
        setSearchQuery('');
    };

    const toggleWishlist = (productId, productName) => {
        const savedWishlist = localStorage.getItem('wishlist');
        let wishlistArray = savedWishlist ? JSON.parse(savedWishlist) : [];
        const existingIndex = wishlistArray.findIndex(item => item.id === productId);
        if (existingIndex > -1) {
            wishlistArray.splice(existingIndex, 1);
        } else {
            wishlistArray.push({ id: productId, productName });
        }
        localStorage.setItem('wishlist', JSON.stringify(wishlistArray));
        setWishlist(wishlistArray);
    };

    const handleAddToCart = (product) => {
        const variant = {
            sku: product.id,
            price: product.price,
            name: product.name,
            image: product.image
        };
        addToCart(product, variant, 1);
    };

    const isInWishlist = (productId) => wishlist.some(item => item.id === productId);

    const activeFiltersCount = selectedCategories.length + selectedMetals.length + selectedStyles.length + selectedTags.length + (priceRange[0] !== 0 || priceRange[1] !== 5000000 ? 1 : 0);

    return (
        <>
            <Head>
                <title>Shop All - Varaha Jewels</title>
                <meta name="description" content="Browse our exquisite collection of heritage jewelry. Shop gold, silver, kundan, and bridal jewelry with authentic craftsmanship." />
            </Head>
            <Header />
            <main className="min-h-screen bg-warm-sand pt-24 pb-32">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Page Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">The Collection</h1>
                        <p className="text-heritage/70 max-w-2xl">
                            Explore our entire range of handcrafted heritage jewelry.
                        </p>
                        <div className="w-20 h-px bg-copper mt-4"></div>
                    </div>

                    {/* Controls Bar */}
                    <div className="bg-white p-4 rounded-sm border border-copper/20 mb-8 lg:sticky lg:top-20 z-10 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden flex items-center gap-2 px-4 py-2 bg-heritage text-warm-sand rounded-sm"
                            >
                                <Filter size={18} /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                            </button>
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-copper"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto justify-between">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-sm focus:outline-none focus:border-copper cursor-pointer"
                            >
                                <option value="featured">Featured</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                                <option value="name">Name: A-Z</option>
                            </select>

                            <div className="flex border border-gray-200 rounded-sm overflow-hidden h-10">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`w-10 flex items-center justify-center ${viewMode === 'grid' ? 'bg-copper text-white' : 'hover:bg-gray-50'}`}
                                >
                                    <Grid size={20} />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`w-10 flex items-center justify-center ${viewMode === 'list' ? 'bg-copper text-white' : 'hover:bg-gray-50'}`}
                                >
                                    <List size={20} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-8 relative">
                        {/* Filters Sidebar */}
                        <aside className={`lg:w-64 lg:block fixed lg:static inset-0 z-[60] bg-white lg:bg-transparent transition-transform duration-300 transform ${showFilters ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                            {/* Mobile Close */}
                            <div className="lg:hidden flex justify-between items-center p-4 border-b">
                                <h2 className="font-bold text-lg">Filters</h2>
                                <button onClick={() => setShowFilters(false)}><X size={24} /></button>
                            </div>

                            <div className="p-4 lg:p-0 pb-32 lg:pb-0 space-y-8 overflow-y-auto h-full lg:h-auto max-h-[calc(100vh-100px)] lg:sticky lg:top-40">
                                {/* Categories */}
                                <div>
                                    <h3 className="font-royal font-bold text-heritage mb-4">Category</h3>
                                    <div className="space-y-2">
                                        {categories.map(cat => (
                                            <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCategories.includes(cat)}
                                                    onChange={() => toggleFilter(selectedCategories, setSelectedCategories, cat)}
                                                    className="rounded border-gray-300 text-copper focus:ring-copper"
                                                />
                                                <span className="text-sm text-gray-600">{cat}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Styles */}
                                {styles.length > 0 && (
                                    <div>
                                        <h3 className="font-royal font-bold text-heritage mb-4">Style</h3>
                                        <div className="space-y-2">
                                            {styles.map(style => (
                                                <label key={style} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStyles.includes(style)}
                                                        onChange={() => toggleFilter(selectedStyles, setSelectedStyles, style)}
                                                        className="rounded border-gray-300 text-copper focus:ring-copper"
                                                    />
                                                    <span className="text-sm text-gray-600">{style}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Metals */}
                                {metals.length > 0 && (
                                    <div>
                                        <h3 className="font-royal font-bold text-heritage mb-4">Metal</h3>
                                        <div className="space-y-2">
                                            {metals.map(metal => (
                                                <label key={metal} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedMetals.includes(metal)}
                                                        onChange={() => toggleFilter(selectedMetals, setSelectedMetals, metal)}
                                                        className="rounded border-gray-300 text-copper focus:ring-copper"
                                                    />
                                                    <span className="text-sm text-gray-600">{metal}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Price Range */}
                                <div>
                                    <h3 className="font-royal font-bold text-heritage mb-4">Price</h3>
                                    <div className="px-2">
                                        <input
                                            type="range"
                                            min="0"
                                            max="5000000"
                                            step="10000"
                                            value={priceRange[1]}
                                            onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                            className="w-full accent-copper"
                                        />
                                        <div className="flex justify-between text-sm text-heritage/70">
                                            <span>₹{priceRange[0].toLocaleString('en-IN')}</span>
                                            <span>₹{priceRange[1].toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Products Grid/List */}
                        <div className="flex-1">
                            {/* Results Count */}
                            <div className="mb-6 flex justify-between items-center">
                                <p className="text-heritage/70">
                                    Showing <span className="font-semibold text-heritage">{filteredProducts.length}</span> of{' '}
                                    <span className="font-semibold text-heritage">{products.length}</span> products
                                </p>
                                {isLoading && <span className="text-copper animate-pulse">Loading collection...</span>}
                            </div>

                            {filteredProducts.length === 0 && !isLoading ? (
                                <div className="bg-white border border-copper/30 rounded-sm p-12 text-center">
                                    <Search className="mx-auto mb-4 text-heritage/30" size={64} />
                                    <h3 className="text-2xl font-royal font-bold text-heritage mb-2">No products found</h3>
                                    <p className="text-heritage/70 mb-6">Try adjusting your filters or search query</p>
                                    <button
                                        onClick={clearAllFilters}
                                        className="px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all"
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            ) : (
                                <div className={viewMode === 'grid'
                                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'
                                    : 'space-y-6'
                                }>
                                    {filteredProducts.map((product) => (
                                        <div
                                            key={product.id}
                                            className={`group bg-white border border-copper/30 rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col ${viewMode === 'list' ? 'sm:flex-row' : 'h-full'}`}
                                        >
                                            {/* Product Image */}
                                            <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-48 sm:h-auto flex-shrink-0' : 'aspect-square'}`}>
                                                <Link href={`/product/${product.id}`} className="block h-full cursor-pointer">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name}
                                                        width={400}
                                                        height={400}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        onError={(e) => { e.target.srcset = ''; e.target.src = '/varaha-assets/logo.png'; }}
                                                    />
                                                </Link>
                                                {product.tag && (
                                                    <span className="absolute top-3 left-3 px-3 py-1 bg-copper text-warm-sand text-xs font-bold rounded-full">
                                                        {product.tag}
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => toggleWishlist(product.id, product.name)}
                                                    className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10 flex items-center justify-center"
                                                >
                                                    <Heart
                                                        size={20}
                                                        className={isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-heritage'}
                                                    />
                                                </button>
                                            </div>

                                            {/* Product Details */}
                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="flex-grow">
                                                    <div className="mb-3">
                                                        <Link href={`/product/${product.id}`} className="group-hover:text-copper transition-colors">
                                                            <h3 className="text-lg font-royal font-bold text-heritage mb-1 line-clamp-2">
                                                                {product.name}
                                                            </h3>
                                                        </Link>
                                                        <p className="text-sm text-heritage/60">{product.category} • {product.metal}</p>
                                                    </div>

                                                    <p className="text-sm text-heritage/70 mb-4 line-clamp-2">{product.description}</p>

                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            {product.price ? (
                                                                <p className="text-2xl font-bold text-heritage">
                                                                    ₹{product.price.toLocaleString('en-IN')}
                                                                </p>
                                                            ) : (
                                                                <p className="text-lg font-semibold text-copper">Price on Request</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {product.price ? (
                                                    <button
                                                        onClick={() => handleAddToCart(product)}
                                                        className="mt-auto w-full px-6 py-3 bg-heritage text-warm-sand font-semibold rounded-sm hover:bg-copper transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md"
                                                    >
                                                        Add to Cart <ShoppingBag size={18} />
                                                    </button>
                                                ) : (
                                                    <Link
                                                        href={`/product/${product.id}`}
                                                        className="mt-auto w-full px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all duration-300 flex items-center justify-center gap-2 group-hover:shadow-md"
                                                    >
                                                        View Details <ShoppingBag size={18} />
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

