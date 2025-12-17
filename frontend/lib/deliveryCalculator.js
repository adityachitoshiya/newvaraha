// Haversine formula to calculate distance between two coordinates
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Jaipur city center coordinates
export const JAIPUR_COORDS = {
  lat: 26.9124,
  lng: 75.7873
};

// Delivery zones configuration
export const DELIVERY_ZONES = {
  EXPRESS: {
    radius: 15, // 15 km from Jaipur center
    time: '2-3 hours',
    label: 'Express Delivery',
    icon: '⚡'
  },
  SAME_DAY: {
    radius: 30, // 30 km
    time: 'Same Day',
    label: 'Same Day Delivery',
    icon: '🚚'
  },
  NEXT_DAY: {
    radius: 100, // 100 km (Rajasthan nearby cities)
    time: '1-2 days',
    label: 'Next Day Delivery',
    icon: '📦'
  },
  STANDARD: {
    radius: Infinity,
    time: '3-5 days',
    label: 'Standard Delivery',
    icon: '📮'
  }
};

// Get delivery zone based on distance
export function getDeliveryZone(distance) {
  if (distance <= DELIVERY_ZONES.EXPRESS.radius) {
    return DELIVERY_ZONES.EXPRESS;
  } else if (distance <= DELIVERY_ZONES.SAME_DAY.radius) {
    return DELIVERY_ZONES.SAME_DAY;
  } else if (distance <= DELIVERY_ZONES.NEXT_DAY.radius) {
    return DELIVERY_ZONES.NEXT_DAY;
  } else {
    return DELIVERY_ZONES.STANDARD;
  }
}

// Indian pincode to coordinates mapping (sample data)
// In production, you'd use a complete database or geocoding API
export const PINCODE_COORDINATES = {
  // Jaipur pincodes
  '302001': { lat: 26.9124, lng: 75.7873, city: 'Jaipur' },
  '302002': { lat: 26.9389, lng: 75.8233, city: 'Jaipur' },
  '302003': { lat: 26.9260, lng: 75.8235, city: 'Jaipur' },
  '302004': { lat: 26.8973, lng: 75.8095, city: 'Jaipur' },
  '302005': { lat: 26.8850, lng: 75.8450, city: 'Jaipur' },
  '302006': { lat: 26.9154, lng: 75.7879, city: 'Jaipur' },
  '302012': { lat: 26.8467, lng: 75.8056, city: 'Jaipur' },
  '302013': { lat: 26.8206, lng: 75.8472, city: 'Jaipur' },
  '302015': { lat: 26.8530, lng: 75.8644, city: 'Jaipur' },
  '302016': { lat: 26.9707, lng: 75.7650, city: 'Jaipur' },
  '302017': { lat: 26.9510, lng: 75.7391, city: 'Jaipur' },
  '302018': { lat: 26.8829, lng: 75.7544, city: 'Jaipur' },
  '302019': { lat: 26.9000, lng: 75.7300, city: 'Jaipur' },
  '302020': { lat: 26.9200, lng: 75.7000, city: 'Jaipur' },
  '302021': { lat: 26.8270, lng: 75.8131, city: 'Jaipur' },
  '302022': { lat: 26.7922, lng: 75.8136, city: 'Jaipur' },
  '302023': { lat: 26.9824, lng: 75.8505, city: 'Jaipur' },
  '303001': { lat: 27.0174, lng: 75.8648, city: 'Jaipur (Rural)' },
  '303002': { lat: 26.8300, lng: 75.6500, city: 'Jaipur (Rural)' },
  
  // Other major Rajasthan cities
  '301001': { lat: 27.5706, lng: 76.6413, city: 'Alwar' },
  '305001': { lat: 26.4499, lng: 74.6399, city: 'Ajmer' },
  '306001': { lat: 25.3450, lng: 73.0060, city: 'Pali' },
  '307001': { lat: 24.5854, lng: 72.7156, city: 'Sirohi' },
  '311001': { lat: 25.3526, lng: 74.6394, city: 'Bhilwara' },
  '313001': { lat: 24.5854, lng: 73.7125, city: 'Udaipur' },
  '321001': { lat: 27.2152, lng: 77.5065, city: 'Bharatpur' },
  '324001': { lat: 25.1436, lng: 75.8648, city: 'Kota' },
  '332001': { lat: 28.0229, lng: 75.5397, city: 'Sikar' },
  '334001': { lat: 28.0229, lng: 73.3119, city: 'Bikaner' },
  '342001': { lat: 26.2389, lng: 73.0243, city: 'Jodhpur' },
  '344001': { lat: 26.9157, lng: 70.9083, city: 'Barmer' },
  '345001': { lat: 27.0238, lng: 72.3119, city: 'Jaisalmer' },
};

// Validate Indian pincode format
export function isValidPincode(pincode) {
  return /^[1-9][0-9]{5}$/.test(pincode);
}

// Get coordinates from pincode
export function getCoordinatesFromPincode(pincode) {
  return PINCODE_COORDINATES[pincode] || null;
}

// Calculate delivery info from coordinates
export function calculateDeliveryInfo(userLat, userLng) {
  const distance = calculateDistance(
    JAIPUR_COORDS.lat,
    JAIPUR_COORDS.lng,
    userLat,
    userLng
  );
  
  const zone = getDeliveryZone(distance);
  
  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    zone,
    message: `${zone.icon} ${zone.label} in ${zone.time}`,
    isExpress: distance <= DELIVERY_ZONES.EXPRESS.radius
  };
}
