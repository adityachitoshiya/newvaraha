import Image from 'next/image';

export default function PremiumLoader() {
  return (
    <div className="fixed inset-0 z-[100] bg-heritage flex items-center justify-center">
      <div className="relative">
        {/* Rotating Orange Ring */}
        <div className="w-32 h-32 relative">
          <div className="absolute inset-0 border-4 border-transparent border-t-royal-orange rounded-full animate-rotate"></div>
          <div className="absolute inset-2 border-4 border-transparent border-b-copper rounded-full animate-rotate" style={{ animationDirection: 'reverse', animationDuration: '4s' }}></div>
        </div>

        {/* Loader Image */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-20 h-20 rounded-full overflow-hidden">
            <Image
              src="/varaha-assets/loader.jpg"
              alt="Varaha Jewels"
              fill
              sizes="80px"
              priority
              className="object-cover animate-pulse"
            />
          </div>
        </div>

        {/* Inner Glow Pulse */}
        <div className="absolute inset-4 bg-royal-orange/10 rounded-full animate-pulse blur-xl"></div>

        {/* Orange Shine Effect */}
        <div className="absolute inset-0 rounded-full animate-goldShine"></div>
      </div>

      {/* Loading Text */}
      <p className="absolute bottom-32 font-playfair text-royal-orange/80 text-lg tracking-widest animate-pulse">
        Loading Excellence...
      </p>
    </div>
  );
}
