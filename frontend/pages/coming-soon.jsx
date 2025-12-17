import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, Wrench, Sparkles, Clock } from 'lucide-react';
import Image from 'next/image';

export default function ComingSoon() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <Head>
        <title>Coming Soon - Varaha Jewels</title>
        <meta name="description" content="This page is under construction. Check back soon!" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-warm-sand via-ivory-smoke to-warm-sand flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-64 h-64 bg-copper/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-heritage/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-royal-orange/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10 px-4">
          {/* Logo */}
          <div className="mb-6 sm:mb-8 flex justify-center animate-fadeIn">
            <Image
              src="/varaha-assets/logo.png"
              alt="Varaha Jewels"
              width={200}
              height={70}
              className="h-12 sm:h-16 w-auto"
            />
          </div>

          {/* Construction Icon */}
          <div className="mb-6 sm:mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-copper/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-copper to-heritage p-5 sm:p-6 rounded-full shadow-2xl animate-bounce">
                <Wrench size={40} className="text-warm-sand sm:w-12 sm:h-12" />
              </div>
            </div>
          </div>

          {/* Main Heading */}
          <h1 className="font-royal text-4xl sm:text-5xl md:text-7xl font-bold text-heritage mb-4 sm:mb-6 animate-fadeUp">
            Under Construction
          </h1>

          {/* Animated Dots */}
          <div className="h-6 sm:h-8 mb-4 sm:mb-6">
            <p className="text-copper text-xl sm:text-2xl font-semibold animate-pulse">
              Crafting Excellence{dots}
            </p>
          </div>

          {/* Description */}
          <p className="text-heritage/80 text-base sm:text-lg md:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed animate-fadeUp px-4" style={{ animationDelay: '0.2s' }}>
            We're carefully crafting something beautiful for you. Just like our exquisite jewelry, 
            this page is being created with attention to every detail.
          </p>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12 max-w-3xl mx-auto">
            <div className="bg-white/50 backdrop-blur-sm p-5 sm:p-6 rounded-lg shadow-lg border border-copper/20 animate-fadeUp" style={{ animationDelay: '0.3s' }}>
              <Sparkles className="mx-auto mb-3 sm:mb-4 text-copper" size={28} />
              <h3 className="font-semibold text-heritage mb-2 text-sm sm:text-base">Premium Quality</h3>
              <p className="text-heritage/70 text-xs sm:text-sm">Exceptional craftsmanship in every piece</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-5 sm:p-6 rounded-lg shadow-lg border border-copper/20 animate-fadeUp" style={{ animationDelay: '0.4s' }}>
              <Clock className="mx-auto mb-3 sm:mb-4 text-copper" size={28} />
              <h3 className="font-semibold text-heritage mb-2 text-sm sm:text-base">Coming Soon</h3>
              <p className="text-heritage/70 text-xs sm:text-sm">Worth the wait, we promise</p>
            </div>

            <div className="bg-white/50 backdrop-blur-sm p-5 sm:p-6 rounded-lg shadow-lg border border-copper/20 animate-fadeUp" style={{ animationDelay: '0.5s' }}>
              <Wrench className="mx-auto mb-3 sm:mb-4 text-copper" size={28} />
              <h3 className="font-semibold text-heritage mb-2 text-sm sm:text-base">In Progress</h3>
              <p className="text-heritage/70 text-xs sm:text-sm">Building something special</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-scaleIn px-4" style={{ animationDelay: '0.6s' }}>
            <Link
              href="/"
              className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-copper text-warm-sand font-semibold rounded-sm hover:bg-heritage transition-all duration-300 flex items-center justify-center gap-3 shadow-lg text-sm sm:text-base"
            >
              <ArrowLeft className="group-hover:-translate-x-2 transition-transform duration-300" size={18} />
              Back to Home
            </Link>

            <Link
              href="/product/1"
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-copper text-heritage font-semibold rounded-sm hover:bg-copper/10 transition-all duration-300 shadow-lg text-sm sm:text-base"
            >
              Explore Products
            </Link>
          </div>

          {/* Bottom Text */}
          <p className="mt-8 sm:mt-12 text-heritage/60 text-xs sm:text-sm animate-fadeIn px-4" style={{ animationDelay: '0.8s' }}>
            Meanwhile, explore our existing collections and discover timeless elegance
          </p>
        </div>
      </div>
    </>
  );
}
