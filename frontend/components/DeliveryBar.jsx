import { useState, useEffect } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';
import { calculateDeliveryInfo, getCoordinatesFromPincode, isValidPincode, calculateDistance, JAIPUR_COORDS } from '../lib/deliveryCalculator';

/**
 * Premium Delivery Availability Bar for Varaha Jewels
 * 
 * Features:
 * - Auto location detection with Haversine distance calculation
 * - Express delivery check for Jaipur (30km radius)
 * - Pincode-based delivery estimation
 * - LocalStorage persistence
 * - GIVA-style UI with premium Varaha theme
 * - Responsive mobile & desktop layout
 */

export default function DeliveryBar({ variant = 'mobile' }) {
  // State Management
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [showPincodeInput, setShowPincodeInput] = useState(false);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Jaipur Express Zone Configuration references imported JAIPUR_COORDS

  /**
   * Auto-detect user location using browser geolocation
   */
  const detectLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const info = calculateDeliveryInfo(latitude, longitude);
        // Assuming browser location is roughly user's city
        // We could use a reverse geocoding API here if needed, but for now we trust the zone label

        if (info.isExpress) {
          info.city = 'Jaipur'; // Explicitly set for express zone
        }

        setDeliveryInfo(info);
        localStorage.setItem('varaha_delivery', JSON.stringify(info));
      },
      (error) => {
        // Location denied or error - show default pincode entry
        console.log('Location access denied:', error.message);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  };

  /**
   * Check delivery availability by pincode
   */
  const checkPincode = async (pincodeValue) => {
    const cleanPincode = pincodeValue.trim();

    // Validate pincode format (6 digits)
    if (!isValidPincode(cleanPincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setLoading(true);
    setError('');

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const coords = getCoordinatesFromPincode(cleanPincode);

      if (coords) {
        const info = calculateDeliveryInfo(coords.lat, coords.lng);
        const result = {
          type: info.isExpress ? 'express' : 'standard',
          pincode: cleanPincode,
          city: coords.city,
          eta: info.zone.time,
          message: info.message
        };

        setDeliveryInfo(result);
        localStorage.setItem('varaha_delivery', JSON.stringify(result));
        localStorage.setItem('varaha_pincode', cleanPincode);
        setShowPincodeInput(false);
        setPincode('');
      } else {
        // Fallback standard
        const result = {
          type: 'standard',
          pincode: cleanPincode,
          city: 'India',
          eta: '3-5 days',
          message: '📦 Deliver to ' + cleanPincode + ' • ETA: 3-5 days'
        };
        setDeliveryInfo(result);
        localStorage.setItem('varaha_delivery', JSON.stringify(result));
        localStorage.setItem('varaha_pincode', cleanPincode);
        setShowPincodeInput(false);
        setPincode('');
      }
    } catch (err) {
      console.error('Pincode check error:', err);
      setError('Failed to check delivery. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle pincode form submission
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    checkPincode(pincode);
  };

  /**
   * Clear delivery info and reset
   */
  const handleClear = () => {
    setDeliveryInfo(null);
    localStorage.removeItem('varaha_delivery');
    localStorage.removeItem('varaha_pincode');
    setShowPincodeInput(false);
    setPincode('');
  };

  /**
   * Handle "Change" button click
   */
  const handleChange = () => {
    setShowPincodeInput(true);
  };

  /**
   * Initialize delivery info on component mount
   */
  useEffect(() => {
    // Check localStorage first
    const savedDelivery = localStorage.getItem('varaha_delivery');
    const savedPincode = localStorage.getItem('varaha_pincode');

    if (savedDelivery) {
      setDeliveryInfo(JSON.parse(savedDelivery));
    } else if (savedPincode) {
      // Revalidate saved pincode
      checkPincode(savedPincode);
    } else {
      // Try auto-location detection
      detectLocation();
    }
  }, []);

  // Determine positioning classes based on variant
  const positionClasses = variant === 'mobile'
    ? 'sticky top-16 lg:hidden' // Mobile: Below header (64px), hidden on desktop
    : 'hidden lg:block relative'; // Desktop: At top, hidden on mobile

  return (
    <>
      {/* Main Delivery Bar */}
      <div className={`${positionClasses} z-40 bg-gradient-to-r from-heritage via-copper to-heritage border-b border-copper/30 shadow-md`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-10 sm:h-11">
            {/* Left Section - Delivery Info */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
              {/* Location Icon */}
              <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-ivory/10 backdrop-blur-sm border border-ivory/20 flex items-center justify-center">
                <MapPin size={14} className="text-ivory sm:w-4 sm:h-4" />
              </div>

              {/* Delivery Text */}
              <div className="flex-1 min-w-0">
                {deliveryInfo ? (
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-ivory truncate">
                      {deliveryInfo.message}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowPincodeInput(!showPincodeInput)}
                    className="flex items-center gap-1 text-xs font-medium text-ivory/90 hover:text-ivory transition-colors group"
                  >
                    <span className="truncate">📦 Enter Pincode</span>
                    <ChevronDown
                      size={14}
                      className={`flex-shrink-0 transform transition-transform ${showPincodeInput ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-1 sm:gap-2 ml-1">
              {/* Change Button */}
              {deliveryInfo && (
                <button
                  onClick={handleChange}
                  className="text-xs font-medium text-ivory/80 hover:text-ivory transition-colors px-1.5 sm:px-2 py-0.5 rounded hover:bg-ivory/10"
                >
                  Change
                </button>
              )}

              {/* Clear Button */}
              {deliveryInfo && (
                <button
                  onClick={handleClear}
                  className="p-1 sm:p-1.5 rounded-full hover:bg-ivory/10 transition-colors"
                  aria-label="Clear"
                >
                  <X size={14} className="text-ivory sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pincode Input Slide-down */}
        {showPincodeInput && (
          <div className="border-t border-ivory/20 bg-heritage/95 backdrop-blur-sm animate-slideDown">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 sm:py-3">
              <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <label htmlFor="pincode" className="block text-xs font-medium text-ivory/80 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    id="pincode"
                    value={pincode}
                    onChange={(e) => {
                      setPincode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setError('');
                    }}
                    placeholder="302012"
                    maxLength={6}
                    className="w-full px-2.5 py-1.5 sm:py-2 rounded-lg bg-black/20 border border-ivory/30 text-ivory placeholder-ivory/40 focus:outline-none focus:ring-1 focus:ring-copper focus:border-transparent text-xs sm:text-sm"
                  />
                  {error && (
                    <p className="text-xs text-red-300 mt-0.5">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || pincode.length !== 6}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-copper to-royal-orange text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-copper/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs whitespace-nowrap"
                >
                  {loading ? 'Checking...' : 'Check'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
