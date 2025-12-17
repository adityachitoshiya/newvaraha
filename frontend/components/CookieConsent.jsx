import { useState, useEffect } from 'react';
import { X, Cookie, Shield, Settings } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true, can't be disabled
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show banner after a small delay for better UX
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        console.error('Error loading cookie preferences:', e);
      }
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    };
    savePreferences(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    };
    savePreferences(necessaryOnly);
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  const savePreferences = (prefs) => {
    localStorage.setItem('cookieConsent', JSON.stringify(prefs));
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);
    
    // Here you can initialize analytics/marketing scripts based on preferences
    if (prefs.analytics) {
      console.log('Analytics cookies enabled');
      // Initialize Google Analytics or similar
    }
    if (prefs.marketing) {
      console.log('Marketing cookies enabled');
      // Initialize marketing pixels
    }
  };

  const togglePreference = (key) => {
    if (key === 'necessary') return; // Can't disable necessary cookies
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[9998] pointer-events-none" />

      {/* Cookie Consent Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 pointer-events-none">
        <div className="max-w-6xl mx-auto pointer-events-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-copper to-heritage rounded-xl flex items-center justify-center">
                  <Cookie className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold text-heritage mb-2">
                    🍪 Cookie Settings
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                    We use cookies to enhance your browsing experience, serve personalized content, 
                    and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
                  </p>
                </div>
              </div>

              {/* Settings Panel */}
              {showSettings && (
                <div className="mb-6 p-4 sm:p-6 bg-gray-50 rounded-xl space-y-4">
                  {/* Necessary Cookies */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={preferences.necessary}
                      disabled
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-heritage cursor-not-allowed opacity-50"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-heritage mb-1 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Necessary Cookies (Required)
                      </h4>
                      <p className="text-sm text-gray-600">
                        Essential for the website to function properly. These cannot be disabled.
                      </p>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-heritage focus:ring-copper cursor-pointer"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-heritage mb-1">
                        Analytics Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        Help us understand how visitors interact with our website by collecting anonymous data.
                      </p>
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => togglePreference('marketing')}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-heritage focus:ring-copper cursor-pointer"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-heritage mb-1">
                        Marketing Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        Used to track visitors across websites to display relevant advertisements.
                      </p>
                    </div>
                  </div>

                  {/* Preference Cookies */}
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={preferences.preferences}
                      onChange={() => togglePreference('preferences')}
                      className="mt-1 w-5 h-5 rounded border-gray-300 text-heritage focus:ring-copper cursor-pointer"
                    />
                    <div className="flex-1">
                      <h4 className="font-semibold text-heritage mb-1">
                        Preference Cookies
                      </h4>
                      <p className="text-sm text-gray-600">
                        Remember your preferences and settings for a better experience.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {!showSettings ? (
                  <>
                    <button
                      onClick={acceptAll}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      Accept All Cookies
                    </button>
                    <button
                      onClick={acceptNecessary}
                      className="flex-1 px-6 py-3 bg-gray-200 text-heritage font-semibold rounded-xl hover:bg-gray-300 transition-all duration-300"
                    >
                      Necessary Only
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      className="flex-shrink-0 px-6 py-3 border-2 border-heritage text-heritage font-semibold rounded-xl hover:bg-heritage hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <Settings className="w-5 h-5" />
                      <span className="hidden sm:inline">Customize</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={saveCustomPreferences}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
                    >
                      Save Preferences
                    </button>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-heritage font-semibold rounded-xl hover:bg-gray-300 transition-all duration-300"
                    >
                      Back
                    </button>
                  </>
                )}
              </div>

              {/* Privacy Policy Link */}
              <div className="mt-4 text-center">
                <a
                  href="/privacy-policy"
                  className="text-sm text-copper hover:text-heritage underline transition-colors"
                >
                  Read our Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
