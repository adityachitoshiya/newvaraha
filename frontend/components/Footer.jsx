import { Instagram, Facebook, Twitter, Mail, Phone, MapPin, Heart, Sparkles, Crown, ShoppingBag, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [goldRate, setGoldRate] = useState({ price: '1,24,040', change: '+0.5%' });
  const [silverRate, setSilverRate] = useState({ price: '2,08,900', change: '+0.3%' });
  const [baseRates, setBaseRates] = useState({ gold: 124040, silver: 208900 });

  useEffect(() => {
    // Fetch base rates from database
    const fetchBaseRates = async () => {
      try {
        const API_URL = typeof window !== 'undefined' ?
          (process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:8000`) :
          'http://127.0.0.1:8000';

        const response = await fetch(`${API_URL}/api/metal-rates`);
        const data = await response.json();

        setBaseRates({
          gold: data.gold_rate,
          silver: data.silver_rate
        });
      } catch (error) {
        console.error('Failed to fetch base rates:', error);
        // Keep default values if API fails
      }
    };

    fetchBaseRates();
  }, []);

  useEffect(() => {
    // Simulate realistic rate fluctuations every 30 seconds
    const updateRates = () => {
      // Random change between -0.8% to +0.8%
      const goldChangePercent = (Math.random() - 0.5) * 1.6;
      const silverChangePercent = (Math.random() - 0.5) * 1.2;

      // Calculate new prices with fluctuation based on database values
      const goldPrice = Math.round(baseRates.gold + (baseRates.gold * goldChangePercent / 100));
      const silverPrice = Math.round(baseRates.silver + (baseRates.silver * silverChangePercent / 100));

      setGoldRate({
        price: goldPrice.toLocaleString('en-IN'),
        change: `${goldChangePercent >= 0 ? '+' : ''}${goldChangePercent.toFixed(1)}%`
      });

      setSilverRate({
        price: silverPrice.toLocaleString('en-IN'),
        change: `${silverChangePercent >= 0 ? '+' : ''}${silverChangePercent.toFixed(1)}%`
      });
    };

    // Update immediately on mount and when base rates change
    updateRates();

    // Update every 30 seconds
    const interval = setInterval(updateRates, 30000);

    return () => clearInterval(interval);
  }, [baseRates]); // Re-run when base rates update

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setTimeout(() => {
        setEmail('');
        setSubscribed(false);
      }, 3000);
    }
  };

  return (
    <footer className="relative bg-gradient-to-b from-heritage via-heritage to-black text-warm-sand pb-32 lg:pb-0 border-t-2 border-copper overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 animate-float-slow">
          <Crown size={80} className="text-copper" />
        </div>
        <div className="absolute top-40 right-20 animate-float-medium">
          <Sparkles size={60} className="text-royal-orange" />
        </div>
        <div className="absolute bottom-20 left-1/3 animate-float-fast">
          <Heart size={50} className="text-copper" />
        </div>
      </div>

      {/* Top Wave Decoration */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-copper to-transparent"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10">
        {/* Live Metal Rates - India - TOP SECTION */}
        <div className="mb-12 pb-8 border-b border-copper/20">
          <div className="flex items-center justify-center gap-2 mb-6">
            <TrendingUp size={18} className="text-copper" />
            <h5 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-copper to-royal-orange">
              Today's Live Rates (India)
            </h5>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Gold Rate */}
            <div className="group relative p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/30 hover:border-yellow-500/60 transition-all duration-500 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-warm-sand/60 mb-1">Gold (24K)</p>
                  <p className="text-lg sm:text-xl font-bold text-yellow-400">₹{goldRate.price}</p>
                  <p className="text-xs text-warm-sand/50">per 10 grams</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${goldRate.change.startsWith('+')
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                    }`}>
                    {goldRate.change}
                  </span>
                  <p className="text-xs text-warm-sand/40 mt-1">Today</p>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl"></div>
            </div>

            {/* Silver Rate */}
            <div className="group relative p-4 rounded-xl bg-gradient-to-br from-gray-300/10 to-transparent border border-gray-300/30 hover:border-gray-300/60 transition-all duration-500 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-300/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-warm-sand/60 mb-1">Silver (999)</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-300">₹{silverRate.price}</p>
                  <p className="text-xs text-warm-sand/50">per 1 kg</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${silverRate.change.startsWith('+')
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                    }`}>
                    {silverRate.change}
                  </span>
                  <p className="text-xs text-warm-sand/40 mt-1">Today</p>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-20 h-20 bg-gray-300/5 rounded-full blur-2xl"></div>
            </div>
          </div>

          <p className="text-center text-xs text-warm-sand/40 mt-4 flex items-center justify-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Simulated rates • Updates every 30 seconds
          </p>
        </div>

        {/* Premium Trust Badges - Top Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 animate-fadeIn">
          {[
            { icon: <ShoppingBag />, title: 'Free Shipping', desc: 'On orders above ₹5000' },
            { icon: <Heart />, title: '7 Day Returns', desc: 'Easy return policy' },
            { icon: <Crown />, title: 'Lifetime Warranty', desc: 'Certified jewellery' },
            { icon: <Sparkles />, title: '100% Authentic', desc: 'Guaranteed purity' }
          ].map((item, idx) => (
            <div
              key={idx}
              className="group p-4 rounded-xl bg-gradient-to-br from-copper/10 to-transparent border border-copper/20 hover:border-copper/60 transition-all duration-500 hover:scale-105 hover:shadow-lg hover:shadow-copper/20"
            >
              <div className="flex flex-col items-center text-center gap-2">
                <div className="text-copper group-hover:text-royal-orange transition-colors duration-300 group-hover:scale-110 transform">
                  {item.icon}
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-warm-sand">{item.title}</p>
                  <p className="text-xs text-warm-sand/80">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 mb-16">
          {/* Brand & Newsletter - Larger Section */}
          <div className="lg:col-span-5 space-y-6">
            <div className="group">
              <div className="relative inline-block">
                <Image
                  src="/varaha-assets/logo.png"
                  alt="Varaha Jewels"
                  width={200}
                  height={70}
                  className="h-16 w-auto brightness-[2] group-hover:brightness-[2.5] transition-all duration-300"
                />
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-copper via-royal-orange to-copper transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              </div>
              <p className="text-warm-sand/70 text-sm italic font-light mt-3 tracking-wide flex items-center gap-2">
                <Crown size={16} className="text-copper" />
                Where heritage meets royalty
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-2xl font-royal font-bold text-transparent bg-clip-text bg-gradient-to-r from-copper via-royal-orange to-copper">
                Join Our Royal Family
              </h3>
              <p className="text-warm-sand/90 text-sm leading-relaxed">
                Get exclusive access to new collections, special offers, and royal treatment. Be the first to know about our premium designs!
              </p>

              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-copper/60 group-focus-within:text-copper transition-colors" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/30 border-2 border-copper/30 text-warm-sand text-sm placeholder-warm-sand/40 focus:outline-none focus:ring-2 focus:ring-copper focus:border-copper/60 transition-all duration-300"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-8 py-4 bg-gradient-to-r from-copper via-royal-orange to-copper text-white font-bold rounded-xl hover:shadow-2xl hover:shadow-copper/40 transition-all duration-500 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group"
                >
                  <span className="relative z-10">{subscribed ? 'Subscribed!' : 'Subscribe Now'}</span>
                  <Sparkles size={18} className="relative z-10 group-hover:rotate-12 transition-transform" />
                  <div className="absolute inset-0 bg-gradient-to-r from-royal-orange to-copper opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </button>
              </form>

              {/* Quick Contact */}
              <div className="pt-4 space-y-2 border-t border-copper/20">
                <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-warm-sand/80 hover:text-copper transition-colors group">
                  <Phone size={16} className="text-copper group-hover:scale-110 transition-transform" />
                  <span>+91 98765 43210</span>
                </a>
                <a href="mailto:hello@varahajewels.com" className="flex items-center gap-3 text-sm text-warm-sand/80 hover:text-copper transition-colors group">
                  <Mail size={16} className="text-copper group-hover:scale-110 transition-transform" />
                  <span>hello@varahajewels.com</span>
                </a>
                <div className="flex items-start gap-3 text-sm text-warm-sand/80">
                  <MapPin size={16} className="text-copper mt-0.5 flex-shrink-0" />
                  <span>Jaipur, Rajasthan, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links - Organized Better */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            {/* Shop */}
            <div className="space-y-4">
              <h4 className="font-bold text-copper text-base flex items-center gap-2 pb-2 border-b border-copper/30">
                <ShoppingBag size={18} />
                Collections
              </h4>
              <ul className="space-y-3 text-sm text-warm-sand/80">
                {['Heritage', 'Bridal', 'Exclusive', 'New Arrivals', 'Best Sellers'].map((item) => (
                  <li key={item}>
                    <Link href="/shop" className="hover:text-copper hover:pl-2 transition-all duration-300 inline-block group">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">→</span>
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="font-bold text-copper text-base flex items-center gap-2 pb-2 border-b border-copper/30">
                <Heart size={18} />
                Support
              </h4>
              <ul className="space-y-3 text-sm text-warm-sand/80">
                {[
                  { label: 'Contact Us', href: '/contact' },
                  { label: 'Track Order', href: '/orders' },
                  { label: 'FAQs', href: '/faq' },
                  { label: 'Shipping Info', href: '/shipping' },
                  { label: 'Size Guide', href: '/size-guide' }
                ].map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="hover:text-copper hover:pl-2 transition-all duration-300 inline-block group">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">→</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="font-bold text-copper text-base flex items-center gap-2 pb-2 border-b border-copper/30">
                <Crown size={18} />
                Company
              </h4>
              <ul className="space-y-3 text-sm text-warm-sand/80">
                {[
                  { label: 'About Us', href: '/about' },
                  { label: 'Our Story', href: '/story' },
                  { label: 'Careers', href: '/coming-soon' },
                  { label: 'Privacy Policy', href: '/privacy-policy' },
                  { label: 'Cookie Policy', href: '/cookie-policy' },
                  { label: 'Terms', href: '/terms' }
                ].map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="hover:text-copper hover:pl-2 transition-all duration-300 inline-block group"
                    >
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">→</span>
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('cookieConsent');
                        window.location.reload();
                      }
                    }}
                    className="hover:text-copper hover:pl-2 transition-all duration-300 inline-block group text-left"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mr-1">→</span>
                    Cookie Settings
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar - Enhanced */}
        <div className="pt-8 border-t-2 border-copper/30">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-6">
            {/* Social Icons - Premium Design */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-warm-sand/70 font-semibold">Follow Us:</span>
              <div className="flex gap-3">
                {[
                  { Icon: Instagram, href: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
                  { Icon: Facebook, href: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
                  { Icon: Twitter, href: '#', label: 'Twitter', color: 'hover:bg-sky-500' }
                ].map(({ Icon, href, label, color }) => (
                  <a
                    key={label}
                    href={href}
                    className={`group relative p-3 bg-gradient-to-br from-copper/20 to-transparent rounded-xl border border-copper/40 ${color} hover:border-transparent transition-all duration-300 hover:scale-110 hover:-translate-y-1`}
                    aria-label={label}
                  >
                    <Icon size={20} className="relative z-10 group-hover:text-white transition-colors" />
                    <div className="absolute inset-0 bg-gradient-to-br from-copper to-royal-orange opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300"></div>
                  </a>
                ))}
              </div>
            </div>

            {/* Payment Icons - Modern */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-xs text-warm-sand/70 font-semibold">Secure Payments:</span>
              <div className="flex items-center gap-2">
                {['visa_icon.svg', 'mastercard_icon.svg', 'rupay_icon.svg'].map((icon) => (
                  <div
                    key={icon}
                    className="p-2 bg-white/10 rounded-lg border border-copper/30 hover:border-copper hover:bg-white/20 transition-all duration-300 hover:scale-110"
                  >
                    <Image
                      src={`/varaha-assets/${icon}`}
                      alt={icon.split('_')[0]}
                      width={35}
                      height={22}
                      className="h-5 w-auto opacity-90 hover:opacity-100 transition-opacity"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copyright - Centered with Love */}
          <div className="text-center pt-6 border-t border-copper/20">
            <p className="text-sm text-warm-sand/70 flex items-center justify-center gap-2 flex-wrap">
              <span>© {new Date().getFullYear()} Varaha Jewels. All rights reserved.</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-1">
                Made with <Heart size={14} className="text-red-500 animate-pulse" fill="currentColor" /> in India
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Glow Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-copper/10 via-transparent to-transparent pointer-events-none"></div>
    </footer>
  );
}
