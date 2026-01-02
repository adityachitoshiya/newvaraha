import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Primary Meta Tags */}
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#A3562A" />

        {/* SEO Meta Tags */}
        <meta name="description" content="Varaha Jewels - Premium Indian jewelry store offering exquisite heritage collections, bridal jewelry, gold ornaments, and traditional designs. Shop authentic jewelry online with certified quality." />
        <meta name="keywords" content="Varaha Jewels, jewelry online India, gold jewelry, heritage jewelry, bridal jewelry, traditional jewelry, Indian ornaments, premium jewelry, certified gold, diamond jewelry, wedding jewelry, ethnic jewelry, online jewelry store" />
        <meta name="author" content="Varaha Jewels" />
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Varaha Jewels" />
        <meta property="og:title" content="Varaha Jewels - Premium Heritage Jewelry Collection" />
        <meta property="og:description" content="Discover exquisite heritage jewelry at Varaha Jewels. Premium gold, diamond, and traditional Indian ornaments with certified authenticity." />
        <meta property="og:image" content="/varaha-assets/logo.png" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Varaha Jewels - Premium Heritage Jewelry" />
        <meta name="twitter:description" content="Exquisite heritage jewelry collection. Premium gold, diamond, and traditional designs." />
        <meta name="twitter:image" content="/varaha-assets/logo.png" />

        {/* Business Information */}
        <meta name="geo.region" content="IN" />
        <meta name="geo.placename" content="India" />
        <meta name="category" content="Jewelry, Shopping, E-commerce" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        <meta name="rating" content="General" />

        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Preconnect for Performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://varahajewels.vercel.app" />
      </Head>
      <body className="antialiased">
        {/* Responsive viewport handled in individual pages */}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
