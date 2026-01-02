import { useEffect } from 'react';
import Head from 'next/head';
import { getApiUrl } from '../lib/config';
import '../lib/firebase'; // Initialize Firebase
import '../styles/globals.css';
import CookieConsent from '../components/CookieConsent';
import DeliveryBar from '../components/DeliveryBar';
import AnnouncementBar from '../components/AnnouncementBar';
import SpinWheelPopup from '../components/SpinWheelPopup';
import { useRouter } from 'next/router';
import { CartProvider } from '../context/CartContext';
import { NotificationProvider } from '../context/NotificationContext';
import NotificationPopup from '../components/NotificationPopup';
import MobileBottomNav from '../components/MobileBottomNav';
import { SpeedInsights } from "@vercel/speed-insights/next";

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const isHomePage = router.pathname === '/';
  const isAdmin = router.pathname.startsWith('/admin');

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const API_URL = getApiUrl();
        await fetch(`${API_URL}/api/track-visit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: router.asPath })
        });
      } catch (err) {
        console.error('Tracking error:', err);
      }
    };

    trackVisit(); // Track initial load

    // Subscribe to route changes
    router.events.on('routeChangeComplete', trackVisit);
    return () => {
      router.events.off('routeChangeComplete', trackVisit);
    };
  }, [router.asPath]);

  if (isAdmin) {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
          <link rel="icon" href="/favicon-circle.png" />
        </Head>
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#F4E6D8" />
        <link rel="icon" href="/favicon-circle.png" />
      </Head>

      <NotificationProvider>
        <NotificationPopup />
        <CartProvider>
          {isHomePage && <DeliveryBar variant="desktop" />}
          {!isHomePage && <AnnouncementBar />}

          {/* Main Content with Transition */}
          <Component {...pageProps} />
          <SpeedInsights />

          <CookieConsent />
          <SpinWheelPopup />

          {/* Mobile Bottom Nav - Hidden on Product & Checkout Pages */}
          {!router.pathname.startsWith('/product/') && router.pathname !== '/checkout' && (
            <MobileBottomNav />
          )}

        </CartProvider>
      </NotificationProvider>
    </>
  );
}

export default MyApp;
