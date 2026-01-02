import { HERITAGE_PRODUCTS } from '../../data/heritageProducts';
import { Sparkles, Crown, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

export default function HeritageProductGrid({ onProductClick, isDarkMode = false }) {
  return (
    <section className={`py-8 sm:py-12 md:py-16 lg:py-20 transition-colors duration-700 ${
      isDarkMode 
        ? 'bg-gradient-to-b from-black via-heritage/10 to-black' 
        : 'bg-gradient-to-b from-white via-warm-sand/10 to-white'
    }`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Section Header - Optimized for Mobile */}
        <div className="text-center mb-8 sm:mb-12 md:mb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-2 mb-3 sm:mb-4">
            <div className={`h-px w-8 sm:w-12 transition-colors duration-700 ${
              isDarkMode 
                ? 'bg-gradient-to-r from-transparent to-royal-orange' 
                : 'bg-gradient-to-r from-transparent to-copper'
            }`}></div>
            <Sparkles className={`w-5 h-5 sm:w-6 sm:h-6 animate-pulse transition-colors duration-700 ${
              isDarkMode ? 'text-royal-orange' : 'text-copper'
            }`} />
            <div className={`h-px w-8 sm:w-12 transition-colors duration-700 ${
              isDarkMode 
                ? 'bg-gradient-to-l from-transparent to-royal-orange' 
                : 'bg-gradient-to-l from-transparent to-copper'
            }`}></div>
          </div>
          <h2 className={`font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 transition-all duration-700 ${
            isDarkMode 
              ? 'bg-gradient-to-r from-royal-orange via-copper to-royal-orange bg-clip-text text-transparent' 
              : 'bg-gradient-to-r from-heritage via-copper to-heritage bg-clip-text text-transparent'
          }`}>
            Our Exclusive Collection
          </h2>
          <p className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto px-4 transition-colors duration-700 ${
            isDarkMode ? 'text-warm-sand/70' : 'text-gray-600'
          }`}>
            Each piece tells a story of heritage, crafted with precision and passion
          </p>
        </div>

        {/* Products Grid - Mobile First */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {HERITAGE_PRODUCTS.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onProductClick(product)}
              index={index}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductCard({ product, onClick, index, isDarkMode = false }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-700 cursor-pointer animate-fadeIn ${
        isDarkMode 
          ? 'bg-gradient-to-br from-heritage/40 via-black to-heritage/40 border border-copper/20' 
          : 'bg-white'
      }`}
      style={{ 
        animationDelay: `${index * 100}ms`,
        transform: isHovered ? 'translateY(-8px) scale(1.02)' : 'translateY(0) scale(1)',
      }}
    >
      {/* Premium Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ${
        isDarkMode 
          ? 'from-royal-orange/30 via-transparent to-copper/30' 
          : 'from-copper/20 via-transparent to-heritage/20'
      }`}></div>
      
      {/* Tag Badge - Mobile Optimized */}
      <div className="absolute top-3 right-3 z-10 animate-slideInRight">
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold backdrop-blur-md shadow-lg transform group-hover:scale-110 transition-all duration-300 ${
            product.isPremium
              ? isDarkMode 
                ? 'bg-gradient-to-r from-royal-orange to-copper text-black' 
                : 'bg-gradient-to-r from-copper to-orange-600 text-white'
              : isDarkMode
                ? 'bg-gradient-to-r from-copper to-heritage text-white'
                : 'bg-gradient-to-r from-heritage to-blue-900 text-white'
          }`}
        >
          {product.isPremium ? (
            <>
              <Crown size={12} className="sm:w-3.5 sm:h-3.5 animate-pulse" />
              <span className="hidden sm:inline">{product.tag}</span>
              <span className="sm:hidden">Premium</span>
            </>
          ) : (
            <>
              <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 animate-pulse" />
              <span className="hidden sm:inline">{product.tag}</span>
              <span className="sm:hidden">Signature</span>
            </>
          )}
        </span>
      </div>

      {/* Favorite Icon - Top Left */}
      <div className="absolute top-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-fadeIn">
        <button className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full backdrop-blur-sm shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-300 ${
          isDarkMode 
            ? 'bg-white/10 hover:bg-red-900/50' 
            : 'bg-white/90 hover:bg-red-50'
        }`}>
          <span className="text-base sm:text-lg">🤍</span>
        </button>
      </div>

      {/* Image Container - Mobile Optimized */}
      <div className={`relative aspect-[3/4] sm:aspect-[4/5] overflow-hidden transition-colors duration-700 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-heritage/40 to-black/40' 
          : 'bg-gradient-to-br from-warm-sand/30 to-warm-sand/10'
      }`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-all duration-700"
          style={{
            transform: isHovered ? 'scale(1.15) rotate(2deg)' : 'scale(1) rotate(0deg)',
            opacity: isDarkMode ? 0.9 : 1,
          }}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={index < 3}
        />
        
        {/* Shimmer Effect */}
        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transform -translate-x-full group-hover:translate-x-full transition-all duration-1000 ${
          isDarkMode 
            ? 'bg-gradient-to-tr from-transparent via-royal-orange/20 to-transparent' 
            : 'bg-gradient-to-tr from-transparent via-white/10 to-transparent'
        }`}></div>
        
        {/* Overlay on hover - Desktop */}
        <div className={`hidden sm:block absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          isDarkMode 
            ? 'bg-gradient-to-t from-black/90 via-heritage/60 to-transparent' 
            : 'bg-gradient-to-t from-heritage/90 via-heritage/50 to-transparent'
        }`}>
          <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-6 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 ${
            isDarkMode ? 'text-warm-sand' : 'text-white'
          }`}>
            <p className="text-xs md:text-sm font-semibold mb-1 flex items-center gap-2">
              <Sparkles size={14} />
              {product.category}
            </p>
            <p className="text-xs opacity-90 line-clamp-2">{product.description}</p>
          </div>
        </div>

        {/* Quick View Badge - Mobile Bottom */}
        <div className={`sm:hidden absolute bottom-0 left-0 right-0 p-3 transition-colors duration-700 ${
          isDarkMode 
            ? 'bg-gradient-to-t from-black to-transparent' 
            : 'bg-gradient-to-t from-black/80 to-transparent'
        }`}>
          <p className={`text-xs font-medium transition-colors duration-700 ${
            isDarkMode ? 'text-copper' : 'text-white/90'
          }`}>{product.category}</p>
        </div>
      </div>

      {/* Content - Mobile First */}
      <div className="p-4 sm:p-5 md:p-6">
        <h3 className={`font-serif text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 transition-colors duration-700 line-clamp-1 ${
          isDarkMode 
            ? 'text-copper group-hover:text-royal-orange' 
            : 'text-heritage group-hover:text-copper'
        }`}>
          {product.name}
        </h3>

        {product.isPremium ? (
          <div className="space-y-2">
            <p className={`text-xs sm:text-sm italic font-medium transition-colors duration-700 ${
              isDarkMode ? 'text-warm-sand/70' : 'text-gray-600'
            }`}>
              Premium — Personalized design
            </p>
            <div className={`flex items-center justify-between text-xs rounded-lg p-2 transition-colors duration-700 ${
              isDarkMode 
                ? 'text-warm-sand/60 bg-white/5' 
                : 'text-gray-500 bg-warm-sand/20'
            }`}>
              <span className="flex items-center gap-1">
                ⏱️ <span className="hidden sm:inline">{product.craftingTime}</span>
                <span className="sm:hidden">{product.craftingTime.split(' ')[0]}d</span>
              </span>
              <span className="flex items-center gap-1">
                ⚖️ <span className="hidden sm:inline">Min. {product.minWeight}</span>
                <span className="sm:hidden">{product.minWeight}</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className={`text-xs sm:text-sm font-medium transition-colors duration-700 ${
              isDarkMode ? 'text-warm-sand/70' : 'text-gray-600'
            }`}>Ready to customize</p>
            {product.basePrice && (
              <p className={`text-xl sm:text-2xl font-bold transition-all duration-700 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-royal-orange to-copper bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-heritage to-copper bg-clip-text text-transparent'
              }`}>
                ₹{product.basePrice.toLocaleString()}
                <span className={`text-xs sm:text-sm font-normal transition-colors duration-700 ${
                  isDarkMode ? 'text-warm-sand/50' : 'text-gray-500'
                }`}> onwards</span>
              </p>
            )}
            {product.inStock && (
              <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium transition-colors duration-700 ${
                isDarkMode 
                  ? 'text-green-400 bg-green-900/30' 
                  : 'text-green-600 bg-green-50'
              }`}>
                ✓ In Stock
              </span>
            )}
          </div>
        )}

        {/* CTA Button - Premium Design */}
        <button className={`mt-4 w-full py-2.5 sm:py-3 text-sm sm:text-base font-bold rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 transform active:scale-95 flex items-center justify-center gap-2 group/btn ${
          isDarkMode 
            ? 'bg-gradient-to-r from-royal-orange via-copper to-royal-orange text-black hover:shadow-royal-orange/40' 
            : 'bg-gradient-to-r from-copper via-heritage to-copper text-white hover:shadow-copper/30'
        } bg-size-200 bg-pos-0 hover:bg-pos-100`}>
          <span>{product.isPremium ? 'Book Consultation' : 'Customize Now'}</span>
          <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform duration-300" />
        </button>
      </div>

      {/* Bottom Shine Effect */}
      <div className={`absolute bottom-0 left-0 right-0 h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
        isDarkMode 
          ? 'bg-gradient-to-r from-transparent via-royal-orange to-transparent' 
          : 'bg-gradient-to-r from-transparent via-copper to-transparent'
      }`}></div>
    </div>
  );
}
