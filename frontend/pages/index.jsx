import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getApiUrl } from '../lib/config';
import HeroSection from '../components/homepage/HeroSection';
import FeaturedCollections from '../components/homepage/FeaturedCollections';
import ProductSpotlight from '../components/homepage/ProductSpotlight';
import TestimonialsSection from '../components/homepage/TestimonialsSection';
import CreatorShowcase from '../components/homepage/CreatorShowcase';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LaunchCountdown from '../components/LaunchCountdown';
import AddToCartModal from '../components/AddToCartModal';
import BackToTop from '../components/BackToTop';
import DeliveryBar from '../components/DeliveryBar';

export default function Home() {
  const [showFullPageCountdown, setShowFullPageCountdown] = useState(true);
  const [userSkipped, setUserSkipped] = useState(false);
  const router = useRouter();

  // Cart State
  const [cartItems, setCartItems] = useState([]);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart:', e);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Fetch Settings (Maintenance Mode & Countdown)
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const API_URL = getApiUrl();
        const res = await fetch(`${API_URL}/api/settings`);
        if (res.ok) {
          const settings = await res.json();

          if (settings.is_maintenance_mode) {
            router.push('/coming-soon');
            return;
          }

          if (settings.show_full_page_countdown === false) {
            setShowFullPageCountdown(false);
          }
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();
  }, [router]);

  // Calculate total cart count
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSkip = () => {
    setShowFullPageCountdown(false);
    setUserSkipped(true);
  };

  const handleUpdateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }
    setCartItems(cartItems.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  return (
    <>
      <Head>
        <title>Varaha Jewels - Premium Heritage Jewelry Collection | Buy Authentic Indian Jewelry Online</title>
        <meta name="description" content="Shop exquisite heritage jewelry at Varaha Jewels. Premium gold, diamond, and traditional Indian ornaments with certified authenticity. Free shipping, 30-day returns, and lifetime warranty." />
        <meta name="keywords" content="Varaha Jewels, jewelry online, gold jewelry India, heritage jewelry, bridal jewelry, diamond jewelry, traditional ornaments, Indian jewelry, premium jewelry store, certified gold jewelry, wedding jewelry collection" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Favicon */}
        <link rel="icon" href="/varaha-assets/og.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/varaha-assets/og.jpg" />
        <link rel="shortcut icon" href="/varaha-assets/og.jpg" />

        {/* Open Graph / Social Media */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://varahajewels.vercel.app" />
        <meta property="og:title" content="Varaha Jewels - Premium Heritage Jewelry Collection" />
        <meta property="og:description" content="Discover timeless elegance with Varaha Jewels - Premium heritage-inspired jewelry crafted with tradition and artistry. Shop authentic Indian jewelry online." />
        <meta property="og:image" content="/varaha-assets/og.jpg" />
        <meta property="og:site_name" content="Varaha Jewels" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Varaha Jewels - Premium Heritage Jewelry Collection" />
        <meta name="twitter:description" content="Discover timeless elegance with Varaha Jewels - Premium heritage-inspired jewelry." />
        <meta name="twitter:image" content="/varaha-assets/og.jpg" />

        {/* Structured Data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "JewelryStore",
              "name": "Varaha Jewels",
              "description": "Premium heritage jewelry store offering authentic Indian gold, diamond, and traditional ornaments",
              "url": "https://varahajewels.vercel.app",
              "logo": "https://varahajewels.vercel.app/varaha-assets/logo.png",
              "image": "https://varahajewels.vercel.app/varaha-assets/og.jpg",
              "telephone": "+91-98765-43210",
              "email": "support@varahajewels.com",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Heritage Lane, Jewelry District",
                "addressLocality": "Mumbai",
                "addressRegion": "Maharashtra",
                "postalCode": "400001",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": "19.0760",
                "longitude": "72.8777"
              },
              "openingHoursSpecification": [
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
                  "opens": "10:00",
                  "closes": "20:00"
                },
                {
                  "@type": "OpeningHoursSpecification",
                  "dayOfWeek": "Sunday",
                  "opens": "11:00",
                  "closes": "18:00"
                }
              ],
              "priceRange": "₹₹₹",
              "currenciesAccepted": "INR",
              "paymentAccepted": "Cash, Credit Card, Debit Card, UPI, Net Banking",
              "sameAs": [
                "https://www.instagram.com/varahajewels",
                "https://www.facebook.com/varahajewels",
                "https://twitter.com/varahajewels"
              ],
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "reviewCount": "2847",
                "bestRating": "5",
                "worstRating": "1"
              }
            })
          }}
        />

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Varaha Jewels",
              "alternateName": "Varaha Jewellery",
              "url": "https://varahajewels.vercel.app",
              "logo": "https://varahajewels.vercel.app/varaha-assets/logo.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+91-98765-43210",
                "contactType": "customer service",
                "email": "support@varahajewels.com",
                "areaServed": "IN",
                "availableLanguage": ["en", "hi"]
              }
            })
          }}
        />
      </Head>

      {showFullPageCountdown && (
        <LaunchCountdown onSkip={handleSkip} />
      )}

      {!showFullPageCountdown && (
        <>
          <Header
            cartCount={cartCount}
            onCartClick={() => setIsCartModalOpen(true)}
          />
          <DeliveryBar variant="mobile" />

          <main className="bg-warm-sand">
            <HeroSection />
            <FeaturedCollections />
            <ProductSpotlight />
            <TestimonialsSection />
            <CreatorShowcase />
          </main>

          <Footer />

          {/* Back to Top Button */}
          <BackToTop />

          {/* Cart Modal */}
          <AddToCartModal
            isOpen={isCartModalOpen}
            onClose={() => setIsCartModalOpen(false)}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onViewCart={() => {
              setIsCartModalOpen(false);
            }}
            onCheckout={() => {
              setIsCartModalOpen(false);
              // Navigate to checkout with cart items
              window.location.href = '/checkout?fromCart=true';
            }}
            onContinueShopping={() => {
              setIsCartModalOpen(false);
            }}
          />
        </>
      )}
    </>
  );
}
