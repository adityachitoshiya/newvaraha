import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Heart, ShoppingBag, Sparkles, Star } from 'lucide-react';

export default function QuickLookModal({ isOpen, onClose, product }) {
  if (!product) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-heritage hover:text-white transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Product Image */}
                  <div className="relative aspect-square bg-gradient-to-br from-warm-sand/30 to-ivory/50">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    
                    {/* Tag Badge */}
                    {product.tag && (
                      <div className="absolute top-4 left-4">
                        <span className={`
                          inline-block px-3 py-1 text-xs font-semibold rounded-full backdrop-blur-md
                          ${product.tag === 'Premium' ? 'bg-gradient-to-r from-yellow-600/90 to-amber-600/90 text-white' : ''}
                          ${product.tag === 'New' ? 'bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white' : ''}
                          ${product.tag === 'Bestseller' ? 'bg-gradient-to-r from-rose-500/90 to-pink-500/90 text-white' : ''}
                          ${product.tag === 'Trending' ? 'bg-gradient-to-r from-purple-500/90 to-indigo-500/90 text-white' : ''}
                          ${product.tag === 'Limited Edition' ? 'bg-gradient-to-r from-heritage/90 to-copper/90 text-warm-sand' : ''}
                          shadow-lg
                        `}>
                          {product.tag}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-8 flex flex-col">
                    {/* Product Name */}
                    <h2 className="font-cormorant text-3xl font-bold text-heritage mb-2">
                      {product.name}
                    </h2>

                    {/* Category & Style */}
                    <div className="flex gap-2 mb-4">
                      <span className="text-sm text-heritage/60">{product.category}</span>
                      <span className="text-heritage/30">•</span>
                      <span className="text-sm text-heritage/60">{product.style}</span>
                    </div>

                    {/* Rating (Mock) */}
                    <div className="flex items-center gap-2 mb-6">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-sm text-heritage/60">(48 reviews)</span>
                    </div>

                    {/* Description */}
                    <p className="text-heritage/70 text-sm leading-relaxed mb-6">
                      {product.description}
                    </p>

                    {/* Specifications */}
                    <div className="space-y-3 mb-6 pb-6 border-b border-heritage/10">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-heritage/60">Metal</span>
                        <span className="text-sm font-semibold text-heritage">{product.metal}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-heritage/60">Purity</span>
                        <span className="text-sm font-semibold text-heritage">{product.carat}</span>
                      </div>
                      {product.stones && product.stones.length > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-heritage/60">Stones</span>
                          <span className="text-sm font-semibold text-heritage">
                            {product.stones.join(', ')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-heritage/60">Polish</span>
                        <span className="text-sm font-semibold text-heritage">{product.polish}</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      {product.premium || !product.price ? (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-yellow-600" />
                          <span className="text-lg font-semibold text-heritage italic">
                            Custom Crafted - Enquire for Price
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-heritage font-cormorant">
                            {formatPrice(product.price)}
                          </span>
                          <span className="text-sm text-heritage/50 line-through">
                            {formatPrice(product.price * 1.15)}
                          </span>
                          <span className="text-sm font-semibold text-emerald-600">
                            Save 15%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-3 mt-auto">
                      <Link
                        href={`/product/${product.id}`}
                        className="block w-full bg-gradient-to-r from-heritage to-copper text-white text-center px-6 py-3.5 rounded-lg font-semibold hover:shadow-xl transition-all duration-300"
                      >
                        View Full Details
                      </Link>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <button className="flex items-center justify-center gap-2 border-2 border-heritage text-heritage px-4 py-2.5 rounded-lg font-semibold hover:bg-heritage hover:text-white transition-all duration-300">
                          <Heart className="w-4 h-4" />
                          Wishlist
                        </button>
                        <button className="flex items-center justify-center gap-2 border-2 border-heritage text-heritage px-4 py-2.5 rounded-lg font-semibold hover:bg-heritage hover:text-white transition-all duration-300">
                          <ShoppingBag className="w-4 h-4" />
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
