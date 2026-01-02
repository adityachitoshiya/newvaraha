import { useState, useEffect } from 'react';
import { MapPin, Truck, Package, Clock, Check } from 'lucide-react';
import { calculateDeliveryInfo, getCoordinatesFromPincode, isValidPincode } from '../lib/deliveryCalculator';

export default function ProductDeliveryWidget({ productId }) {
  const [deliveryInfo, setDeliveryInfo] = useState(null);
  const [pincode, setPincode] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // Load saved delivery info
    const saved = localStorage.getItem('deliveryInfo');
    if (saved) {
      try {
        setDeliveryInfo(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading delivery info:', e);
      }
    }
  }, []);

  const checkDelivery = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidPincode(pincode)) {
      setError('Please enter a valid 6-digit pincode');
      return;
    }

    setIsChecking(true);
    // Simulate API delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const coords = getCoordinatesFromPincode(pincode);

      if (coords) {
        const info = calculateDeliveryInfo(coords.lat, coords.lng);
        info.city = coords.city;
        setDeliveryInfo(info);
        localStorage.setItem('deliveryInfo', JSON.stringify(info));
        setExpanded(true);
      } else {
        // Fallback for unknown pincodes (Standard Delivery)
        const standardInfo = {
          distance: null,
          zone: {
            radius: Infinity,
            time: '3-5 days',
            label: 'Standard Delivery',
            icon: '📮'
          },
          message: '📮 Standard Delivery in 3-5 days',
          isExpress: false
        };
        setDeliveryInfo(standardInfo);
        localStorage.setItem('deliveryInfo', JSON.stringify(standardInfo));
        setExpanded(true);
      }
    } catch (error) {
      setError('Unable to check delivery. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="border-2 border-heritage/20 rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-warm-sand/30 to-white">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-heritage/5 to-copper/5 border-b border-heritage/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-copper to-heritage rounded-lg flex items-center justify-center flex-shrink-0">
            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-heritage text-sm sm:text-base md:text-lg truncate">Delivery Options</h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">Check delivery time</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Pincode Input */}
        <form onSubmit={checkDelivery} className="flex gap-2">
          <div className="flex-1 relative min-w-0">
            <MapPin className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-heritage/60" />
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter pincode"
              className="w-full pl-8 sm:pl-10 pr-2 sm:pr-4 py-2 sm:py-2.5 md:py-3 border-2 border-heritage/20 rounded-lg focus:outline-none focus:border-copper text-heritage font-medium text-sm sm:text-base"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isChecking || pincode.length !== 6}
            className="flex-shrink-0 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-sm sm:text-base"
          >
            {isChecking ? (
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Check'
            )}
          </button>
        </form>

        {error && (
          <p className="text-xs sm:text-sm text-red-600 bg-red-50 px-2 sm:px-3 py-2 rounded-lg">{error}</p>
        )}

        {/* Delivery Info */}
        {deliveryInfo && (
          <div className="space-y-2 sm:space-y-3 animate-slideDown">
            {/* Main Delivery Time */}
            <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-xl sm:text-2xl">{deliveryInfo.zone.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-green-800 text-sm sm:text-base md:text-lg truncate">
                  {deliveryInfo.zone.label}
                </p>
                <p className="text-green-700 text-xs sm:text-sm truncate">
                  Delivery in <strong>{deliveryInfo.zone.time}</strong>
                </p>
              </div>
              <Check className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            </div>

            {/* Additional Details */}
            {expanded && (
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex items-start gap-2 text-gray-700">
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-heritage flex-shrink-0" />
                  <span>Free shipping on orders above ₹5,000</span>
                </div>
                <div className="flex items-start gap-2 text-gray-700">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 text-heritage flex-shrink-0" />
                  <span>Order within {getOrderCutoffTime()} for same-day dispatch</span>
                </div>
                {deliveryInfo.isExpress && (
                  <div className="flex items-start gap-2 text-green-700 font-medium">
                    <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mt-0.5 flex-shrink-0" />
                    <span>Express delivery available! Order now for fastest shipping.</span>
                  </div>
                )}
              </div>
            )}

            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                className="text-xs sm:text-sm text-copper hover:text-heritage font-medium underline"
              >
                View more details
              </button>
            )}
          </div>
        )}

        {/* Default Info */}
        {!deliveryInfo && (
          <div className="text-xs sm:text-sm text-gray-600 space-y-2">
            <p className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-heritage flex-shrink-0" />
              <span>Standard delivery: 3-5 business days</span>
            </p>
            <p className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-heritage flex-shrink-0" />
              <span>Free shipping on orders above ₹5,000</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to calculate order cutoff time
function getOrderCutoffTime() {
  const now = new Date();
  const cutoff = new Date();
  cutoff.setHours(16, 0, 0, 0); // 4 PM cutoff

  if (now < cutoff) {
    const hours = Math.floor((cutoff - now) / (1000 * 60 * 60));
    const minutes = Math.floor(((cutoff - now) % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  return 'tomorrow';
}
