// Mock Product Data
export const PRODUCT_DATA = {
  id: "prod_001",
  title: "Premium Modern Necklace",
  subtitle: "Handcrafted elegance for every occasion",
  price: 2499,
  compareAt: 2999,
  description: "This stunning premium modern necklace is meticulously handcrafted with the finest materials. Featuring a minimalist design that complements any outfit, it's perfect for both casual and formal occasions. The adjustable chain ensures a perfect fit, while the hypoallergenic materials guarantee comfort for all-day wear.",
  images: [
    { id: 'img1', type: 'image', url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop', alt: 'Premium necklace front view' },
    { id: 'img2', type: 'image', url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343a?w=800&h=800&fit=crop', alt: 'Necklace detail close-up' },
    { id: 'img3', type: 'video', url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', alt: 'Product video', poster: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=800&fit=crop' },
    { id: 'img4', type: 'image', url: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop', alt: 'Model wearing necklace' },
  ],
  videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  variants: [
    { id: "v1", title: "One Size", color: "Silver", size: "One Size", inStock: true, stock: 50, price: 2499, compareAt: 2999, sku: "NCL-SLV-001", imageId: 'img1' }
  ],
  keyFeatures: [
    "Premium 925 Sterling Silver",
    "Hypoallergenic & Nickel-Free",
    "Adjustable 16-18 inch Chain",
    "Handcrafted with Precision",
    "Comes with Elegant Gift Box"
  ],
  tags: ["jewelry", "silver", "necklace", "premium"],
  reviews: [
    { 
      id: "r1", 
      name: "Aditi Sharma", 
      rating: 5, 
      title: "Absolutely Beautiful!",
      text: "The craftsmanship is amazing! Looks even better in person. Perfect for daily wear and special occasions.", 
      date: "2025-01-01" 
    },
    { 
      id: "r2", 
      name: "Priya Patel", 
      rating: 5, 
      title: "Worth Every Penny",
      text: "Great quality and the packaging was so elegant. Makes a perfect gift too!", 
      date: "2024-12-28" 
    },
    { 
      id: "r3", 
      name: "Neha Gupta", 
      rating: 4, 
      title: "Very Nice Quality",
      text: "Beautiful necklace, slightly smaller than expected but still lovely.", 
      date: "2024-12-20" 
    }
  ],
  averageRating: 4.7,
  reviewCount: 158,
  recommendations: [
    { id: 201, title: 'Elegant Bracelet', price: 1899, imageUrl: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400&h=400&fit=crop', alt: 'Matching bracelet' },
    { id: 202, title: 'Pearl Earrings', price: 1599, imageUrl: 'https://images.unsplash.com/photo-1535556116002-6281ff3e9f38?w=400&h=400&fit=crop', alt: 'Pearl earrings' },
    { id: 203, title: 'Diamond Ring', price: 4999, imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=400&fit=crop', alt: 'Diamond ring' },
  ]
};

export const formatCurrency = (amount) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};
