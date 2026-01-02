/**
 * Cookie Consent Utility Functions
 * Use these functions to check if user has consented to different types of cookies
 */

/**
 * Get the current cookie consent preferences
 * @returns {Object|null} Cookie preferences or null if not set
 */
export const getCookieConsent = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const consent = localStorage.getItem('cookieConsent');
    return consent ? JSON.parse(consent) : null;
  } catch (error) {
    console.error('Error reading cookie consent:', error);
    return null;
  }
};

/**
 * Check if user has consented to a specific cookie type
 * @param {string} type - Cookie type: 'necessary', 'analytics', 'marketing', 'preferences'
 * @returns {boolean}
 */
export const hasConsent = (type) => {
  const consent = getCookieConsent();
  if (!consent) return false;
  return consent[type] === true;
};

/**
 * Check if user has consented to analytics cookies
 * @returns {boolean}
 */
export const hasAnalyticsConsent = () => hasConsent('analytics');

/**
 * Check if user has consented to marketing cookies
 * @returns {boolean}
 */
export const hasMarketingConsent = () => hasConsent('marketing');

/**
 * Check if user has consented to preference cookies
 * @returns {boolean}
 */
export const hasPreferencesConsent = () => hasConsent('preferences');

/**
 * Check if user has made any cookie consent choice
 * @returns {boolean}
 */
export const hasUserMadeChoice = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('cookieConsent') !== null;
};

/**
 * Get the date when user made their cookie consent choice
 * @returns {Date|null}
 */
export const getConsentDate = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const date = localStorage.getItem('cookieConsentDate');
    return date ? new Date(date) : null;
  } catch (error) {
    console.error('Error reading consent date:', error);
    return null;
  }
};

/**
 * Clear all cookie consent data (for testing purposes)
 */
export const clearCookieConsent = () => {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('cookieConsent');
  localStorage.removeItem('cookieConsentDate');
};

/**
 * Initialize Google Analytics if user has consented
 * @param {string} measurementId - Your GA4 Measurement ID
 */
export const initializeAnalytics = (measurementId) => {
  if (!hasAnalyticsConsent()) return;
  
  // Add Google Analytics script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', measurementId);
  
  console.log('Google Analytics initialized');
};

/**
 * Initialize Facebook Pixel if user has consented
 * @param {string} pixelId - Your Facebook Pixel ID
 */
export const initializeFacebookPixel = (pixelId) => {
  if (!hasMarketingConsent()) return;
  
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  
  fbq('init', pixelId);
  fbq('track', 'PageView');
  
  console.log('Facebook Pixel initialized');
};

/**
 * Set a cookie with proper consent checking
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} days - Expiration in days
 * @param {string} type - Cookie type for consent checking
 */
export const setCookie = (name, value, days = 365, type = 'necessary') => {
  if (!hasConsent(type)) {
    console.warn(`Cannot set cookie ${name}: User has not consented to ${type} cookies`);
    return false;
  }
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
  return true;
};

/**
 * Get a cookie value
 * @param {string} name - Cookie name
 * @returns {string|null}
 */
export const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  
  const nameEQ = name + "=";
  const cookies = document.cookie.split(';');
  
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i];
    while (cookie.charAt(0) === ' ') cookie = cookie.substring(1, cookie.length);
    if (cookie.indexOf(nameEQ) === 0) return cookie.substring(nameEQ.length, cookie.length);
  }
  
  return null;
};
