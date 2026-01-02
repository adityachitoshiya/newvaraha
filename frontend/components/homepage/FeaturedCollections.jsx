import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import useScrollAnimation from '../../hooks/useScrollAnimation';
import ShimmerImage from '../ShimmerImage';

const collections = [
  {
    id: 1,
    title: 'Heritage Collection',
    description: 'Timeless pieces inspired by royal traditions',
    image: '/varaha-assets/heroimage.avif',
    href: '/shop?category=Heritage'
  },
  {
    id: 2,
    title: 'Bridal Elegance',
    description: 'Exquisite adornments for your special day',
    image: '/varaha-assets/Jimage2.avif',
    href: '/shop?category=Bridal'
  },
  {
    id: 3,
    title: 'Contemporary Classics',
    description: 'Modern designs with traditional soul',
    image: '/varaha-assets/Jimage3.webp',
    href: '/shop?category=Contemporary'
  },
  {
    id: 4,
    title: 'Temple Treasures',
    description: 'Sacred artistry in every detail',
    image: '/varaha-assets/herosection2.jpg',
    href: '/shop?category=Temple'
  }
];

function CollectionCard({ collection, delay }) {
  const [ref, isVisible] = useScrollAnimation();

  return (
    <Link
      ref={ref}
      href={collection.href}
      className={`group transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="bg-white border border-copper/30 rounded-sm overflow-hidden hover:border-copper hover:shadow-lg transition-all duration-500 hover:scale-[1.02]">
        {/* Image Container */}
        <div className="relative h-80 overflow-hidden">
          <ShimmerImage
            src={collection.image}
            alt={collection.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={(e) => {
              // Note: next/image handles errors differently, but we can pass standard props
              // If fallback is needed, ShimmerImage/NextImage handles it via src fallback usually
              // For now simpler to keep clean or rely on next/image built-in handling
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-heritage/80 via-heritage/20 to-transparent opacity-60"></div>
        </div>

        {/* Content */}
        <div className="p-8 bg-white">
          <h3 className="font-playfair text-2xl font-bold text-heritage mb-3 group-hover:text-copper transition-colors duration-300">
            {collection.title}
          </h3>
          <p className="font-sans text-sm text-heritage/70 mb-5 leading-relaxed">
            {collection.description}
          </p>

          <div className="flex items-center text-copper font-semibold text-sm group-hover:gap-3 transition-all duration-300">
            <span>Explore</span>
            <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform duration-300" size={18} />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function FeaturedCollections() {
  const [ref, isVisible] = useScrollAnimation();

  return (
    <section className="py-24 bg-warm-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={ref}
          className={`text-center mb-20 transition-all duration-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
        >
          <div className="w-16 h-px bg-copper mx-auto mb-6"></div>
          <h2 className="font-royal text-5xl md:text-6xl font-bold text-heritage mb-6 tracking-tight">
            Our Collections
          </h2>
          <p className="font-playfair text-xl text-heritage/70 max-w-2xl mx-auto font-light">
            Discover exquisite pieces that blend heritage with contemporary elegance
          </p>
        </div>

        {/* Collection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {collections.map((collection, index) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              delay={index * 150}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
