import { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Scroll to top smoothly
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-40 group"
          aria-label="Back to top"
        >
          {/* Outer rotating ring */}
          <div className="relative">
            <div className="absolute inset-0 bg-copper rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>
            
            {/* Main button */}
            <div className="relative w-14 h-14 bg-gradient-to-br from-copper to-heritage rounded-full flex items-center justify-center shadow-2xl transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 border-2 border-copper/30">
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-full border-2 border-copper/50 animate-ping"></div>
              
              {/* Icon */}
              <ChevronUp 
                size={24} 
                className="text-warm-sand relative z-10 transition-transform duration-300 group-hover:-translate-y-1" 
              />
            </div>

            {/* Bottom glow */}
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-10 h-2 bg-copper/30 rounded-full blur-md group-hover:w-12 transition-all duration-300"></div>
          </div>
        </button>
      )}
    </>
  );
}
