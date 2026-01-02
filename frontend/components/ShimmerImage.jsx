import { useState, forwardRef } from 'react';
import Image from 'next/image';

const ShimmerImage = forwardRef(({ src, alt, className, priority = false, ...props }, ref) => {
    const [isLoading, setIsLoading] = useState(true);

    // Check if it's a video file based on extension
    const isVideo = src?.toLowerCase().endsWith('.mp4') || src?.toLowerCase().endsWith('.webm');

    return (
        <div className={`relative overflow-hidden ${className}`}>
            {/* Shimmer Placeholder */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse z-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-effect"></div>
                </div>
            )}

            {isVideo ? (
                <video
                    ref={ref}
                    src={src}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoadedData={(e) => {
                        setIsLoading(false);
                        if (props.onLoadedData) props.onLoadedData(e);
                    }}
                    muted
                    loop
                    autoPlay
                    playsInline
                    {...props}
                />
            ) : (
                <Image
                    ref={ref}
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    onLoadingComplete={(img) => {
                        setIsLoading(false);
                        if (props.onLoadingComplete) props.onLoadingComplete(img);
                    }}
                    priority={priority}
                    fill // Default to fill, can be overridden by className sizing
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    {...props}
                />
            )}

            <style jsx>{`
        .shimmer-effect {
          animation: shimmer 1.5s infinite linear;
          transform: translateX(-100%);
        }
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
        </div>
    );
});

ShimmerImage.displayName = 'ShimmerImage';

export default ShimmerImage;
