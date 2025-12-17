import { useState } from 'react';
import { Star } from 'lucide-react';

export default function ReviewsSection({ reviews, averageRating, reviewCount }) {
  const [visibleCount, setVisibleCount] = useState(3);

  const StarRating = ({ rating }) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    return (
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={16} className="text-yellow-400 fill-yellow-400" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={16} className="text-gray-300" />
        ))}
      </div>
    );
  };

  return (
    <div className="py-12 border-t">
      <div className="mb-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">Customer Reviews</h2>
        <div className="flex items-center space-x-4">
          <div className="text-5xl font-bold text-copper">{averageRating.toFixed(1)}</div>
          <div>
            <div className="flex mb-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={i < Math.floor(averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <p className="text-sm text-gray-600">Based on {reviewCount} reviews</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-6">
        {reviews.slice(0, visibleCount).map((review) => (
          <div key={review.id} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{review.name}</h3>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">{review.date}</span>
                </div>
                <StarRating rating={review.rating} />
              </div>
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
            <p className="text-gray-700 leading-relaxed">{review.text}</p>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {visibleCount < reviews.length && (
        <button
          onClick={() => setVisibleCount(prev => prev + 5)}
          className="mt-8 w-full py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition"
        >
          Load More Reviews ({reviews.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
