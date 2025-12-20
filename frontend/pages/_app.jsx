import { useEffect } from 'react';
import Head from 'next/head';
import { getApiUrl } from '../lib/config';
import '../styles/globals.css';
import CookieConsent from '../components/CookieConsent';
import DeliveryBar from '../components/DeliveryBar';
import AnnouncementBar from '../components/AnnouncementBar';
import SpinWheelPopup from '../components/SpinWheelPopup';
import { useRouter } from 'next/router';
import { CartProvider } from '../context/CartContext';

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
          <link rel="icon" href="/varaha-assets/loader.jpg" />
        </Head>
        <Component {...pageProps} />
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="icon" href="/varaha-assets/loader.jpg" />
      </Head>
      <CartProvider>
        {isHomePage && <DeliveryBar variant="desktop" />}
        {!isHomePage && <AnnouncementBar />}
        <Component {...pageProps} />
        <CookieConsent />
        <SpinWheelPopup />
      </CartProvider>
    </>
  );
}

export default MyApp;
