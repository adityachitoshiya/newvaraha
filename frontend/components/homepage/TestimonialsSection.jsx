import { Star, Quote, CheckCircle } from 'lucide-react';
import useScrollAnimation from '../../hooks/useScrollAnimation';

const testimonials = [
  {
    id: 1,
    name: 'Priya Sharma',
    location: 'Mumbai',
    rating: 5,
    text: 'The craftsmanship is absolutely exquisite. I purchased a bridal set for my wedding, and it became the centerpiece of my entire ensemble. The attention to detail is remarkable.',
    image: '/varaha-assets/dp1.avif',
    verified: true,
    platform: 'Amazon'
  },
  {
    id: 2,
    name: 'Anjali Reddy',
    location: 'Hyderabad',
    rating: 5,
    text: 'Varaha Jewels perfectly blends traditional artistry with contemporary elegance. Each piece feels like wearing a piece of heritage. Truly exceptional quality.',
    image: '/varaha-assets/dp2.jpeg',
    verified: true,
    platform: 'Flipkart'
  },
  {
    id: 3,
    name: 'Kavita Mehta',
    location: 'Delhi',
    rating: 5,
    text: 'I have been a loyal customer for over a decade. The timeless designs and impeccable service keep me coming back. These are heirlooms I will pass to my daughters.',
    image: '/varaha-assets/dp3.avif',
    verified: true,
    platform: 'Amazon'
  }
];

export default function TestimonialsSection() {
  const [headerRef, headerVisible] = useScrollAnimation();
  const [cardsRef, cardsVisible] = useScrollAnimation();

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          ref={headerRef}
          className={`text-center mb-20 transition-all duration-800 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="w-16 h-px bg-copper mx-auto mb-6"></div>
          <h2 className="font-royal text-5xl md:text-6xl font-bold text-heritage mb-6 tracking-tight">
            Cherished by Thousands
          </h2>
          <p className="font-playfair text-xl text-heritage/70 max-w-2xl mx-auto font-light">
            Hear from our valued patrons about their Varaha Jewels experience
          </p>
        </div>

        {/* Testimonials Grid */}
        <div ref={cardsRef} className="grid md:grid-cols-3 gap-10">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              className={`relative bg-warm-sand border border-copper/30 rounded-sm p-10 hover:border-copper hover:shadow-md transition-all duration-500 ${
                cardsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Quote Icon */}
              <Quote className="absolute top-8 right-8 text-copper/20" size={56} />
              
              <div className="relative z-10">
                {/* Rating */}
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={20} className="fill-copper text-copper" />
                  ))}
                </div>

                {/* Testimonial Text */}
                <p className="font-playfair text-lg text-heritage/80 mb-8 leading-relaxed italic font-light">
                  "{testimonial.text}"
                </p>

                {/* Separator */}
                <div className="w-12 h-px bg-copper/50 mb-8"></div>

                {/* Author Info */}
                <div className="flex items-center gap-4">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-14 h-14 rounded-full border-2 border-copper/40 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/varaha-assets/DP.png';
                    }}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-heritage text-lg">
                      {testimonial.name}
                    </p>
                    <p className="font-sans text-sm text-heritage/60 mb-1">
                      {testimonial.location}
                    </p>
                    {testimonial.verified && (
                      <div className="flex items-center gap-1 text-xs">
                        <CheckCircle size={14} className="text-green-600 fill-green-600" />
                        <span className="text-green-700 font-medium">Verified Purchase</span>
                        <span className="text-heritage/50">•</span>
                        <span className="text-heritage/60">via {testimonial.platform}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className="mt-20 pt-16 border-t border-copper/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 items-center justify-items-center">
            <div className="text-center animate-float" style={{ animationDelay: '0s' }}>
              <div className="w-24 h-24 mx-auto mb-4 bg-copper/10 rounded-full flex items-center justify-center border border-copper/30 hover:bg-copper/15 transition-all duration-300">
                <Star className="text-copper" size={36} />
              </div>
              <p className="font-royal text-3xl font-bold text-copper mb-2">4.9/5</p>
              <p className="font-sans text-sm text-heritage/70">Customer Rating</p>
            </div>
            <div className="text-center animate-float" style={{ animationDelay: '0.5s' }}>
              <div className="w-24 h-24 mx-auto mb-4 bg-copper/10 rounded-full flex items-center justify-center border border-copper/30 hover:bg-copper/15 transition-all duration-300">
                <span className="font-royal text-3xl font-bold text-copper">BIS</span>
              </div>
              <p className="font-sans text-sm text-heritage/70">Hallmark Certified</p>
            </div>
            <div className="text-center animate-float" style={{ animationDelay: '1s' }}>
              <div className="w-24 h-24 mx-auto mb-4 bg-copper/10 rounded-full flex items-center justify-center border border-copper/30 hover:bg-copper/15 transition-all duration-300">
                <span className="font-royal text-3xl font-bold text-copper">✓</span>
              </div>
              <p className="font-sans text-sm text-heritage/70">Lifetime Warranty</p>
            </div>
            <div className="text-center animate-float" style={{ animationDelay: '1.5s' }}>
              <div className="w-24 h-24 mx-auto mb-4 bg-copper/10 rounded-full flex items-center justify-center border border-copper/30 hover:bg-copper/15 transition-all duration-300">
                <span className="font-royal text-3xl font-bold text-copper">30</span>
              </div>
              <p className="font-sans text-sm text-heritage/70">Day Returns</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
