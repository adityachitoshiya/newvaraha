import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menu, Search, ShoppingCart, Heart, ChevronDown, X, Star, Truck, RefreshCw, Layers, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';

// ====================================================================
// Mock Product Data (Prices in Indian Rupees - ₹)
// ====================================================================

const PRODUCT_DATA = {
    id: 1001,
    title: "The Stellar Voyager Hoodie",
    subtitle: "Engineered for Comfort, Styled for Adventure.",
    description: "This premium tri-blend fleece hoodie is designed for ultimate comfort and durability. Features include a reinforced kangaroo pocket, hidden internal phone sleeve, and a double-lined hood for maximum warmth. It's the perfect companion for chilly mornings and late-night coding sessions.",
    averageRating: 4.7,
    reviewCount: 158,
    keyFeatures: [
        "Ultra-soft Tri-Blend Fleece (60% Cotton, 40% Poly, 5% Spandex)",
        "Durable, Anti-Pill Fabric Technology",
        "Deep, Lined Kangaroo Pocket with Hidden Phone Sleeve",
        "Ribbed Cuffs and Hem for Secure Fit",
        "Unisex Fit"
    ],
    images: [
        { id: 'img1', type: 'image', url: 'https://placehold.co/800x800/212a38/ffffff?text=Hoodie+Model+Front', alt: 'Model wearing black hoodie, front view' },
        { id: 'img2', type: 'image', url: 'https://placehold.co/800x800/1e293b/f8fafc?text=Detail+Fabric+Texture', alt: 'Close-up texture detail of the fleece fabric' },
        { id: 'img3', type: 'video', url: 'https://placehold.co/800x800/312e81/ffffff?text=Product+Video', alt: 'Short product video demonstrating movement' }, // Placeholder for video
        { id: 'img4', type: 'image', url: 'https://placehold.co/800x800/475569/ffffff?text=Model+Side+Profile', alt: 'Model wearing black hoodie, side profile' },
    ],
    // Mock INR values (approx. 1 USD = 80-85 INR conversion applied for realistic pricing)
    variants: [
        { id: 1, color: 'Night Black', size: 'S', price: 10999.00, compareAt: 13999.00, stock: 50, sku: 'HOD-BLK-S', imageId: 'img1' },
        { id: 2, color: 'Night Black', size: 'M', price: 10999.00, compareAt: 13999.00, stock: 10, sku: 'HOD-BLK-M', imageId: 'img1' },
        { id: 3, color: 'Night Black', size: 'L', price: 10999.00, compareAt: 13999.00, stock: 0, sku: 'HOD-BLK-L', imageId: 'img1' },
        { id: 4, color: 'Forest Green', size: 'S', price: 11599.00, compareAt: 14599.00, stock: 35, sku: 'HOD-GRN-S', imageId: 'img4' }, // Assuming different image for variant
        { id: 5, color: 'Forest Green', size: 'M', price: 11599.00, compareAt: 14599.00, stock: 20, sku: 'HOD-GRN-M', imageId: 'img4' },
        { id: 6, color: 'Forest Green', size: 'L', price: 11599.00, compareAt: 14599.00, stock: 8, sku: 'HOD-GRN-L', imageId: 'img4' },
    ],
    reviews: [
        { id: 1, user: "Alex J.", rating: 5, date: "2 days ago", title: "Best Hoodie Ever!", text: "The fabric is incredibly soft. I practically live in this now. True to size." },
        { id: 2, user: "Sarah P.", rating: 5, date: "1 week ago", title: "Worth every penny.", text: "A bit pricey, but the quality is unmatched. The hidden pocket is genius." },
        { id: 3, user: "Mark K.", rating: 4, date: "3 weeks ago", title: "Great, but runs a bit small.", text: "Ordered a large, fits more like a medium. Still love the color though!" },
    ],
    recommendations: [
        { id: 201, title: 'Matching Joggers', price: 7499.00, imageUrl: 'https://placehold.co/200x200/475569/ffffff?text=Joggers', alt: 'Matching joggers' },
        { id: 202, title: 'Tech T-Shirt', price: 3799.00, imageUrl: 'https://placehold.co/200x200/212a38/ffffff?text=T-Shirt', alt: 'Quick-dry t-shirt' },
        { id: 203, title: 'Logo Cap', price: 2499.00, imageUrl: 'https://placehold.co/200x200/1e293b/f8fafc?text=Cap', alt: 'Branded logo cap' },
    ]
};

// ====================================================================
// Utility Hooks & Functions
// ====================================================================

// Helper to format currency consistently
const formatRupees = (amount) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
};

// Hook for accessing and persisting state in localStorage (for banner dismissal)
const useStickyState = (defaultValue, key) => {
    const [value, setValue] = useState(() => {
        const stickyValue = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }, [key, value]);
    
    return [value, setValue];
};

// Hook for viewport width tracking (for responsive sticky header/footer logic)
const useViewportSize = () => {
    const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth);
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);
    return { width };
};

// ====================================================================
// Layout Components (Header, Banner, Footer)
// ====================================================================

