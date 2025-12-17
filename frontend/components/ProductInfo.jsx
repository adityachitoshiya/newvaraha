import { useState } from 'react';
import { Star, Plus, Minus, Truck, RefreshCw, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../lib/productData';
import WishlistButton from './WishlistButton';
import ProductDeliveryWidget from './ProductDeliveryWidget';

export default function ProductInfo({ product, onAddToCart, onBuyNow }) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants && product.variants.length > 0 ? product.variants[0] : {});
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('details');

  const handleAddToCart = () => {
    onAddToCart(selectedVariant, quantity);
  };

  const handleBuyNow = () => {
    onBuyNow(selectedVariant, quantity);
  };

  const StarRating = ({ rating, count }) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

    return (
      <div className="flex items-center space-x-2">
        <div className="flex">
          {[...Array(fullStars)].map((_, i) => (
            <Star key={`full-${i}`} size={16} className="text-golden fill-golden" />
          ))}
          {hasHalf && <Star size={16} className="text-golden fill-golden opacity-50" />}
          {[...Array(emptyStars)].map((_, i) => (
            <Star key={`empty-${i}`} size={16} className="text-warm-brown/30" />
          ))}
        </div>
        <span className="text-sm text-warm-brown">
          {rating.toFixed(1)} <span className="text-warm-brown/60">({count} reviews)</span>
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title and Rating */}
      <div>
        <div className="flex items-start justify-between gap-2 sm:gap-4 mb-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-royal font-bold text-charcoal flex-1 pr-2">{product.title}</h1>
          <div className="flex-shrink-0 pt-1">
            <WishlistButton
              productId={product.id}
              productData={{
                id: product.id,
                name: product.title,
                price: selectedVariant.price,
                image: product.images[0],
                title: product.title
              }}
              size="lg"
              className="shadow-lg hover:shadow-xl"
            />
          </div>
        </div>
        <p className="text-warm-brown font-playfair mb-3 text-sm sm:text-base">{product.subtitle}</p>
        <StarRating rating={product.averageRating} count={product.reviewCount} />
      </div>

      {/* Price */}
      <div className="flex items-baseline space-x-3 pb-6 border-b border-golden/30">
        <span className="text-3xl font-bold text-royal-brown font-royal">{formatCurrency(selectedVariant.price)}</span>
        {selectedVariant.compareAt && (
          <>
            <span className="text-xl text-warm-brown/60 line-through">{formatCurrency(selectedVariant.compareAt)}</span>
            <span className="text-sm font-semibold text-golden bg-golden/10 px-2 py-1 rounded border border-golden/30">
              Save {Math.round(((selectedVariant.compareAt - selectedVariant.price) / selectedVariant.compareAt) * 100)}%
            </span>
          </>
        )}
      </div>

      {/* Variant Selector (if multiple) */}
      {product.variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2 font-playfair">
            Select Variant: <span className="font-semibold text-royal-brown">{selectedVariant.title}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${selectedVariant.id === variant.id
                  ? 'bg-royal-brown text-cream border-golden'
                  : 'bg-cream text-charcoal border-warm-brown/30 hover:border-golden'
                  }`}
              >
                {variant.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Status */}
      <div className="text-sm">
        {selectedVariant.inStock ? (
          <p className="text-golden font-medium flex items-center font-playfair">
            <span className="w-2 h-2 bg-golden rounded-full mr-2"></span>
            In Stock - SKU: {selectedVariant.sku}
          </p>
        ) : (
          <p className="text-warm-brown font-medium">Out of Stock</p>
        )}
      </div>

      {/* Key Features */}
      {product.keyFeatures && product.keyFeatures.length > 0 && (
        <div className="bg-cream border border-golden/20 rounded-xl p-4">
          <ul className="space-y-2">
            {product.keyFeatures.map((feature, index) => (
              <li key={index} className="flex items-start text-sm text-charcoal">
                <span className="text-golden mr-2">✓</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quantity Selector - Desktop */}
      <div className="hidden lg:block">
        <label className="block text-sm font-medium text-charcoal mb-2 font-playfair">Quantity</label>
        <div className="flex items-center space-x-3 w-32">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 border border-golden/30 rounded-lg hover:bg-warm-brown/10 transition"
            aria-label="Decrease quantity"
          >
            <Minus size={16} className="text-royal-brown" />
          </button>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-full text-center border border-golden/30 rounded-lg py-2 bg-cream text-charcoal focus:outline-none focus:ring-2 focus:ring-golden"
            min="1"
          />
          <button
            onClick={() => setQuantity(quantity + 1)}
            className="p-2 border border-golden/30 rounded-lg hover:bg-warm-brown/10 transition"
            aria-label="Increase quantity"
          >
            <Plus size={16} className="text-royal-brown" />
          </button>
        </div>
      </div>

      {/* Delivery Widget */}
      <ProductDeliveryWidget productId={product.id} />

      {/* CTA Buttons - Desktop */}
      <div className="hidden lg:flex gap-4">
        <button
          onClick={handleAddToCart}
          disabled={!selectedVariant.inStock}
          className="flex-1 px-8 py-4 bg-cream text-royal-brown border-2 border-golden font-semibold rounded-xl shadow-lg hover:bg-golden hover:text-charcoal transition disabled:opacity-50 disabled:cursor-not-allowed font-playfair"
        >
          Add to Cart
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!selectedVariant.inStock}
          className="flex-1 px-8 py-4 bg-royal-brown text-cream border-2 border-golden font-semibold rounded-xl shadow-lg hover:bg-warm-brown transition disabled:opacity-50 disabled:cursor-not-allowed font-playfair"
        >
          Buy Now
        </button>
      </div>

      {/* Collapsible Tabs */}
      <div className="border-t border-golden/30 pt-6 space-y-4">
        {/* Details Tab */}
        <div className="border border-golden/20 rounded-lg overflow-hidden bg-cream">
          <button
            onClick={() => setActiveTab(activeTab === 'details' ? '' : 'details')}
            className="w-full flex items-center justify-between p-4 bg-cream hover:bg-warm-brown/5 transition"
          >
            <span className="font-semibold text-charcoal font-playfair">Product Details</span>
            <ChevronDown
              size={20}
              className={`transform transition text-golden ${activeTab === 'details' ? 'rotate-180' : ''}`}
            />
          </button>
          {activeTab === 'details' && (
            <div className="p-4 bg-cream/50 text-charcoal text-sm leading-relaxed border-t border-golden/10">
              {product.description}
            </div>
          )}
        </div>

        {/* Shipping Tab */}
        <div className="border border-golden/20 rounded-lg overflow-hidden bg-cream">
          <button
            onClick={() => setActiveTab(activeTab === 'shipping' ? '' : 'shipping')}
            className="w-full flex items-center justify-between p-4 bg-cream hover:bg-warm-brown/5 transition"
          >
            <span className="font-semibold text-charcoal font-playfair">Shipping & Returns</span>
            <ChevronDown
              size={20}
              className={`transform transition text-golden ${activeTab === 'shipping' ? 'rotate-180' : ''}`}
            />
          </button>
          {activeTab === 'shipping' && (
            <div className="p-4 bg-cream/50 space-y-3 text-sm border-t border-golden/10">
              <div className="flex items-start">
                <Truck size={20} className="text-golden mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-charcoal">Free Shipping</p>
                  <p className="text-warm-brown">Delivered in 3-5 business days</p>
                </div>
              </div>
              <div className="flex items-start">
                <RefreshCw size={20} className="text-golden mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-charcoal">Easy Returns</p>
                  <p className="text-warm-brown">30-day return policy. Items must be unworn.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Meta */}
      {product.tags && product.tags.length > 0 && (
        <div className="text-xs text-warm-brown pt-4 border-t border-golden/30">
          <p>Tags: {product.tags.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
