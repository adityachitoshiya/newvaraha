import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function AnnouncementBar({ showCountdown = true }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState({
    days: 39,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Only check localStorage if NOT showing countdown
    // When showing countdown, always show the bar
    if (!showCountdown) {
      const dismissed = localStorage.getItem('announcementDismissed');
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [showCountdown]);

  useEffect(() => {
    if (!showCountdown) return;

    // Set launch date to February 12, 2026
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
  }, [showCountdown]);

  const handleDismiss = () => {
    setIsDismissed(true);
    // Only save to localStorage if not showing countdown
    if (!showCountdown) {
      localStorage.setItem('announcementDismissed', 'true');
    }
  };

  if (isDismissed) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-heritage via-copper to-heritage text-warm-sand py-1.5 px-2 border-b border-warm-sand/20 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-center">
        {showCountdown ? (
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
            <span className="font-semibold flex items-center gap-1">
              <span className="text-xs">🎉</span>
              <span className="hidden sm:inline">Grand Launch In:</span>
              <span className="sm:hidden">Launch:</span>
            </span>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <span className="font-mono font-bold text-[11px] sm:text-xs text-warm-sand bg-warm-sand/20 px-1 sm:px-1.5 py-0.5 rounded border border-warm-sand/30 min-w-[1.5rem] sm:min-w-[1.75rem] text-center">
                {String(timeRemaining.days).padStart(2, '0')}
              </span>
              <span className="font-bold text-warm-sand/60 text-xs">:</span>
              <span className="font-mono font-bold text-[11px] sm:text-xs text-warm-sand bg-warm-sand/20 px-1 sm:px-1.5 py-0.5 rounded border border-warm-sand/30 min-w-[1.5rem] sm:min-w-[1.75rem] text-center">
                {String(timeRemaining.hours).padStart(2, '0')}
              </span>
              <span className="font-bold text-warm-sand/60 text-xs">:</span>
              <span className="font-mono font-bold text-[11px] sm:text-xs text-warm-sand bg-warm-sand/20 px-1 sm:px-1.5 py-0.5 rounded border border-warm-sand/30 min-w-[1.5rem] sm:min-w-[1.75rem] text-center">
                {String(timeRemaining.minutes).padStart(2, '0')}
              </span>
              <span className="font-bold text-warm-sand/60 text-xs">:</span>
              <span className="font-mono font-bold text-[11px] sm:text-xs text-warm-sand bg-warm-sand/20 px-1 sm:px-1.5 py-0.5 rounded border border-warm-sand/30 min-w-[1.5rem] sm:min-w-[1.75rem] text-center">
                {String(timeRemaining.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-[10px] sm:text-xs text-center font-medium">
            ✨ Get <span className="font-semibold px-1.5 py-0.5 bg-warm-sand/20 rounded border border-warm-sand/30">15% OFF</span>
          </p>
        )}
      </div>
    </div>
  );
}