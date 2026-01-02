import { formatCurrency } from '../lib/productData';

export default function RecommendedProducts({ products, title = "You Might Also Like" }) {
  return (
    <div className="py-12 border-t">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">{title}</h2>
      
      {/* Horizontal Scroll on Mobile, Grid on Desktop */}
      <div className="flex space-x-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:gap-6 lg:space-x-0 lg:overflow-visible scrollbar-hide">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-64 lg:w-auto bg-white border rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group"
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={product.imageUrl}
                alt={product.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 truncate mb-2">{product.title}</h3>
              <p className="text-xl font-bold text-copper mb-3">{formatCurrency(product.price)}</p>
              <button className="w-full py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition">
                Quick Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
