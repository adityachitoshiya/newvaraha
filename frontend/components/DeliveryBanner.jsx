import { useState, useEffect } from 'react';
import { MapPin, X, Truck, Clock, Navigation } from 'lucide-react';
import { calculateDeliveryInfo, getCoordinatesFromPincode, isValidPincode } from '../lib/deliveryCalculator';

export default function DeliveryBanner() {
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [showPincodeInput, setShowPincodeInput] = useState(false);
  const [pincode, setPincode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    console.log('DeliveryBanner mounted!');

    // Check if user already has delivery info stored
    const savedDelivery = localStorage.getItem('deliveryInfo');
    if (savedDelivery) {
      try {
        setDeliveryInfo(JSON.parse(savedDelivery));
        console.log('Loaded saved delivery info:', JSON.parse(savedDelivery));
        return;
      } catch (e) {
        console.error('Error loading saved delivery info:', e);
      }
    }

    // Try to get location automatically
    attemptAutoLocation();

    // Fallback: Show pincode input after 2 seconds if no delivery info
    setTimeout(() => {
      if (!deliveryInfo) {
        console.log('No delivery info after 2s, showing pincode input');
        setShowPincodeInput(true);
        setIsLoading(false);
      }
    }, 2000);
  }, []);

  const attemptAutoLocation = () => {
    console.log('attemptAutoLocation called');
    if ('geolocation' in navigator) {
      console.log('Geolocation is supported, requesting permission...');
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Geolocation success:', position.coords);
          checkDeliveryByCoords(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.log('Geolocation denied:', error);
          setLocationDenied(true);
          setIsLoading(false);
          // Fallback to pincode input
          setShowPincodeInput(true);
        },
        {
          timeout: 5000,
          maximumAge: 300000 // Cache for 5 minutes
        }
      );
    } else {
      console.log('Geolocation not supported');
      setLocationDenied(true);
      setShowPincodeInput(true);
    }
  };

  const checkDeliveryByCoords = (lat, lng) => {
    try {
      console.log('Checking delivery for coords:', lat, lng);
      const info = calculateDeliveryInfo(lat, lng);
      // Determine city roughly or just say "Your Location"
      info.city = info.isExpress ? 'Jaipur' : 'Your Location';

      setDeliveryInfo(info);
      localStorage.setItem('deliveryInfo', JSON.stringify(info));
      setLocationDenied(false);
    } catch (error) {
      console.error('Error checking delivery:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePincodeSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidPincode(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsLoading(true);
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      console.log('Processing pincode:', pincode);
      const coords = getCoordinatesFromPincode(pincode);

      if (coords) {
        const info = calculateDeliveryInfo(coords.lat, coords.lng);
        info.city = coords.city;
        setDeliveryInfo(info);
        localStorage.setItem('deliveryInfo', JSON.stringify(info));
        setShowPincodeInput(false);
        setPincode('');
        setLocationDenied(false);
      } else {
        // Fallback standard
        const info = {
          distance: null,
          zone: {
            radius: Infinity,
            time: '3-5 days',
            label: 'Standard Delivery',
            icon: '📮'
          },
          message: '📮 Standard Delivery in 3-5 days',
          isExpress: false,
          city: 'India'
        };
        setDeliveryInfo(info);
        localStorage.setItem('deliveryInfo', JSON.stringify(info));
        setShowPincodeInput(false);
        setPincode('');
      }
    } catch (error) {
      setError('Unable to check delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsClosed(true);
    sessionStorage.setItem('deliveryBannerClosed', 'true');
  };

  const handleChangeLocation = () => {
    setShowPincodeInput(true);
    setPincode('');
    setError('');
  };

  if (isClosed) {
    console.log('Banner is closed, not rendering');
    return null;
  }

  console.log('Rendering DeliveryBanner', { isLoading, deliveryInfo, showPincodeInput });

  return (
    <div className="bg-gradient-to-r from-heritage via-copper to-heritage text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Delivery Info or Input */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm md:text-base font-medium truncate">
                    Detecting location...
                  </span>
                </>
              ) : showPincodeInput ? (
                <form onSubmit={handlePincodeSubmit} className="flex-1 flex items-center gap-1.5 sm:gap-2 md:gap-3 min-w-0">
                  <MapPin className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  <div className="flex-1 flex gap-1.5 sm:gap-2 min-w-0">
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Pincode"
                      className="flex-1 sm:flex-none sm:w-28 md:w-32 px-2 py-1 sm:px-3 sm:py-1.5 md:py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-md sm:rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-xs sm:text-sm"
                      maxLength={6}
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={isLoading || pincode.length !== 6}
                      className="flex-shrink-0 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-white text-heritage font-semibold rounded-md sm:rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs sm:text-sm"
                    >
                      Check
                    </button>
                  </div>
                  {error && (
                    <span className="hidden md:block text-xs text-red-200 flex-shrink-0">{error}</span>
                  )}
                </form>
              ) : deliveryInfo ? (
                <>
                  <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <span className="text-base sm:text-xl md:text-2xl">{deliveryInfo.zone.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm md:text-base font-bold truncate leading-tight">
                      {deliveryInfo.message}
                    </p>
                    {deliveryInfo.city && (
                      <p className="text-[10px] sm:text-xs text-white/80 truncate mt-0.5">
                        📍 {deliveryInfo.city}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleChangeLocation}
                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 bg-white/20 hover:bg-white/30 rounded-md sm:rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 backdrop-blur-sm"
                  >
                    <MapPin size={12} className="sm:w-3.5 sm:h-3.5" />
                    <span className="hidden sm:inline">Change</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowPincodeInput(true)}
                  className="flex items-center gap-1.5 sm:gap-2 md:gap-3 text-xs sm:text-sm md:text-base font-medium hover:underline min-w-0"
                >
                  <MapPin className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  <span className="truncate">Check delivery time</span>
                </button>
              )}
            </div>

            {/* Right: Close Button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={16} className="sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Mobile Error Message */}
          {error && (
            <p className="md:hidden mt-1.5 text-[10px] sm:text-xs text-red-200">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
