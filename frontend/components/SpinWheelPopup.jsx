import { useState, useEffect } from 'react';
import { X, Gift, Copy, Check, Sparkles, Star } from 'lucide-react';

const OFFERS = [
  { id: 1, label: '10% OFF', code: 'ROYAL10', discount: '10%', color: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[#e2c799]' },
  { id: 2, label: '15% OFF', code: 'ROYAL15', discount: '15%', color: 'bg-gradient-to-br from-[#e2c799] to-[#bfa06d] text-[#1a1a1a]' },
  { id: 3, label: '20% OFF', code: 'ROYAL20', discount: '20%', color: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[#e2c799]' },
  { id: 4, label: '5% OFF', code: 'ROYAL5', discount: '5%', color: 'bg-gradient-to-br from-[#e2c799] to-[#bfa06d] text-[#1a1a1a]' },
  { id: 5, label: '25% OFF', code: 'ROYAL25', discount: '25%', color: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[#e2c799]' },
  { id: 6, label: 'FREE SHIP', code: 'FREESHIP', discount: 'Free Shipping', color: 'bg-gradient-to-br from-[#e2c799] to-[#bfa06d] text-[#1a1a1a]' },
  { id: 7, label: '30% OFF', code: 'ROYAL30', discount: '30%', color: 'bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] text-[#e2c799]' },
  { id: 8, label: '12% OFF', code: 'ROYAL12', discount: '12%', color: 'bg-gradient-to-br from-[#e2c799] to-[#bfa06d] text-[#1a1a1a]' },
];

export default function SpinWheelPopup({ isHomepage = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonOffer, setWonOffer] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);

  useEffect(() => {
    // Only show on homepage
    if (!isHomepage) return;

    // Check if user already played or dismissed too many times
    const hasPlayed = localStorage.getItem('spin-wheel-played');
    const dismissCount = parseInt(localStorage.getItem('spin-wheel-dismiss-count') || '0');

    // Don't show if already played or dismissed 2+ times
    if (hasPlayed || dismissCount >= 2) return;

    // Show popup after 12 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 12000);

    return () => clearTimeout(timer);
  }, [isHomepage]);

  const handleClose = () => {
    setIsVisible(false);

    // If user spun and won, mark as played permanently
    if (hasSpun) {
      localStorage.setItem('spin-wheel-played', 'true');
    } else {
      // If user closed without spinning, increment dismiss count
      const currentCount = parseInt(localStorage.getItem('spin-wheel-dismiss-count') || '0');
      const newCount = currentCount + 1;
      localStorage.setItem('spin-wheel-dismiss-count', newCount.toString());

      // If dismissed 2 times, mark as played to never show again
      if (newCount >= 2) {
        localStorage.setItem('spin-wheel-played', 'true');
      }
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setShowEmailForm(false);
    }
  };

  const handleSpin = () => {
    if (isSpinning || hasSpun) return;

    setIsSpinning(true);

    // Random number of full rotations (5-8) + random segment
    const randomSegment = Math.floor(Math.random() * OFFERS.length);
    const segmentAngle = 360 / OFFERS.length;
    // Align the winning segment to the top (pointer is at top)
    // We need to rotate such that the segment is at 0 degrees (top)
    // The segments are drawn starting from 0 (top-center) and rotating clockwise
    // To bring segment N to the top, we need to rotate negative(N * segmentAngle)
    // But we are adding rotations, so total rotation = (FullRotation * 360) - (N * segmentAngle)
    const extraRotations = 5 + Math.floor(Math.random() * 3);
    const finalRotation = (extraRotations * 360) + ((360 - (randomSegment * segmentAngle)));

    setRotation(finalRotation);

    // After spin completes (4 seconds), show result
    setTimeout(() => {
      setIsSpinning(false);
      setHasSpun(true);
      setWonOffer(OFFERS[randomSegment]);
      localStorage.setItem('spin-wheel-played', 'true');
    }, 4000);
  };

  const handleCopy = () => {
    if (wonOffer) {
      navigator.clipboard.writeText(wonOffer.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={handleClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#e2c799]/30">

        {/* Decor Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #e2c799 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 p-2 bg-white/80 hover:bg-white rounded-full transition-all duration-300 shadow-sm border border-gray-100"
          aria-label="Close"
        >
          <X size={20} className="text-gray-600 hover:text-red-500 transition-colors" />
        </button>

        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6 relative z-10">
          <div className="inline-flex items-center justify-center gap-2 mb-2 p-3 bg-[#e2c799]/10 rounded-full">
            <Gift className="text-[#bfa06d]" size={28} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-1 font-serif tracking-tight">
            Spin to Win
          </h2>
          <p className="text-[#666] text-sm">
            Unlock exclusive royal privileges & discounts
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 relative z-10">

          {/* Email Form */}
          {showEmailForm && !hasSpun && (
            <div className="animate-fadeIn">
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-[#e2c799] to-[#bfa06d] rounded-xl opacity-30 group-hover:opacity-100 transition duration-500 blur"></div>
                  <div className="relative bg-white p-1 rounded-xl">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address..."
                      className="w-full px-4 py-3 bg-white rounded-lg border-0 text-gray-900 placeholder-gray-400 focus:ring-0 text-center font-medium"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-[#1a1a1a] to-[#333] text-[#e2c799] font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 tracking-wide border border-[#e2c799]/20"
                >
                  CONTINUE TO SPIN
                </button>
              </form>
            </div>
          )}

          {/* Spin Wheel */}
          {!showEmailForm && !wonOffer && (
            <div className="animate-fadeIn">
              <div className="relative mb-8">

                {/* Pointer */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-30 drop-shadow-xl">
                  <div className="text-[#bfa06d]">
                    <Star fill="#bfa06d" size={40} className="animate-pulse" />
                  </div>
                  <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-[#bfa06d] mx-auto -mt-3"></div>
                </div>

                {/* Wheel Container */}
                <div className="relative w-full aspect-square max-w-[320px] mx-auto">

                  {/* Outer Glow Ring */}
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-[#e2c799]/20 to-[#bfa06d]/20 animate-pulse blur-xl"></div>

                  {/* Wheel Border with Dots */}
                  <div className="absolute inset-0 rounded-full border-[8px] border-[#1a1a1a] shadow-2xl overflow-hidden bg-[#1a1a1a]">
                    {/* Decorative Dots */}
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-[#e2c799] rounded-full z-20"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `rotate(${i * 30}deg) translate(154px) rotate(-${i * 30}deg)` // Adjust translate based on radius
                        }}
                      ></div>
                    ))}
                  </div>

                  {/* Wheel Itself */}
                  <div
                    className="relative w-full h-full rounded-full shadow-inner transition-transform duration-[4000ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                    }}
                  >
                    {/* Create wheel segments */}
                    {OFFERS.map((offer, index) => {
                      const angle = (360 / OFFERS.length) * index;
                      const skew = 90 - (360 / OFFERS.length);

                      return (
                        <div
                          key={offer.id}
                          className="absolute w-full h-full rounded-full"
                          style={{
                            transform: `rotate(${angle}deg)`,
                            clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((360 / OFFERS.length) * Math.PI / 180)}% ${50 - 50 * Math.cos((360 / OFFERS.length) * Math.PI / 180)}%)`
                          }}
                        >
                          <div
                            className={`w-full h-full ${offer.color} flex items-start justify-center pt-8`}
                            style={{ transform: `rotate(${360 / OFFERS.length / 2}deg)` }}
                          >
                            <span
                              className="font-bold text-xs sm:text-sm tracking-wider uppercase pt-4"
                              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                            >
                              {offer.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Center Hub */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#1a1a1a] shadow-xl flex items-center justify-center border-4 border-[#e2c799] z-20">
                    <Sparkles className="text-[#e2c799] animate-spin-slow" size={24} />
                  </div>

                </div>
              </div>

              {/* Spin Button */}
              <button
                onClick={handleSpin}
                disabled={isSpinning || hasSpun}
                className={`w-full py-4 font-bold text-lg rounded-xl transition-all duration-300 transform border-b-4 ${isSpinning || hasSpun
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#e2c799] to-[#bfa06d] text-[#1a1a1a] border-[#a38655] hover:brightness-110 active:border-b-0 active:translate-y-1 shadow-lg'
                  }`}
              >
                {isSpinning ? 'SPINNING...' : 'SPIN THE WHEEL'}
              </button>
            </div>
          )}

          {/* Result */}
          {wonOffer && (
            <div className="text-center space-y-6 animate-scaleIn relative z-10">
              {/* Confetti-like effect using CSS or just design */}

              <div className="space-y-2">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border-2 border-green-100 mb-2">
                  <Gift className="text-green-600" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-[#1a1a1a] font-serif">
                  Congratulations!
                </h3>
                <p className="text-gray-500">
                  You've won a special reward
                </p>
              </div>

              <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#e2c799]/30 shadow-inner group">
                <div className="text-5xl font-bold text-[#e2c799] mb-4 drop-shadow-sm">
                  {wonOffer.discount}
                </div>

                {/* Code Copy */}
                <div
                  onClick={handleCopy}
                  className="flex items-center justify-between bg-white/10 rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-colors border border-[#e2c799]/20"
                >
                  <code className="text-xl font-mono font-bold text-white tracking-widest pl-2">
                    {wonOffer.code}
                  </code>
                  <div className="p-2 bg-[#e2c799] rounded text-[#1a1a1a]">
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                  </div>
                </div>
                {copied && <p className="text-[#e2c799] text-xs mt-2">Code copied!</p>}
              </div>

              <button
                onClick={handleClose}
                className="w-full py-4 bg-[#1a1a1a] text-white font-bold rounded-xl hover:bg-gray-900 transition-all shadow-lg border border-gray-800"
              >
                Claim Offer Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
