import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, ChevronLeft, ChevronRight, UserCheck, Instagram, Youtube } from 'lucide-react';
import { getApiUrl } from '../../lib/config';

// Creator data with 9:16 vertical videos
const creators = [
  {
    id: 1,
    name: "Priya Sharma",
    handle: "@priyastyle",
    platform: "instagram",
    followers: "2.5M",
    videoUrl: "/varaha-assets/creator1.mp4",
    product: "Heritage Kundan Necklace",
    verified: true
  },
  {
    id: 2,
    name: "Nisha Kapoor",
    handle: "@nishafashion",
    platform: "youtube",
    followers: "1.8M",
    videoUrl: "/varaha-assets/creator2.mp4",
    product: "Traditional Jhumka Earrings",
    verified: true
  },
  {
    id: 3,
    name: "Anjali Mehta",
    handle: "@anjalijewels",
    platform: "instagram",
    followers: "3.2M",
    videoUrl: "/varaha-assets/creator3.mp4",
    product: "Polki Diamond Bangles",
    verified: true
  },
  {
    id: 4,
    name: "Rhea Malhotra",
    handle: "@rheaglam",
    platform: "instagram",
    followers: "950K",
    videoUrl: "/varaha-assets/creator4.mp4",
    product: "Gold Maang Tikka",
    verified: true
  },
  {
    id: 5,
    name: "Kavya Reddy",
    handle: "@kavyastyle",
    platform: "youtube",
    followers: "2.1M",
    videoUrl: "/varaha-assets/creator5.mp4",
    product: "Temple Jewelry Collection",
    verified: true
  }
];

