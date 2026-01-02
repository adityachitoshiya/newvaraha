import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { getApiUrl } from '../../lib/config';
import ShimmerImage from '../ShimmerImage';

// Default slides constant moved outside for reusability
const defaultSlides = [
  {
    id: 1,
    image: '/varaha-assets/heroimage.avif',
    title: 'Timeless Elegance',
    subtitle: 'Heritage-inspired masterpieces crafted with tradition and artistry'
  },
  {
    id: 2,
    image: '/varaha-assets/Jimage2.avif',
    title: 'Royal Heritage',
    subtitle: 'Exquisite pieces that celebrate India\'s rich cultural legacy'
  },
  {
    id: 3,
    image: '/varaha-assets/Jimage3.webp',
    title: 'Artisan Excellence',
    subtitle: 'Every piece handcrafted by master artisans with devotion and precision'
  }
];

export default function HeroSection({ initialSlides }) {
  // Initialize with passed props to ensure immediate render (Hyperspeed LCP)
  const [slides, setSlides] = useState(initialSlides || defaultSlides);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Still fetch on mount to get updates if any (stale-while-revalidate strategy)
  useEffect(() => {
    if (!initialSlides) {
      fetchSlides();
    }
  }, [initialSlides]);

  const fetchSlides = async () => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/content/hero`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setSlides(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch hero slides:", err);
      // Keep existing slides
    }
  };

  // Auto-advance slides every 4 seconds
  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [isAutoPlaying, slides]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <section className="relative h-screen bg-warm-sand">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 h-screen transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'
            } `}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            {/* Mobile Image */}
            <div className="md:hidden w-full h-full">
              <ShimmerImage
                src={slide.mobile_image || slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                priority={index === 0}
              />
            </div>

            {/* Desktop Image */}
            <div className="hidden md:block w-full h-full">
              <ShimmerImage
                src={slide.image}
                alt={slide.title}
                className="w-full h-full object-cover"
                priority={index === 0}
              />
            </div>
            {/* Soft warm lighting overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-warm-sand/70 via-warm-sand/50 to-warm-sand/70"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-warm-sand/60 via-transparent to-warm-sand/60"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="max-w-4xl mx-auto">
                {/* Subtle accent line */}
                <div className="w-24 h-px bg-copper mx-auto mb-8 animate-fadeIn"></div>

                <h1 className="font-royal text-6xl md:text-8xl lg:text-9xl font-bold text-heritage mb-8 tracking-tight leading-none animate-fadeUp">
                  {slide.title}
                </h1>

                {/* Subtle line under title */}
                <div className="w-32 h-px bg-copper/60 mx-auto mb-10 animate-fadeIn" style={{ animationDelay: '0.3s' }}></div>

                <p className="font-playfair text-2xl md:text-3xl text-heritage/80 mb-16 max-w-3xl mx-auto leading-relaxed font-light tracking-wide animate-fadeUp" style={{ animationDelay: '0.4s' }}>
                  {slide.subtitle}
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center animate-scaleIn" style={{ animationDelay: '0.6s' }}>
                  <Link
                    href={slide.link_url || "/coming-soon"}
                    className="group px-10 py-4 bg-copper border border-copper text-warm-sand font-medium rounded-sm hover:bg-heritage transition-all duration-300 flex items-center gap-3"
                  >
                    {slide.link_text || "Explore Collections"}
                    <ChevronRight className="group-hover:translate-x-2 transition-transform duration-300" size={24} />
                  </Link>

                  <Link
                    href="/coming-soon"
                    className="px-10 py-4 bg-transparent border border-copper text-heritage font-medium rounded-sm hover:bg-copper/5 transition-all duration-300"
                  >
                    Our Heritage
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows - Hidden on Mobile, Visible on Desktop */}
      <button
        onClick={prevSlide}
        className="hidden md:block absolute left-6 top-1/2 -translate-y-1/2 z-20 p-4 bg-white/90 text-heritage border border-copper/40 rounded-sm hover:bg-copper hover:text-warm-sand transition-all duration-300 backdrop-blur-sm"
        aria-label="Previous slide"
      >
        <ChevronLeft size={28} />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:block absolute right-6 top-1/2 -translate-y-1/2 z-20 p-4 bg-white/90 text-heritage border border-copper/40 rounded-sm hover:bg-copper hover:text-warm-sand transition-all duration-300 backdrop-blur-sm"
        aria-label="Next slide"
      >
        <ChevronRight size={28} />
      </button>

      {/* Slide Indicators - Hidden for cleaner mobile UX */}
      <div className="hidden">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h - 1 rounded - full transition - all duration - 500 ${index === currentSlide
              ? 'w-16 bg-copper'
              : 'w-8 bg-heritage/30 hover:bg-heritage/50'
              } `}
            aria-label={`Go to slide ${index + 1} `}
          />
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-warm-sand to-transparent z-5"></div>
    </section>
  );
}
