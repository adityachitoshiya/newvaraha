import { useState, useEffect } from 'react';
import { getApiUrl } from '../lib/config';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, SlidersHorizontal, Grid, List, Heart, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function NewArrivals() {
    // Initialize products
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Filter states - Initialize 'New' tag as selected by default
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedMetals, setSelectedMetals] = useState([]);
    const [selectedStyles, setSelectedStyles] = useState([]);
    // Default to 'New' tag, but if user didn't tag products as 'New', they might disappear.
    // Changing default to empty to show ALL new arrivals (sorted by date)
    const [selectedTags, setSelectedTags] = useState([]);
    const [priceRange, setPriceRange] = useState([0, 5000000]); // Increased range
    const [sortBy, setSortBy] = useState('featured');

    // Wishlist state
    const [wishlist, setWishlist] = useState([]);

    // Cart Hook
    const { addToCart } = useCart();

    useEffect(() => {
        const savedWishlist = localStorage.getItem('wishlist');
        if (savedWishlist) {
            setWishlist(JSON.parse(savedWishlist));
        }
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            // Fetch from backend
            const API_URL = getApiUrl();
            const res = await fetch(`${API_URL}/api/products`);
            if (res.ok) {
                const data = await res.json();
                setProducts(data);
            }
        } catch (error) {
            console.error("Failed to fetch products", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Derived unique values for filters
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    const metals = [...new Set(products.map(p => p.metal))].filter(Boolean);
    const styles = [...new Set(products.map(p => p.style))].filter(Boolean);
    const tags = [...new Set(products.map(p => p.tag))].filter(Boolean);

    // Apply filters
    useEffect(() => {
        let filtered = [...products];

        if (searchQuery) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedCategories.length > 0) {
            filtered = filtered.filter(p => selectedCategories.includes(p.category));
        }

        if (selectedMetals.length > 0) {
            filtered = filtered.filter(p => selectedMetals.includes(p.metal));
        }

        if (selectedStyles.length > 0) {
            filtered = filtered.filter(p => selectedStyles.includes(p.style));
        }

        if (selectedTags.length > 0) {
            filtered = filtered.filter(p => selectedTags.includes(p.tag));
        }

        filtered = filtered.filter(p => {
            if (p.price === null || p.price === undefined) return true;
            return p.price >= priceRange[0] && p.price <= priceRange[1];
        });

        switch (sortBy) {
            case 'price-low':
                filtered.sort((a, b) => (a.price || Infinity) - (b.price || Infinity));
                break;
            case 'price-high':
                filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
                break;
            case 'name':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'featured':
            default:
                // Sort by ID (descending) correctly assuming id contains timestamp (prod-timestamp)
                // Newer items have higher timestamps
                filtered.sort((a, b) => {
                    const idA = String(a.id).replace(/\D/g, ''); // Extract numbers
                    const idB = String(b.id).replace(/\D/g, '');
                    return (Number(idB) || 0) - (Number(idA) || 0);
                });
                break;
        }

        setFilteredProducts(filtered);
    }, [searchQuery, selectedCategories, selectedMetals, selectedStyles, selectedTags, priceRange, sortBy, products]);

    const toggleFilter = (filterArray, setFilterArray, value) => {
        if (filterArray.includes(value)) {
            setFilterArray(filterArray.filter(item => item !== value));
        } else {
            setFilterArray([...filterArray, value]);
        }
    };

    const clearAllFilters = () => {
        // Reset to default state
        setSelectedCategories([]);
        setSelectedMetals([]);
        setSelectedStyles([]);
        // Decide: clear tags fully or keep 'New'? User might want to see EVERYTHING.
        // Let's clear tags fully on reset to allow seeing everything.
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

    const activeFiltersCount =
        selectedCategories.length +
        selectedMetals.length +
        selectedStyles.length +
        selectedTags.length +
        (priceRange[0] !== 0 || priceRange[1] !== 5000000 ? 1 : 0);

    return (
        <>
            <Head>
                <title>New Arrivals - Varaha Jewels | Latest Collections</title>
                <meta name="description" content="Discover the latest additions to the Varaha Jewels collection. Fresh designs, contemporary styles, and timeless classics." />
            </Head>

            <Header />

            <main className="min-h-screen bg-warm-sand py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12">
                        <h1 className="text-4xl md:text-5xl font-royal font-bold text-heritage mb-4">New Arrivals</h1>
                        <p className="text-heritage/70 max-w-2xl">
                            Be the first to explore our latest masterpieces. Fresh from our artisans to you.
                        </p>
                        <div className="w-20 h-px bg-copper mt-4"></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-8">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-heritage/40" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search latest jewelry..."
                                className="w-full pl-12 pr-4 py-3 border-2 border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper transition-all"
                            />
                        </div>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="sm:hidden px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm flex items-center justify-center gap-2"
                        >
                            <SlidersHorizontal size={20} />
                            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                        </button>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-4 py-3 border-2 border-copper/30 rounded-sm focus:outline-none focus:ring-2 focus:ring-copper transition-all font-medium text-heritage cursor-pointer"
                        >
                            <option value="featured">Newest First</option>
                            <option value="price-low">Price: Low to High</option>
                            <option value="price-high">Price: High to Low</option>
                            <option value="name">Name: A to Z</option>
                        </select>

                        <div className="hidden sm:flex border-2 border-copper/30 rounded-sm overflow-hidden">
                            <button onClick={() => setViewMode('grid')} className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-copper text-warm-sand' : 'text-heritage hover:bg-copper/10'}`}>
                                <Grid size={20} />
                            </button>
                            <button onClick={() => setViewMode('list')} className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-copper text-warm-sand' : 'text-heritage hover:bg-copper/10'}`}>
                                <List size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Filters Sidebar */}
                        <aside className={`lg:w-64 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                            <div className="bg-white border border-copper/30 rounded-sm p-6 sticky top-24">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-royal font-bold text-heritage flex items-center gap-2">
                                        <SlidersHorizontal size={20} className="text-copper" />
                                        Filters
                                    </h2>
                                    <button onClick={clearAllFilters} className="text-sm text-copper hover:text-heritage font-medium">Reset</button>
                                </div>

                                <div className="space-y-6">
                                    {tags.length > 0 && (
                                        <div>
                                            <h3 className="font-semibold text-heritage mb-3">Tags</h3>
                                            <div className="flex flex-wrap gap-2">
                                                {tags.map(tag => (
                                                    <button
                                                        key={tag}
                                                        onClick={() => toggleFilter(selectedTags, setSelectedTags, tag)}
                                                        className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${selectedTags.includes(tag) ? 'bg-copper text-warm-sand' : 'bg-copper/10 text-copper hover:bg-copper/20'}`}
                                                    >
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-copper/20">
                                        <h3 className="font-semibold text-heritage mb-3">Category</h3>
                                        <div className="space-y-2">
                                            {categories.map(category => (
                                                <label key={category} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCategories.includes(category)}
                                                        onChange={() => toggleFilter(selectedCategories, setSelectedCategories, category)}
                                                        className="w-4 h-4 text-copper focus:ring-copper rounded"
                                                    />
                                                    <span className="text-sm text-heritage/70 group-hover:text-heritage transition-colors">{category}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* Product Grid */}
                        <div className="flex-1">
                            <div className="mb-6 flex justify-between items-center">
                                <p className="text-heritage/70">
                                    Showing <span className="font-semibold text-heritage">{filteredProducts.length}</span> new arrivals
                                </p>
                                {isLoading && <span className="text-copper animate-pulse">Loading updates...</span>}
                            </div>

                            {filteredProducts.length === 0 && !isLoading ? (
                                <div className="bg-white border border-copper/30 rounded-sm p-12 text-center">
                                    <h3 className="text-2xl font-royal font-bold text-heritage mb-2">No products found</h3>
                                    <p className="text-heritage/60 mb-6">Try adjusting your filters to see more results.</p>
                                    <button onClick={clearAllFilters} className="px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm">Clear All Filters</button>
                                </div>
                            ) : (
                                <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                                    {filteredProducts.map((product) => (
                                        <div key={product.id} className={`group bg-white border border-copper/30 rounded-sm overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col ${viewMode === 'list' ? 'sm:flex-row' : 'h-full'}`}>
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
                                                {product.tag && <span className="absolute top-3 left-3 px-3 py-1 bg-copper text-warm-sand text-xs font-bold rounded-full">{product.tag}</span>}
                                                <button onClick={() => toggleWishlist(product.id, product.name)} className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors z-10">
                                                    <Heart size={20} className={isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-heritage'} />
                                                </button>
                                            </div>
                                            <div className="p-6 flex flex-col flex-1">
                                                <div className="flex-grow">
                                                    <Link href={`/product/${product.id}`} className="block group-hover:text-copper transition-colors">
                                                        <h3 className="text-lg font-royal font-bold text-heritage mb-1 line-clamp-2">{product.name}</h3>
                                                    </Link>
                                                    <p className="text-sm text-heritage/60">{product.category} • {product.metal}</p>
                                                    <div className="mt-4 mb-4">
                                                        {product.price ? <p className="text-2xl font-bold text-heritage">₹{product.price.toLocaleString('en-IN')}</p> : <p className="text-lg font-semibold text-copper">Price on Request</p>}
                                                    </div>
                                                </div>
                                                {product.price ? (
                                                    <button
                                                        onClick={() => handleAddToCart(product)}
                                                        className="mt-auto w-full px-6 py-3 bg-heritage text-warm-sand font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-copper transition-all group-hover:shadow-md"
                                                    >
                                                        Add to Cart <ShoppingBag size={18} />
                                                    </button>
                                                ) : (
                                                    <Link href={`/product/${product.id}`} className="mt-auto w-full px-6 py-3 bg-copper text-warm-sand font-semibold rounded-sm flex items-center justify-center gap-2 hover:bg-heritage transition-all group-hover:shadow-md">
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
