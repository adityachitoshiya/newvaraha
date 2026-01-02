# Varaha Jewels 💎

A premium e-commerce platform for traditional Indian jewelry, built with modern web technologies.

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| **Frontend** | [https://newvaraha-nwbd.vercel.app](https://newvaraha-nwbd.vercel.app) |
| **Backend API** | [https://newvaraha.onrender.com](https://newvaraha.onrender.com) |
| **API Docs** | [https://newvaraha.onrender.com/docs](https://newvaraha.onrender.com/docs) |

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State Management**: React Context API
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLModel
- **Database**: PostgreSQL (Supabase)
- **Storage**: Supabase Storage (Images & Videos)
- **Deployment**: Render

### Database & Storage
- **Database**: Supabase PostgreSQL
- **File Storage**: Supabase Storage Buckets (IMAGE, VIDEO)
- **Authentication**: Custom JWT-based auth

## ✨ Features

### Customer Features
- 🛒 Shopping cart with persistent storage
- ❤️ Wishlist functionality
- 🔍 Product search & filtering
- 📦 Order tracking
- 💳 Secure checkout with Razorpay
- 📱 Fully responsive design
- 🎡 Spin wheel discounts
- 📍 Pincode-based delivery estimation

### Admin Dashboard
- 📊 Analytics & insights
- 📝 Product management (CRUD)
- 🖼️ Hero slide management
- 🎬 Creator video management
- 📦 Order management
- ⚙️ Store settings
- 💰 Metal rates management
- 📧 Email notifications

### E-commerce Features
- Product categories & collections
- Product reviews & ratings
- Stock management
- Coupon codes
- Order status tracking
- Email notifications (order confirmation, shipping)
- RapidShyp shipping integration

## 📁 Project Structure

```
varahaJewels-main/
├── frontend/              # Next.js frontend
│   ├── components/        # React components
│   ├── pages/            # Next.js pages
│   ├── lib/              # Utilities & config
│   ├── context/          # React contexts
│   └── public/           # Static assets
├── backend/              # FastAPI backend
│   ├── main.py           # Main API routes
│   ├── models.py         # SQLModel database models
│   ├── routes/           # Route modules
│   ├── supabase_utils.py # Storage utilities
│   └── notifications.py  # Email utilities
└── database/             # Database migrations
```

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- Python 3.10+
- Supabase account

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Environment Variables

#### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Backend (.env)
```
DATABASE_URL=your_supabase_database_url
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
RESEND_API_KEY=your_resend_api_key
```

## 📊 API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create product
- `GET /api/products/{id}` - Get product details
- `PUT /api/products/{id}` - Update product
- `DELETE /api/products/{id}` - Delete product

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}/status` - Update order status

### Content Management
- `GET /api/content/hero` - Get hero slides
- `POST /api/content/hero` - Create hero slide
- `GET /api/content/creators` - Get creator videos
- `POST /api/content/creators` - Add creator video

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/analytics` - Dashboard analytics

## 🔄 Last Updated

**Date**: 29 December 2025

**Recent Changes**:
- ✅ Hero slide upload functionality fixed
- ✅ Firebase removed, migrated to Supabase-only
- ✅ Product card dual image hover effect added
- ✅ Debug logging added for file uploads
- ✅ Database schema updated with rating columns

## 👨‍💻 Author

**Aditya Chitoshiya**

## 📄 License

This project is proprietary software. All rights reserved.
