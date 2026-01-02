import { Crown, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import useScrollAnimation from '../../hooks/useScrollAnimation';

export default function HeritageSection() {
  const [ref, isVisible] = useScrollAnimation();

  const heritageProducts = [
    {
      id: 1,
      name: 'Royal Maharani Necklace',
      category: 'Premium Collection',
      image: '/varaha-assets/heroimage.avif',
      tag: 'Premium'
    },
    {
      id: 2,
      name: 'Mughal Dynasty Pendant',
      category: 'Premium Collection',
      image: '/varaha-assets/Jimage2.avif',
      tag: 'Premium'
    },
    {
      id: 3,
      name: 'Heritage Silver Bangle',
      category: 'Signature Collection',
      image: '/varaha-assets/dp1.avif',
      tag: 'Signature'
    },
    {
      id: 4,
      name: 'Classic Temple Earrings',
      category: 'Signature Collection',
      image: '/varaha-assets/dp3.avif',
      tag: 'Signature'
    }
  ];

  return (
    <section className="py-12 sm:py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div 
          ref={ref}
          className={`text-center mb-10 sm:mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <p className="text-copper font-semibold text-sm sm:text-base mb-2 tracking-wide uppercase">
            Exclusive Collection
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold text-heritage mb-4">
            Heritage & Premium Designs
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Discover our exclusive heritage collection where tradition meets luxury
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10">
          {heritageProducts.map((product, index) => (
            <div
              key={product.id}
              className={`group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                {/* Image */}
                <div className="relative aspect-[3/4] overflow-hidden bg-warm-sand/20">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  
                  {/* Tag Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md ${
                      product.tag === 'Premium' 
                        ? 'bg-copper/90 text-white' 
                        : 'bg-heritage/90 text-white'
                    }`}>
                      {product.tag === 'Premium' ? <Crown size={12} /> : <Sparkles size={12} />}
                      {product.tag}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <p className="text-xs text-gray-500 mb-1">{product.category}</p>
                  <h3 className="font-serif text-lg sm:text-xl font-bold text-heritage mb-3 group-hover:text-copper transition-colors">
                    {product.name}
                  </h3>
                  <Link
                    href="/heritage"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-copper hover:gap-3 transition-all duration-300"
                  >
                    View Details
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div 
          className={`text-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          <Link
            href="/heritage"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-copper to-heritage text-white font-semibold rounded-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Explore Full Collection
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
