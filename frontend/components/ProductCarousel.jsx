import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Play } from 'lucide-react';

export default function ProductCarousel({ images = [] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const activeItem = images[activeIndex];

  const goToNext = () => {
    setActiveIndex((prev) => (prev + 1) % images.length);
    setIsVideoPlaying(false);
  };

  const goToPrev = () => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsVideoPlaying(false);
  };

  const goToSlide = (index) => {
    setActiveIndex(index);
    setIsVideoPlaying(false);
  };

  // Handle video play/pause
  const handleVideoClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    }
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
      goToNext();
    }
    if (touchStartX.current - touchEndX.current < -50) {
      goToPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'Escape' && isLightboxOpen) setIsLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen]);

  return (
    <>
      {/* Main Carousel */}
      <div className="space-y-4">
        {/* Main Image/Video Display */}
        <div 
          className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden group shadow-lg"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Slides Container */}
          <div className="relative w-full h-full">
            {images.map((item, index) => (
              <div
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-500 ${
                  index === activeIndex ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.alt}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setIsLightboxOpen(true)}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/varaha-assets/og.jpg';
                    }}
                  />
                ) : (
                  <div className="relative w-full h-full bg-black" onClick={handleVideoClick}>
                    <video
                      ref={videoRef}
                      src={item.url}
                      poster={item.poster}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                      loop
                      preload="none"
                    />
                    {!isVideoPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-white/90 rounded-full p-4 shadow-lg">
                          <Play size={40} className="text-copper fill-copper" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation Arrows (Desktop) */}
          <button
            onClick={goToPrev}
            className="hidden lg:flex absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition opacity-0 group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goToNext}
            className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition opacity-0 group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight size={24} />
          </button>

          {/* Indicators - Hidden for cleaner mobile UX */}
          <div className="hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/50'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Thumbnails */}
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((item, index) => (
            <button
              key={item.id}
              onClick={() => goToSlide(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                index === activeIndex ? 'border-copper ring-2 ring-copper' : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              {item.type === 'image' ? (
                <img 
                  src={item.url} 
                  alt={`Thumbnail ${index + 1}`} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/varaha-assets/og.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Play size={20} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {isLightboxOpen && activeItem?.type === 'image' && (
        <div
          className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>
          <img
            src={activeItem.url}
            alt={activeItem.alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