export default function CreatorShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState({});
  const [isMuted, setIsMuted] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [creators, setCreators] = useState([]); // Use State
  const videoRefs = useRef({});
  const sectionRef = useRef(null);

  // Fallback Data
  const defaultCreators = [
    {
      id: 1,
      name: "Priya Sharma",
      handle: "@priyastyle",
      platform: "instagram",
      followers: "2.5M",
      videoUrl: "/varaha-assets/creator1.mp4",
      product: "Heritage Kundan Necklace",
      verified: true
    },
    // ... (keeping other defaults if needed, or just 1 for brevity)
    {
      id: 2,
      name: "Nisha Kapoor",
      handle: "@nishafashion",
      platform: "youtube",
      followers: "1.8M",
      videoUrl: "/varaha-assets/creator2.mp4",
      product: "Traditional Jhumka Earrings",
      verified: true
    }
  ];

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      const API_URL = getApiUrl();
      const res = await fetch(`${API_URL}/api/content/creators`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Map backend fields to frontend if names differ, but here they are mapped in model largely
          // Backend: video_url -> Frontend: videoUrl
          // Backend: product_name -> Frontend: product
          // Backend: is_verified -> Frontend: verified
          const mapped = data.map(c => ({
            ...c,
            videoUrl: c.video_url,
            product: c.product_name,
            verified: c.is_verified
          }));
          setCreators(mapped);
        } else {
          setCreators(defaultCreators);
        }
      } else {
        setCreators(defaultCreators);
      }
    } catch (err) {
      console.error("Error fetching creator videos:", err);
      setCreators(defaultCreators);
    }
  };

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // Intersection Observer for animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const togglePlay = async (creatorId, context = 'desktop') => {
    const key = `${context}-${creatorId}`;
    const video = videoRefs.current[key];
    if (!video) {
      console.error('Video not found for key:', key);
      return;
    }

    console.log('Toggling video:', key);
    // Debug logs can be reduced or removed for production, keeping minimal here for now

    // Pause all other videos
    Object.entries(videoRefs.current).forEach(([id, v]) => {
      if (v && id !== key && !v.paused) {
        v.pause();
        // Extract creatorId from key to update state if needed, though VideoCards manage their own state mostly
        // keeping isPlaying state update for consistency if used elsewhere later
        const [_, cId] = id.split('-');
        setIsPlaying(prev => ({ ...prev, [cId]: false }));
      }
    });

    // Toggle current video
    try {
      if (video.paused) {
        // Wait for video to be ready if needed
        if (video.readyState < 2) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Video load timeout')), 10000);
            video.addEventListener('loadeddata', () => {
              clearTimeout(timeout);
              resolve();
            }, { once: true });
            video.addEventListener('error', () => {
              clearTimeout(timeout);
              reject(new Error('Video load error'));
            }, { once: true });
            video.load(); // Force load
          });
        }

        // Ensure video starts from beginning if it ended
        if (video.ended) {
          video.currentTime = 0;
        }

        // AUTO UNMUTE when playing
        video.muted = false;
        setIsMuted(false);

        await video.play();
        setIsPlaying(prev => ({ ...prev, [creatorId]: true }));
      } else {
        video.pause();
        setIsPlaying(prev => ({ ...prev, [creatorId]: false }));
      }
    } catch (err) {
      console.error('Playback error:', err.name, err.message);
      setIsPlaying(prev => ({ ...prev, [creatorId]: false }));

      if (err.name === 'NotAllowedError') {
        alert('Please interact with the page first to enable video playback');
      }
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    Object.values(videoRefs.current).forEach(video => {
      if (video) video.muted = !isMuted;
    });
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % creators.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + creators.length) % creators.length);
  };

  // Touch handlers for swipe
  const onTouchStart = (e) => {
    setTouchEnd(0); // Reset
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextSlide();
    }
    if (isRightSwipe) {
      prevSlide();
    }
  };

  // Auto-pause videos when scrolling away
  useEffect(() => {
    const handleScroll = () => {
      Object.entries(videoRefs.current).forEach(([id, video]) => {
        if (video && !video.paused) {
          const rect = video.getBoundingClientRect();
          // Log bounds for debugging
          // console.log(`Video ${id} bounds:`, rect.top, rect.bottom, window.innerHeight);

          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            console.log(`Auto-pausing video ${id} due to scroll. Top: ${rect.top}, Bottom: ${rect.bottom}, Window: ${window.innerHeight}`);
            video.pause();
            setIsPlaying(prev => ({ ...prev, [id]: false }));
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-12 md:py-16 lg:py-24 bg-gradient-to-b from-warm-sand via-white to-warm-sand overflow-hidden"
    >
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-copper rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-heritage rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-8 md:mb-12 lg:mb-16 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <div className="inline-block mb-3 md:mb-4">
            <span className="text-copper font-semibold tracking-wider text-xs sm:text-sm uppercase px-3 sm:px-4 py-1.5 sm:py-2 bg-copper/10 rounded-full border border-copper/20">
              ✨ Featured By Creators
            </span>
          </div>
          <h2 className="font-royal text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-heritage mb-4 md:mb-6">
            Loved by Influencers
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-600 leading-relaxed px-4">
            See how top fashion creators style our exquisite jewelry collections
          </p>
        </div>

        {/* Desktop View - Horizontal Scroll */}
        <div className="hidden lg:block">
          <div className="relative -mx-4">
            <div className="flex gap-4 xl:gap-6 overflow-x-auto scrollbar-hide pb-8 px-4 justify-start xl:justify-center snap-x snap-mandatory">
              {creators.map((creator, index) => (
                <div
                  key={creator.id}
                  className={`flex-shrink-0 snap-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
                    }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <VideoCard
                    creator={creator}
                    videoRef={(el) => videoRefs.current[`desktop-${creator.id}`] = el}
                    isPlaying={isPlaying[creator.id]}
                    isMuted={isMuted}
                    onTogglePlay={() => togglePlay(creator.id, 'desktop')}
                    onToggleMute={toggleMute}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile/Tablet View - Carousel */}
        <div className="lg:hidden">
          <div className="relative max-w-md mx-auto px-2 sm:px-4">
            {/* Carousel with touch support */}
            <div
              className="overflow-hidden rounded-2xl"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {creators.map((creator) => (
                  <div key={creator.id} className="w-full flex-shrink-0 flex justify-center px-2">
                    <VideoCard
                      creator={creator}
                      videoRef={(el) => videoRefs.current[`mobile-${creator.id}`] = el}
                      isPlaying={isPlaying[creator.id]}
                      isMuted={isMuted}
                      onTogglePlay={() => togglePlay(creator.id, 'mobile')}
                      onToggleMute={toggleMute}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Progress Dots */}
            <div className="flex justify-center gap-2 mt-4 sm:mt-6">
              {creators.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-copper' : 'w-2 bg-heritage/30'
                    }`}
                  aria-label={`Go to creator ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div
          className={`text-center mt-8 md:mt-12 lg:mt-16 px-4 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
            Want to collaborate with us?
          </p>
          <a
            href="mailto:collaborate@varahajewels.com"
            className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-copper to-heritage text-white font-semibold text-sm sm:text-base rounded-full hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            <Instagram size={20} />
            Become a Creator Partner
          </a>
        </div>
      </div>
    </section>
  );
}

// Video Card Component
function VideoCard({ creator, videoRef, isPlaying, isMuted, onTogglePlay, onToggleMute }) {
  const localVideoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);

  // Handle both callback ref and local ref
  const setVideoRef = (element) => {
    localVideoRef.current = element;
    if (typeof videoRef === 'function') {
      videoRef(element);
    }
  };

  // Sync local playing state with video element
  useEffect(() => {
    const video = localVideoRef.current;
    if (!video) return;

    const handlePlay = () => {
      console.log('Video actually playing:', creator.id);
      setLocalIsPlaying(true);
    };

    const handlePause = () => {
      console.log('Video actually paused:', creator.id);
      setLocalIsPlaying(false);
    };

    const handleEnded = () => {
      console.log('Video ended:', creator.id);
      setLocalIsPlaying(false);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('playing', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('playing', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [creator.id]);

  // Handle video loaded
  const handleLoadedData = () => {
    console.log('Video loaded successfully:', creator.videoUrl);
    setIsLoading(false);
  };

  // Handle video errors
  const handleVideoError = (e) => {
    console.error('Video error for:', creator.videoUrl, e);
    setVideoError(true);
    setIsLoading(false);
  };

  return (
    <div className="relative group w-full max-w-[280px] sm:max-w-[300px] md:max-w-[320px] mx-auto">
      {/* 9:16 Video Container */}
      <div className="relative w-full aspect-[9/16] rounded-2xl sm:rounded-3xl overflow-hidden bg-black shadow-2xl">
        {/* Video Element */}
        <video
          ref={setVideoRef}
          src={creator.videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          muted={isMuted}
          preload="auto"
          onLoadedData={handleLoadedData}
          onError={handleVideoError}
          onLoadedMetadata={(e) => console.log('Video metadata loaded:', creator.id, e.target.videoWidth, 'x', e.target.videoHeight)}
          onCanPlay={(e) => console.log('Video can play:', creator.id)}
          onPlaying={(e) => console.log('Video playing event:', creator.id)}
          onTimeUpdate={(e) => {
            // Only log occasionally to avoid spam
            if (Math.floor(e.target.currentTime * 10) % 10 === 0) {
              console.log('Video time update:', creator.id, 'Time:', e.target.currentTime.toFixed(2));
            }
          }}
          style={{ backgroundColor: '#000', display: 'block' }}
          controlsList="nodownload"
        />

        {/* Loading Indicator */}
        {isLoading && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Error State */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-center p-4 z-20">
            <div>
              <p className="text-sm">Video unavailable</p>
              <p className="text-xs text-white/60 mt-1">Please try again later</p>
            </div>
          </div>
        )}

        {/* Overlay Click Handler - covers entire video for Play/Pause */}
        <div
          className="absolute inset-0 z-20 cursor-pointer"
          onClick={onTogglePlay}
        ></div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none"></div>

        {/* Play Button - Only show when PAUSED */}
        {!localIsPlaying && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 active:bg-white/40 transition-all duration-300 z-10 pointer-events-none"
          >
            <Play size={24} className="sm:w-7 sm:h-7 pl-1" fill="white" />
          </div>
        )}



        {/* Creator Info - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 text-white">
          {/* Profile */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-copper to-heritage flex items-center justify-center text-white font-bold text-base sm:text-lg flex-shrink-0">
              {creator.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-bold text-sm sm:text-base md:text-lg truncate">{creator.name}</h3>
                {creator.verified && (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-xs sm:text-sm text-white/80 truncate">{creator.handle} • {creator.followers}</p>
            </div>
            <div className="flex-shrink-0">
              {creator.platform === 'instagram' ? (
                <Instagram size={20} className="sm:w-6 sm:h-6 text-pink-400" />
              ) : (
                <Youtube size={20} className="sm:w-6 sm:h-6 text-red-500" />
              )}
            </div>
          </div>

          {/* Product Tag */}
          <div className="inline-block px-2.5 py-1 sm:px-3 sm:py-1.5 bg-copper/90 backdrop-blur-sm rounded-full text-xs sm:text-sm font-medium">
            Wearing: {creator.product}
          </div>
        </div>
      </div>
    </div>
  );
}
