import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, Star, Layers } from 'lucide-react';

export default function ProductCarousel({ images = [], rating = 4.8, reviewCount = 6 }) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [mobileIndex, setMobileIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef(null);

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  const goToPrev = () => {
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Mobile swipe handlers
  const handleTouchStart = (e) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      // Swipe left
      setMobileIndex((prev) => Math.min(prev + 1, images.length - 1));
    }
    if (touchStart - touchEnd < -75) {
      // Swipe right
      setMobileIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isLightboxOpen) return;
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  const gridImages = images.length > 0 ? images : [{ id: 1, type: 'image', url: '/varaha-assets/og.jpg', alt: 'Product' }];

  return (
    <>
      {/* === MOBILE: Full-width Swipe Carousel with Dots === */}
      <div className="lg:hidden relative">
        {/* Main Image Container */}
        <div
          ref={carouselRef}
          className="relative aspect-[3/4] bg-warm-sand overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Images Track */}
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${mobileIndex * 100}%)` }}
          >
            {gridImages.map((item, index) => (
              <div
                key={item.id || index}
                className="flex-shrink-0 w-full h-full relative"
                onClick={() => openLightbox(index)}
              >
                <img
                  src={item.url}
                  alt={item.alt || `Product image ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/varaha-assets/og.jpg';
                  }}
                />
              </div>
            ))}
          </div>

          {/* View Similar Button - Top Left */}
          <button className="absolute top-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-full shadow-md">
            <Layers size={16} className="text-heritage" />
            <span className="text-xs font-semibold text-heritage">View Similar</span>
          </button>

          {/* Rating Badge - Top Right */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2 py-1.5 rounded-full shadow-md">
            <span className="text-sm font-bold text-heritage">{rating}</span>
            <Star size={14} className="fill-copper text-copper" />
            <span className="text-xs text-matte-brown ml-0.5">{reviewCount}</span>
          </div>

          {/* Dot Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {gridImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setMobileIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${index === mobileIndex
                    ? 'bg-heritage w-5'
                    : 'bg-heritage/40'
                  }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* === DESKTOP: 2x2 Grid Layout === */}
      <div className="hidden lg:grid grid-cols-2 gap-3 md:gap-4">
        {gridImages.map((item, index) => (
          <div
            key={item.id || index}
            className="relative aspect-[3/4] bg-warm-sand rounded-lg overflow-hidden cursor-pointer group"
            onClick={() => openLightbox(index)}
          >
            <img
              src={item.url}
              alt={item.alt || `Product image ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading={index < 4 ? 'eager' : 'lazy'}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/varaha-assets/og.jpg';
              }}
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 rounded-full p-3 shadow-lg">
                <ZoomIn size={20} className="text-heritage" />
              </div>
            </div>

            {/* Image counter on first image */}
            {index === 0 && images.length > 1 && (
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-heritage shadow">
                1/{images.length}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <div className="max-w-4xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={gridImages[lightboxIndex]?.url}
              alt={gridImages[lightboxIndex]?.alt || 'Product'}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
              aria-label="Next image"
            >
              <ChevronRight size={28} />
            </button>
          )}

          {/* Image counter */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm font-medium">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}

          {/* Thumbnail strip */}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex space-x-2">
            {images.slice(0, 6).map((item, index) => (
              <button
                key={`lb-thumb-${item.id || index}`}
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(index); }}
                className={`w-12 h-12 rounded overflow-hidden border-2 transition ${index === lightboxIndex ? 'border-white' : 'border-white/30 hover:border-white/60'
                  }`}
              >
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
