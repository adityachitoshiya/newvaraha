import { useState, useEffect } from 'react';

export default function LaunchCountdown({ onSkip }) {
  const [showLogin, setShowLogin] = useState(false);
  const [accessId, setAccessId] = useState('');

  const handleLogin = async () => {
    const validIds = ["DEV2024", "adi1", "adi2", "adi3"];

    if (validIds.includes(accessId)) {
      try {
        const { getApiUrl } = require('../lib/config');
        const API_URL = getApiUrl();

        await fetch(`${API_URL}/api/track-visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: `/tester-login/${accessId}` })
        }).catch(err => console.error(err));

        localStorage.setItem("dev_mode", "true");
        localStorage.setItem("tester_id", accessId);

        // Instead of redirecting to '/', we just call onSkip which removes this component
        // assuming onSkip unmounts this component from index.jsx
        if (onSkip) {
          onSkip();
        } else {
          window.location.reload();
        }

      } catch (e) {
        localStorage.setItem("dev_mode", "true");
        if (onSkip) onSkip(); else window.location.reload();
      }
    } else {
      alert("Invalid Access ID");
    }
  };

  const [timeRemaining, setTimeRemaining] = useState({
    days: 60,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set fixed launch date - February 12, 2026 at midnight
    const launchDate = new Date('2026-02-12T00:00:00');

    const updateCountdown = () => {
      const now = new Date();
      const difference = launchDate - now;

      if (difference > 0) {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        // Launch date passed - set all to zero
        setTimeRemaining({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Animated Moving Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-heritage via-copper to-heritage animate-gradient-move bg-[length:200%_200%]"></div>

      {/* Floating Orbs with Movement */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-64 h-64 bg-warm-sand rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-ivory-smoke rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-warm-sand rounded-full blur-3xl animate-float-fast"></div>
        <div className="absolute top-20 right-1/4 w-48 h-48 bg-copper/50 rounded-full blur-2xl animate-float-reverse"></div>
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-royal-orange/30 rounded-full blur-3xl animate-float-diagonal"></div>
      </div>

      <div className="relative z-10 text-center px-4 sm:px-6 max-w-6xl mx-auto">
        {/* Logo/Brand */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-serif text-warm-sand mb-3 sm:mb-4 tracking-wide">
            Varaha Jewels
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-ivory-smoke/80 font-light tracking-[0.15em] sm:tracking-[0.2em] italic mb-2">
            Where heritage meets royalty
          </p>
          <p className="text-base sm:text-xl md:text-2xl text-ivory-smoke/90 font-light tracking-wider">
            Heritage. Elegance. Timeless Beauty.
          </p>
        </div>

        {/* Coming Soon Text */}
        <div className="mb-8 sm:mb-12 animate-fade-in-delay">
          <h2 className="text-2xl sm:text-3xl md:text-4xl text-warm-sand font-light mb-3">
            Grand Launch In
          </h2>
          <div className="w-20 sm:w-24 h-1 bg-warm-sand mx-auto opacity-60"></div>
        </div>

        {/* Countdown Timer */}
        <div className="grid grid-cols-4 gap-2 sm:gap-4 md:gap-8 mb-12 sm:mb-16 max-w-4xl mx-auto">
          {/* Days */}
          <div className="bg-warm-sand/10 backdrop-blur-sm border-2 border-warm-sand/30 rounded-lg p-3 sm:p-6 md:p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl sm:text-5xl md:text-7xl font-bold text-warm-sand mb-1 sm:mb-2 font-mono">
              {String(timeRemaining.days).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm md:text-lg text-ivory-smoke uppercase tracking-wider sm:tracking-widest">
              Days
            </div>
          </div>

          {/* Hours */}
          <div className="bg-warm-sand/10 backdrop-blur-sm border-2 border-warm-sand/30 rounded-lg p-3 sm:p-6 md:p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl sm:text-5xl md:text-7xl font-bold text-warm-sand mb-1 sm:mb-2 font-mono">
              {String(timeRemaining.hours).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm md:text-lg text-ivory-smoke uppercase tracking-wider sm:tracking-widest">
              Hours
            </div>
          </div>

          {/* Minutes */}
          <div className="bg-warm-sand/10 backdrop-blur-sm border-2 border-warm-sand/30 rounded-lg p-3 sm:p-6 md:p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl sm:text-5xl md:text-7xl font-bold text-warm-sand mb-1 sm:mb-2 font-mono">
              {String(timeRemaining.minutes).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm md:text-lg text-ivory-smoke uppercase tracking-wider sm:tracking-widest">
              Min
            </div>
          </div>

          {/* Seconds */}
          <div className="bg-warm-sand/10 backdrop-blur-sm border-2 border-warm-sand/30 rounded-lg p-3 sm:p-6 md:p-8 transform hover:scale-105 transition-all duration-300">
            <div className="text-3xl sm:text-5xl md:text-7xl font-bold text-warm-sand mb-1 sm:mb-2 font-mono">
              {String(timeRemaining.seconds).padStart(2, '0')}
            </div>
            <div className="text-xs sm:text-sm md:text-lg text-ivory-smoke uppercase tracking-wider sm:tracking-widest">
              Sec
            </div>
          </div>
        </div>

        {/* Notification Signup */}
        <div className="mb-6 sm:mb-8 animate-fade-in-delay-2">
          <p className="text-ivory-smoke/80 mb-3 sm:mb-4 text-sm sm:text-lg px-2">
            Be the first to explore our exquisite collection
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-warm-sand/20 border-2 border-warm-sand/40 text-warm-sand placeholder-ivory-smoke/60 focus:outline-none focus:border-warm-sand transition-all text-sm sm:text-base"
            />
            <button className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-warm-sand text-heritage rounded-full font-semibold hover:bg-ivory-smoke transition-all duration-300 transform hover:scale-105 text-sm sm:text-base">
              Notify Me
            </button>
          </div>
        </div>
      </div>

      {/* Developer Access / Skip Replacement */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        {!showLogin ? (
          <button
            onClick={() => setShowLogin(true)}
            className="group px-6 py-2 bg-transparent border border-warm-sand/30 text-warm-sand/70 rounded-full hover:bg-warm-sand/10 hover:border-warm-sand hover:text-warm-sand transition-all duration-300 text-xs sm:text-sm flex items-center gap-2"
          >
            <code className="font-mono">{`</>`}</code>
            <span>I'm a Developer or a Tester</span>
          </button>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-black/40 backdrop-blur-md p-3 sm:p-2 rounded-xl border border-warm-sand/30 shadow-lg animate-fade-in max-w-sm sm:max-w-none mx-auto">
            <input
              type="password"
              placeholder="Enter Access ID"
              value={accessId}
              onChange={(e) => setAccessId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-transparent border-none outline-none px-4 py-3 sm:py-2 text-warm-sand placeholder-warm-sand/50 w-full sm:w-48 text-center sm:text-left focus:ring-0 text-base"
              autoFocus
            />
            <button
              onClick={handleLogin}
              className="bg-warm-sand text-heritage px-6 py-3 sm:py-2 rounded-lg font-semibold text-sm hover:bg-warm-sand/90 transition-colors shadow-md w-full sm:w-auto"
            >
              Enter
            </button>
            <button
              onClick={() => setShowLogin(false)}
              className="p-2 text-warm-sand/50 hover:text-warm-sand transition-colors self-center sm:self-auto"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }

        .animate-fade-in-delay {
          animation: fade-in 1s ease-out 0.3s both;
        }

        .animate-fade-in-delay-2 {
          animation: fade-in 1s ease-out 0.6s both;
        }

        .delay-500 {
          animation-delay: 0.5s;
        }

        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}