const AnnouncementBanner = () => {
    const [isDismissed, setIsDismissed] = useStickyState(false, 'bannerDismissed');

    if (isDismissed) return null;

    return (
        <div className="bg-indigo-600 text-white text-center text-sm py-2 px-4 flex justify-center items-center relative">
            <p className="font-medium">Use code <strong className="uppercase tracking-widest">FREEship</strong> to get free shipping</p>
            <button
                onClick={() => setIsDismissed(true)}
                aria-label="Dismiss announcement banner"
                className="absolute right-2 p-1 rounded-full hover:bg-indigo-700 transition"
            >
                <X size={16} />
            </button>
        </div>
    );
};

const Header = ({ totalCartCount, setIsCartOpen }) => {
    const { width } = useViewportSize();
    const isMobile = width < 1024; // lg breakpoint
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const searchRef = useRef(null);

    // Close search on desktop blur
    const handleSearchBlur = () => {
        if (!isMobile) {
            setTimeout(() => setIsSearchOpen(false), 200); // Small delay to allow click
        }
    };

    // Toggle search on click
    const toggleSearch = () => {
        setIsSearchOpen(!isSearchOpen);
    };

    useEffect(() => {
        if (isSearchOpen && !isMobile && searchRef.current) {
            searchRef.current.focus();
        }
    }, [isSearchOpen, isMobile]);

    return (
        <header className={`z-40 border-b bg-white shadow-sm transition-all duration-300 ${!isMobile ? 'sticky top-0' : 'relative'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Logo (Left) */}
                <div className="flex-shrink-0 text-xl font-black tracking-wider text-gray-900 cursor-pointer">
                    STELLAR
                </div>

                {/* Search & Menu (Center/Right) */}
                <div className="flex items-center space-x-4">
                    {/* Search */}
                    <div className="relative flex items-center">
                        <button
                            onClick={toggleSearch}
                            aria-label="Toggle search input"
                            className="p-2 rounded-full hover:bg-gray-100 transition lg:hidden" // Mobile search toggle
                        >
                            <Search size={20} />
                        </button>
                        
                        <div className={`
                            ${isMobile ? 'absolute right-0 top-16 bg-white w-screen px-4 py-3 shadow-md' : 'hidden lg:flex lg:relative'} 
                            ${isSearchOpen ? 'block' : 'hidden lg:block'}
                        `}>
                            <input
                                ref={searchRef}
                                type="search"
                                placeholder="Search products..."
                                className="w-full lg:w-64 px-4 py-2 border rounded-full focus:ring-indigo-500 focus:border-indigo-500 transition shadow-inner"
                                onFocus={() => setIsSearchOpen(true)}
                                onBlur={handleSearchBlur}
                                aria-label="Search products"
                            />
                        </div>
                    </div>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden lg:flex space-x-6 text-sm font-medium text-gray-600">
                        <a href="#" className="hover:text-indigo-600 transition">Shop</a>
                        <a href="#" className="hover:text-indigo-600 transition">About</a>
                        <a href="#" className="hover:text-indigo-600 transition">Support</a>
                    </nav>

                    {/* Cart Icon (Always visible) */}
                    <button 
                        aria-label="View shopping cart" 
                        className="p-2 rounded-full hover:bg-gray-100 transition relative"
                        onClick={() => setIsCartOpen(true)}
                    >
                        <ShoppingCart size={20} />
                        {totalCartCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center -mt-1 -mr-1">
                                {totalCartCount}
                            </span>
                        )}
                    </button>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle mobile menu"
                        aria-expanded={isMenuOpen}
                        className="p-2 rounded-full hover:bg-gray-100 transition lg:hidden"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile Menu Drawer */}
            {isMenuOpen && (
                <div className="lg:hidden absolute w-full bg-white shadow-lg border-t z-50">
                    <nav className="flex flex-col p-4 space-y-2">
                        <a href="#" className="py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">Shop All</a>
                        <a href="#" className="py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">Collections</a>
                        <a href="#" className="py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">Account</a>
                        <a href="#" className="py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition">Help</a>
                    </nav>
                </div>
            )}
        </header>
    );
};

// ====================================================================
// Product Hero Components (Carousel & Lightbox) (Unchanged)
// ====================================================================

const ProductCarousel = ({ images, activeIndex, setActiveIndex }) => {
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const carouselRef = useRef(null);

    const nextSlide = () => setActiveIndex((prev) => (prev + 1) % images.length);
    const prevSlide = () => setActiveIndex((prev) => (prev - 1 + images.length) % images.length);

    const activeItem = images[activeIndex];

    const handleVideoTap = (e) => {
        const video = e.currentTarget;
        if (video.paused) {
            video.play();
            setIsVideoPlaying(true);
        } else {
            video.pause();
            setIsVideoPlaying(false);
        }
    };

    // Keyboard accessibility for carousel control
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [activeIndex]);

    // Simple Lightbox Modal
    const Lightbox = () => {
        if (!isLightboxOpen) return null;
        return (
            <div 
                className="fixed inset-0 bg-black bg-opacity-95 z-[100] flex items-center justify-center p-4"
                onClick={() => setIsLightboxOpen(false)}
            >
                <button 
                    onClick={() => setIsLightboxOpen(false)}
                    className="absolute top-4 right-4 text-white p-3 rounded-full bg-gray-800 hover:bg-gray-700 transition"
                    aria-label="Close image zoom"
                >
                    <X size={24} />
                </button>
                <img 
                    src={activeItem.url} 
                    alt={activeItem.alt} 
                    className="max-w-full max-h-full object-contain cursor-grab" 
                    style={{ touchAction: 'pinch-zoom' }} // Hint for mobile pinch-to-zoom
                />
            </div>
        );
    };

    return (
        <>
            {/* Main Carousel View */}
            <div className="relative group overflow-hidden rounded-xl shadow-lg bg-gray-100 mb-4" ref={carouselRef} role="region" aria-label="Product Image Gallery">
                {/* Image/Video Display */}
                <div className="aspect-square flex overflow-hidden">
                    {images.map((item, index) => (
                        <div 
                            key={item.id || index} 
                            className={`flex-shrink-0 w-full transition-transform duration-500 ease-in-out`}
                            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                            onClick={() => item.type === 'image' && setIsLightboxOpen(true)}
                            tabIndex={0}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${item.type} ${index + 1} of ${images.length}`}
                        >
                            {item.type === 'image' ? (
                                <img
                                    src={item.url}
                                    alt={item.alt}
                                    className="w-full h-full object-cover cursor-zoom-in"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center relative cursor-pointer" onClick={handleVideoTap}>
                                    <video
                                        src={item.url} // Use a real video URL here if available
                                        muted
                                        loop
                                        playsInline
                                        className="w-full h-full object-cover"
                                        onEnded={() => setIsVideoPlaying(false)}
                                    />
                                    {!isVideoPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 text-white text-lg font-bold">
                                            Tap to Play Video
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Carousel Indicators */}
                <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {images.map((_, index) => (
                        <button
                            key={index}
                            className={`h-2 w-2 rounded-full transition-all duration-300 ${activeIndex === index ? 'bg-white w-5' : 'bg-gray-400'}`}
                            onClick={() => setActiveIndex(index)}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>

            {/* Thumbnails (Horizontal Scroll Mobile) */}
            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide lg:justify-center">
                {images.map((item, index) => (
                    <div 
                        key={item.id || index}
                        className={`w-20 h-20 flex-shrink-0 rounded-lg border-2 overflow-hidden transition cursor-pointer 
                            ${activeIndex === index ? 'border-indigo-600 ring-2 ring-indigo-600' : 'border-gray-200 hover:border-gray-400'}`}
                        onClick={() => setActiveIndex(index)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Thumbnail for ${item.alt}`}
                    >
                        {item.type === 'image' ? (
                            <img src={item.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <div className="w-full h-full bg-gray-600 flex items-center justify-center text-white text-xs font-semibold">
                                VIDEO
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <Lightbox />
        </>
    );
};

// ====================================================================
// Product Info Components
// ====================================================================

const StarRating = ({ rating, count }) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
        <div className="flex items-center space-x-2">
            <div className="flex">
                {[...Array(fullStars)].map((_, i) => <Star key={`full-${i}`} size={16} className="text-yellow-400 fill-yellow-400" />)}
                {hasHalfStar && <Star size={16} className="text-yellow-400 fill-yellow-400 opacity-50" />}
                {[...Array(emptyStars)].map((_, i) => <Star key={`empty-${i}`} size={16} className="text-gray-300" />)}
            </div>
            <span className="text-sm font-medium text-gray-700">
                {rating.toFixed(1)} <span className="text-gray-500">({count} reviews)</span>
            </span>
        </div>
    );
};

const ProductInfoSection = ({ product, selectedVariant, setSelectedVariant, handleAddToCart, handleBuyNow }) => {
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('Details');

    // Get unique colors and sizes from variants
    const colors = Array.from(new Set(product.variants.map(v => v.color)));
    
    // Get available sizes for the *currently selected color*
    const sizesForSelectedColor = Array.from(new Set(product.variants.filter(v => v.color === selectedVariant.color).map(v => v.size)));

    // Find a variant based on selected color and size
    const getVariant = useCallback((color, size) => {
        return product.variants.find(v => v.color === color && v.size === size);
    }, [product.variants]);

    // Handle color change: find the first available size for the new color, or default to current size
    const handleColorChange = (newColor) => {
        // Try to find the same size in the new color
        let newVariant = getVariant(newColor, selectedVariant.size);
        
        // If same size doesn't exist, find the first available size for that new color
        if (!newVariant) {
            const firstAvailableSize = product.variants.find(v => v.color === newColor && v.stock > 0);
            if(firstAvailableSize) {
                newVariant = firstAvailableSize;
            } else {
                // If all are out of stock, just pick the first one
                newVariant = product.variants.find(v => v.color === newColor);
            }
        }
        
        if (newVariant) {
            setSelectedVariant(newVariant);
        }
    };

    // Handle size change
    const handleSizeChange = (newSize) => {
        const newVariant = getVariant(selectedVariant.color, newSize);
        if (newVariant) {
            setSelectedVariant(newVariant);
        }
    };

    // Determine stock status for a size button
    const isSizeInStock = (size) => {
        const variant = getVariant(selectedVariant.color, size);
        return variant && variant.stock > 0;
    };

    const onAddToCartClick = () => {
        handleAddToCart(selectedVariant, quantity);
    };

    const onBuyNowClick = () => {
        handleBuyNow(selectedVariant, quantity);
    };

    // Component for Quantity Selector
    const QuantitySelector = () => (
        <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden w-full max-w-[120px]">
            <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
                className="p-3 text-gray-600 hover:bg-gray-100 transition focus:outline-none"
            >
                <Minus size={16} />
            </button>
            <input
                type="number"
                value={quantity}
                min="1"
                max={selectedVariant.stock > 0 ? selectedVariant.stock : 1}
                onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value) || 1);
                    setQuantity(selectedVariant.stock > 0 ? Math.min(val, selectedVariant.stock) : 1);
                }}
                className="w-full text-center border-x border-gray-300 text-lg font-medium text-gray-800 focus:outline-none py-2"
                aria-label="Product quantity"
                disabled={selectedVariant.stock === 0}
            />
            <button
                onClick={() => setQuantity(selectedVariant.stock > 0 ? Math.min(quantity + 1, selectedVariant.stock) : 1)}
                aria-label="Increase quantity"
                className="p-3 text-gray-600 hover:bg-gray-100 transition focus:outline-none"
                disabled={selectedVariant.stock === 0 || quantity >= selectedVariant.stock}
            >
                <Plus size={16} />
            </button>
        </div>
    );

    // Component for Desktop/Inline CTA Buttons
    const DesktopCTAs = () => (
        <div className="hidden lg:flex gap-4 mt-8">
            <QuantitySelector />
            <button
                onClick={onAddToCartClick}
                disabled={selectedVariant.stock === 0}
                className="flex-grow px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl shadow-lg hover:bg-gray-700 transition-all disabled:opacity-50"
            >
                {selectedVariant.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
            <button
                onClick={onBuyNowClick}
                disabled={selectedVariant.stock === 0}
                className="flex-grow px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
                Buy Now
            </button>
        </div>
    );

    return (
        <div className="p-4 lg:p-0">
            {/* Title, Price, Rating */}
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-2">{product.title}</h1>
            <StarRating rating={product.averageRating} count={product.reviewCount} />
            <div className="flex items-baseline space-x-3 my-4 border-b pb-4">
                {/* Price Display: using formatRupees helper */}
                <p className="text-3xl font-bold text-gray-900">{formatRupees(selectedVariant.price)}</p>
                {selectedVariant.compareAt && (
                    <p className="text-xl text-gray-400 line-through">{formatRupees(selectedVariant.compareAt)}</p>
                )}
            </div>

            {/* Variant Selectors */}
            <div className="space-y-6 mb-8">
                {/* Color Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color: <span className="font-semibold text-gray-900">{selectedVariant.color}</span></label>
                    <div className="flex space-x-3">
                        {colors.map(color => (
                            <button
                                key={color}
                                onClick={() => handleColorChange(color)}
                                className={`w-10 h-10 rounded-full border-2 transition-all shadow-md`}
                                style={{ 
                                    backgroundColor: color.includes('Black') ? '#212a38' : (color.includes('Green') ? '#10b981' : '#ccc'), 
                                    borderColor: selectedVariant.color === color ? '#4f46e5' : 'transparent', 
                                    borderWidth: selectedVariant.color === color ? '4px' : '2px' 
                                }}
                                aria-label={`Select color ${color}`}
                            />
                        ))}
                    </div>
                </div>
                
                {/* Size Selector */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size: <span className="font-semibold text-gray-900">{selectedVariant.size}</span></label>
                    <div className="flex flex-wrap gap-2">
                        {sizesForSelectedColor.map(size => (
                            <button
                                key={size}
                                onClick={() => handleSizeChange(size)}
                                disabled={!isSizeInStock(size)}
                                className={`px-4 py-2 rounded-full border text-sm font-medium transition ${
                                    selectedVariant.size === size
                                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                        : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                                } disabled:opacity-30 disabled:cursor-not-allowed`}
                                aria-label={`Select size ${size}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                    <p className={`mt-2 text-sm ${selectedVariant.stock === 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedVariant.stock === 0 ? 'Out of Stock' : (selectedVariant.stock <= 10 ? `Only ${selectedVariant.stock} left!` : 'In Stock')} - SKU: {selectedVariant.sku}
                    </p>
                </div>
            </div>

            {/* Key Features (Short Bullet Points) */}
            <ul className="list-disc pl-5 space-y-2 text-gray-600 mb-8 p-4 bg-gray-50 rounded-xl">
                {product.keyFeatures.map((feature, index) => (
                    <li key={index} className="text-sm">{feature}</li>
                ))}
            </ul>

            {/* Desktop CTAs (Hidden on Mobile) */}
            <DesktopCTAs />

            {/* Collapsible Description Tabs */}
            <div className="border-t pt-6 mt-8">
                <div className="flex border-b">
                    {['Details', 'Shipping & Returns'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium transition border-b-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="py-4 text-gray-600 leading-relaxed">
                    {activeTab === 'Details' && (
                        <p>{product.description}</p>
                    )}
                    {activeTab === 'Shipping & Returns' && (
                        <div className='space-y-4'>
                            <p className='flex items-start'>
                                <Truck size={20} className='mr-2 text-indigo-500 flex-shrink-0' />
                                <span className='text-sm'>Shipping is processed within 1-2 business days. Free shipping available on orders over ₹15,000.</span>
                            </p>
                            <p className='flex items-start'>
                                <RefreshCw size={20} className='mr-2 text-indigo-500 flex-shrink-0' />
                                <span className='text-sm'>We offer a hassle-free 30-day return policy. Items must be unworn and unwashed.</span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Product Metadata */}
            <div className="text-xs text-gray-400 mt-4 border-t pt-4">
                <p>Product Type: Hoodie</p>
                <p>Tags: Premium, Fleece, Comfort, Stellar</p>
            </div>
        </div>
    );
};

// ====================================================================
// Sticky Mobile Action Bar
// ====================================================================

const StickyMobileBar = ({ selectedVariant, totalCartCount, handleAddToCart, handleBuyNow }) => {
    const { width } = useViewportSize();
    const isMobile = width < 1024; // lg breakpoint

    if (!isMobile) return null; // Only show on mobile

    const onAddToCartClick = () => {
        handleAddToCart(selectedVariant, 1); // Adds 1 item from mobile bar
    };

    const onBuyNowClick = () => {
        handleBuyNow(selectedVariant, 1); // Buys 1 item from mobile bar
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden">
            <div className="flex items-center gap-3 max-w-7xl mx-auto">
                {/* Secondary CTA (Add to Cart / Like) */}
                <button
                    onClick={onAddToCartClick}
                    disabled={selectedVariant.stock === 0}
                    className="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-300 w-16 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                    aria-label="Add to cart"
                >
                    <ShoppingCart size={20} />
                    <span className="text-xs mt-1">Add</span>
                </button>
                
                {/* Primary CTA (Buy Now) */}
                <button
                    onClick={onBuyNowClick}
                    disabled={selectedVariant.stock === 0}
                    className="flex-grow px-4 py-3 bg-indigo-600 text-white text-base font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                    {selectedVariant.stock === 0 ? 'Out of Stock' : `Buy Now - ${formatRupees(selectedVariant.price)}`}
                </button>
            </div>

            {/* Mini Cart Count Indicator (Just above the bar) */}
            {totalCartCount > 0 && (
                <div className="absolute top-[-10px] right-3 bg-red-600 text-white h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md animate-bounce">
                    {totalCartCount}
                </div>
            )}
        </div>
    );
};

// ====================================================================
// Social Proof and Recommendations
// ====================================================================

const ReviewsSection = ({ reviews, averageRating, reviewCount }) => {
    const [visibleCount, setVisibleCount] = useState(2);

    return (
        <div className="p-4 lg:p-0 border-t pt-8 mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Reviews ({reviewCount})</h2>
            <div className="flex items-center space-x-4 mb-6 pb-4 border-b">
                <p className="text-4xl font-extrabold text-indigo-600">{averageRating.toFixed(1)}</p>
                <StarRating rating={averageRating} count={reviewCount} />
            </div>

            <div className="space-y-6">
                {reviews.slice(0, visibleCount).map(review => (
                    <div key={review.id} className="p-4 border rounded-xl bg-white shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-gray-900">{review.title}</h3>
                            <div className="flex">
                                {[...Array(review.rating)].map((_, i) => <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />)}
                            </div>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{review.text}</p>
                        <p className="text-xs text-gray-400">By {review.user} | {review.date}</p>
                    </div>
                ))}
            </div>

            {visibleCount < reviews.length && (
                <button
                    onClick={() => setVisibleCount(prev => prev + 5)}
                    className="mt-6 w-full py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                >
                    Load More Reviews ({reviews.length - visibleCount} left)
                </button>
            )}
        </div>
    );
};

const RecommendedProducts = ({ products, title = "You Might Also Like" }) => {
    return (
        <div className="p-4 lg:p-0 border-t pt-8 mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
            
            {/* Horizontal Scroll Carousel (Mobile) / Grid (Desktop) */}
            <div className="flex space-x-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-x-0">
                {products.map(product => (
                    <div key={product.id} className="flex-shrink-0 w-64 lg:w-auto bg-white border rounded-xl shadow-md overflow-hidden hover:shadow-xl transition">
                        <img src={product.imageUrl} alt={product.alt} className="w-full h-48 object-cover" loading="lazy" />
                        <div className="p-3">
                            <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                            {/* Price Display: using formatRupees helper */}
                            <p className="text-lg font-bold text-indigo-600 my-1">{formatRupees(product.price)}</p>
                            <button className="w-full mt-2 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition">
                                Quick Add
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const FooterSection = () => (
    <footer className="bg-gray-900 text-white mt-16 pt-12 pb-20 lg:pb-12 border-t-8 border-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
                {/* Column 1: Newsletter */}
                <div className="col-span-2 lg:col-span-2">
                    <h3 className="text-xl font-bold mb-4">Stay Stellar</h3>
                    <p className="text-gray-400 mb-4 text-sm">Sign up for exclusive deals and new product drops.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            placeholder="Your email address"
                            className="px-4 py-2 w-full sm:flex-grow rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <button className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
                            Subscribe
                        </button>
                    </div>
                </div>

                {/* Column 2: Shop */}
                <div>
                    <h4 className="font-semibold mb-3">Shop</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white transition">New Arrivals</a></li>
                        <li><a href="#" className="hover:text-white transition">Hoodies</a></li>
                        <li><a href="#" className="hover:text-white transition">T-Shirts</a></li>
                        <li><a href="#" className="hover:text-white transition">Sale</a></li>
                    </ul>
                </div>

                {/* Column 3: Support */}
                <div>
                    <h4 className="font-semibold mb-3">Support</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white transition">Contact Us</a></li>
                        <li><a href="#" className="hover:text-white transition">FAQ</a></li>
                        <li><a href="#" className="hover:text-white transition">Shipping Info</a></li>
                        <li><a href="#" className="hover:text-white transition">Returns</a></li>
                    </ul>
                </div>

                {/* Column 4: Policies */}
                <div>
                    <h4 className="font-semibold mb-3">Company</h4>
                    <ul className="space-y-2 text-sm text-gray-400">
                        <li><a href="#" className="hover:text-white transition">Our Story</a></li>
                        <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                        <li><a href="#" className="hover:text-white transition">Terms of Use</a></li>
                        <li><a href="#" className="hover:text-white transition">Accessibility</a></li>
                    </ul>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col lg:flex-row justify-between items-center text-sm text-gray-500">
                <p>&copy; {new Date().getFullYear()} Stellar Apparel. All rights reserved.</p>
                <div className="flex space-x-4 mt-4 lg:mt-0">
                    {/* Mock Social Icons */}
                    <Heart size={20} className='hover:text-indigo-400 transition' />
                    <Layers size={20} className='hover:text-indigo-400 transition' />
                    <Star size={20} className='hover:text-indigo-400 transition' />
                </div>
            </div>
        </div>
    </footer>
);

// ====================================================================
// NEW: Cart Modal
// ====================================================================

const CartModal = ({ isOpen, setIsOpen, cartItems, setCartItems, handleCheckoutFromCart, recommendations }) => {
    const total = cartItems.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);

    const updateQuantity = (sku, newQuantity) => {
        if (newQuantity < 1) {
            // Remove item if quantity is less than 1
            setCartItems(prevItems => prevItems.filter(item => item.variant.sku !== sku));
        } else {
            // Update quantity
            setCartItems(prevItems =>
                prevItems.map(item =>
                    item.variant.sku === sku ? { ...item, quantity: newQuantity } : item
                )
            );
        }
    };

    const removeItem = (sku) => {
        setCartItems(prevItems => prevItems.filter(item => item.variant.sku !== sku));
    };
    
    // Find the image URL for a given variant
    const getVariantImage = (variant) => {
        const image = PRODUCT_DATA.images.find(img => img.id === variant.imageId);
        return image ? image.url : 'https://placehold.co/100x100/gray/white?text=Img';
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity" 
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            ></div>
            
            {/* Cart Panel */}
            <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[60] shadow-xl flex flex-col transition-transform transform translate-x-0">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Shopping Cart</h2>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition"
                        aria-label="Close cart"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items */}
                {cartItems.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-4 text-center">
                        <ShoppingCart size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-800">Your cart is empty</h3>
                        <p className="text-gray-500 text-sm">Looks like you haven't added anything yet.</p>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="mt-6 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition"
                        >
                            Start Shopping
                        </button>
                    </div>
                ) : (
                    <div className="flex-grow overflow-y-auto p-4 space-y-4">
                        {cartItems.map(item => (
                            <div key={item.variant.sku} className="flex gap-4 p-4 border rounded-lg shadow-sm">
                                <img 
                                    src={getVariantImage(item.variant)} 
                                    alt={item.variant.sku} 
                                    className="w-24 h-24 object-cover rounded-lg flex-shrink-0" 
                                />
                                <div className="flex-grow flex flex-col justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-800">{PRODUCT_DATA.title}</h3>
                                        <p className="text-xs text-gray-500">{item.variant.color} / {item.variant.size}</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{formatRupees(item.variant.price)}</p>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        {/* Quantity Selector */}
                                        <div className="flex items-center border border-gray-200 rounded-md overflow-hidden text-sm">
                                            <button 
                                                onClick={() => updateQuantity(item.variant.sku, item.quantity - 1)}
                                                className="p-1.5 text-gray-600 hover:bg-gray-100 transition"
                                                aria-label="Decrease quantity"
                                            >
                                                <Minus size={14} />
                                            </button>
                                            <span className="px-3 font-medium">{item.quantity}</span>
                                            <button 
                                                onClick={() => updateQuantity(item.variant.sku, item.quantity + 1)}
                                                className="p-1.5 text-gray-600 hover:bg-gray-100 transition"
                                                aria-label="Increase quantity"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        </div>
                                        {/* Remove Button */}
                                        <button 
                                            onClick={() => removeItem(item.variant.sku)}
                                            className="text-red-500 hover:text-red-700 transition"
                                            aria-label="Remove item"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recommendations in Cart */}
                {cartItems.length > 0 && (
                     <div className="p-4 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">You might also like...</h4>
                        <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
                            {recommendations.slice(0, 2).map(rec => (
                                <div key={rec.id} className="flex-shrink-0 w-32 text-center">
                                    <img src={rec.imageUrl} alt={rec.alt} className="w-full h-24 object-cover rounded-lg" />
                                    <p className="text-xs font-medium text-gray-700 mt-1 truncate">{rec.title}</p>
                                    <p className="text-xs font-bold text-indigo-600">{formatRupees(rec.price)}</p>
                                </div>
                            ))}
                        </div>
                     </div>
                )}


                {/* Footer / Checkout Button */}
                {cartItems.length > 0 && (
                    <div className="p-4 border-t bg-gray-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold text-gray-900">Subtotal:</span>
                            <span className="text-xl font-bold text-gray-900">{formatRupees(total)}</span>
                        </div>
                        <button 
                            onClick={handleCheckoutFromCart}
                            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            Proceed to Checkout <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

// ====================================================================
// NEW: Checkout Modal
// ====================================================================

const CheckoutModal = ({ isOpen, setIsOpen, checkoutItems, clearCart }) => {
    const [formState, setFormState] = useState({ name: '', address: '', email: '', payment: 'upi' });
    const [isOrderPlaced, setIsOrderPlaced] = useState(false);

    const total = checkoutItems.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Mock order placement
        console.log("Order placed with data:", formState, "for items:", checkoutItems);
        setIsOrderPlaced(true);
        // Clear the main cart after placing order
        clearCart(); 
        
        // Reset modal after a delay
        setTimeout(() => {
            setIsOrderPlaced(false);
            setIsOpen(false);
            setFormState({ name: '', address: '', email: '', payment: 'upi' });
        }, 3000);
    };
    
    // Find the image URL for a given variant
    const getVariantImage = (variant) => {
        const image = PRODUCT_DATA.images.find(img => img.id === variant.imageId);
        return image ? image.url : 'https://placehold.co/100x100/gray/white?text=Img';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isOrderPlaced ? "Order Confirmed!" : "Complete Your Purchase"}
                    </h2>
                    <button 
                        onClick={() => setIsOpen(false)} 
                        className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition"
                        aria-label="Close checkout"
                    >
                        <X size={24} />
                    </button>
                </div>

                {isOrderPlaced ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <svg className="w-20 h-20 text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <h3 className="text-2xl font-bold text-gray-900">Thank You!</h3>
                        <p className="text-gray-600 mt-2">Your order has been placed successfully. A confirmation email has been sent to {formState.email}.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
                        {/* Scrollable Content */}
                        <div className="overflow-y-auto p-6 space-y-6">
                            {/* Order Summary */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Order Summary</h3>
                                <div className="space-y-3 max-h-40 overflow-y-auto pr-2">
                                    {checkoutItems.map(item => (
                                        <div key={item.variant.sku} className="flex items-center gap-3">
                                            <img 
                                                src={getVariantImage(item.variant)} 
                                                alt={item.variant.sku} 
                                                className="w-12 h-12 object-cover rounded-lg flex-shrink-0" 
                                            />
                                            <div className="flex-grow">
                                                <p className="text-sm font-medium text-gray-700 truncate">{PRODUCT_DATA.title} ({item.quantity}x)</p>
                                                <p className="text-xs text-gray-500">{item.variant.color} / {item.variant.size}</p>
                                            </div>
                                            <p className="text-sm font-semibold">{formatRupees(item.variant.price * item.quantity)}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between items-baseline mt-4 pt-4 border-t">
                                    <span className="text-lg font-bold text-gray-900">Total:</span>
                                    <span className="text-2xl font-extrabold text-indigo-600">{formatRupees(total)}</span>
                                </div>
                            </div>
                            
                            {/* Shipping Form */}
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">Shipping & Payment</h3>
                                <div className="space-y-4">
                                    <input type="text" name="name" placeholder="Full Name" value={formState.name} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                                    <input type="email" name="email" placeholder="Email Address" value={formState.email} onChange={handleChange} required className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                                    <textarea name="address" placeholder="Shipping Address" value={formState.address} onChange={handleChange} required rows="3" className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                                    
                                    <select name="payment" value={formState.payment} onChange={handleChange} className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-indigo-500 focus:border-indigo-500">
                                        <option value="upi">UPI / PayTM</option>
                                        <option value="card">Credit/Debit Card</option>
                                        <option value="cod">Cash on Delivery (COD)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer Button */}
                        <div className="p-6 border-t bg-gray-50">
                            <button 
                                type="submit" 
                                className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                            >
                                Place Order - {formatRupees(total)}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};


// ====================================================================
// Main Application Component
// ====================================================================

const App = () => {
    // Initialize state with the first variant as default
    const [selectedVariant, setSelectedVariant] = useState(PRODUCT_DATA.variants[0]);
    
    // State for Modals
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // State for Cart & Checkout
    const [cartItems, setCartItems] = useState([]); // Array of { variant, quantity }
    const [checkoutItems, setCheckoutItems] = useState([]); // Items to be purchased
    
    // State for Carousel
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Derived State: Total item count for cart badge
    const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    // Effect to switch carousel image when variant changes
    useEffect(() => {
        const newImageId = selectedVariant.imageId;
        const newIndex = PRODUCT_DATA.images.findIndex(img => img.id === newImageId);
        if (newIndex !== -1) {
            setActiveImageIndex(newIndex);
        }
    }, [selectedVariant]);

    // --- LOGIC FUNCTIONS ---

    // Add to Cart
    const handleAddToCart = (variantToAdd, quantityToAdd) => {
        setCartItems(prevItems => {
            const existingItemIndex = prevItems.findIndex(item => item.variant.sku === variantToAdd.sku);
            
            if (existingItemIndex > -1) {
                // Update quantity
                const newItems = [...prevItems];
                newItems[existingItemIndex].quantity += quantityToAdd;
                return newItems;
            } else {
                // Add new item
                return [...prevItems, { variant: variantToAdd, quantity: quantityToAdd }];
            }
        });
        // Optionally open the cart on add
        // setIsCartOpen(true); 
    };

    // Buy Now (triggers checkout with specific items)
    const handleBuyNow = (variantToBuy, quantityToBuy) => {
        setCheckoutItems([{ variant: variantToBuy, quantity: quantityToBuy }]);
        setIsCheckoutOpen(true);
    };

    // Checkout from Cart (triggers checkout with all cart items)
    const handleCheckoutFromCart = () => {
        if (cartItems.length === 0) return;
        setCheckoutItems(cartItems);
        setIsCartOpen(false);
        setIsCheckoutOpen(true);
    };

    // Clear Cart (used after successful checkout)
    const clearCart = () => {
        setCartItems([]);
    };


    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <AnnouncementBanner />
            <Header 
                totalCartCount={totalCartCount} 
                setIsCartOpen={setIsCartOpen} 
            />

            <main className="flex-grow max-w-7xl mx-auto w-full px-0 sm:px-6 lg:px-8 py-8 lg:py-12">
                
                <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
                    
                    {/* Left/Top: Product Hero (Carousel) */}
                    <div className="lg:col-span-1 px-4 sm:px-0 mb-8 lg:mb-0">
                        <ProductCarousel 
                            images={PRODUCT_DATA.images} 
                            activeIndex={activeImageIndex}
                            setActiveIndex={setActiveImageIndex}
                        />
                    </div>

                    {/* Right/Bottom: Product Info */}
                    <div className="lg:col-span-1">
                        <ProductInfoSection
                            product={PRODUCT_DATA}
                            selectedVariant={selectedVariant}
                            setSelectedVariant={setSelectedVariant}
                            handleAddToCart={handleAddToCart}
                            handleBuyNow={handleBuyNow}
                        />
                    </div>
                </div>

                {/* Reviews and Recommended Products Sections */}
                <div className="max-w-5xl mx-auto mt-16 px-4 sm:px-0">
                    <ReviewsSection 
                        reviews={PRODUCT_DATA.reviews}
                        averageRating={PRODUCT_DATA.averageRating}
                        reviewCount={PRODUCT_DATA.reviewCount}
                    />
                    <RecommendedProducts products={PRODUCT_DATA.recommendations} />
                </div>

            </main>

            {/* Mobile Sticky Action Bar */}
            <StickyMobileBar
                selectedVariant={selectedVariant}
                totalCartCount={totalCartCount}
                handleAddToCart={handleAddToCart}
                handleBuyNow={handleBuyNow}
            />

            <FooterSection />

            {/* MODALS (Rendered at top level) */}
            <CartModal 
                isOpen={isCartOpen}
                setIsOpen={setIsCartOpen}
                cartItems={cartItems}
                setCartItems={setCartItems}
                handleCheckoutFromCart={handleCheckoutFromCart}
                recommendations={PRODUCT_DATA.recommendations}
            />
            
            <CheckoutModal
                isOpen={isCheckoutOpen}
                setIsOpen={setIsCheckoutOpen}
                checkoutItems={checkoutItems}
                clearCart={clearCart}
            />

        </div>
    );
};

export default App;