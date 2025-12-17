# Deployment Guide for Varaha Jewels

This guide covers how to deploy the Varaha Jewels application, consisting of a **Next.js Frontend** (Vercel) and a **FastAPI Backend** (Render/Railway).

## 1. Prerequisites

- **GitHub Repository**: Ensure your code is pushed to a GitHub repository.
- **Vercel Account**: For deploying the frontend.
- **Render or Railway Account**: For deploying the backend (and database if not using SQLite in production).

---

## 2. Backend Deployment (Render.com)

We will deploy the backend as a **Web Service**.

1.  **Create a New Web Service**:
    - Connect your GitHub repository.
    - **Root Directory**: `backend` (Important! This tells Render to look in the backend folder).
    - **Runtime**: Python 3.
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`

2.  **Environment Variables**:
    Add the following environment variables in the Render dashboard:
    - `PYTHON_VERSION`: `3.9.0` (or your preferred version)
    - `DATABASE_URL`: If using PostgreSQL (Recommended for production), add your connection string here.
      - *Note: If sticking with SQLite for simplicity (not recommended for persistent production data on serverless), it will reset on redeploys. For a real "live" site, use a hosted PostgreSQL (e.g., Supabase or Render's PostgreSQL).*
    - `RAZORPAY_KEY_ID`: Your Razorpay Key ID.
    - `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.
    - `ADMIN_SECRET`: A secure secret for admin authentication.

3.  **Deploy**: Click "Create Web Service". Wait for the build to finish.
    - **Copy the Backend URL** (e.g., `https://varaha-backend.onrender.com`). You will need this for the frontend.

---

## 3. Frontend Deployment (Vercel)

1.  **Import Project**:
    - Go to Vercel Dashboard -> Add New -> Project.
    - Select your GitHub repository.

2.  **Configure Project**:
    - **Framework Preset**: Next.js
    - **Root Directory**: `frontend` (Important! Click "Edit" next to Root Directory and select `frontend`).

3.  **Environment Variables**:
    - Expand the "Environment Variables" section.
    - Add `NEXT_PUBLIC_API_URL`.
    - **Value**: The Backend URL you copied from Render (e.g., `https://varaha-backend.onrender.com`).
      - *Note: Do not add a trailing slash.*

4.  **Deploy**: Click "Deploy".

---

## 4. Post-Deployment Verification

1.  **Visit your Vercel URL** (e.g., `https://varaha-jewels.vercel.app`).
2.  **Check API Connection**:
    - Open the browser console (F12).
    - Look for "API URL configured:" logs (if debug logging is on) or network requests.
    - Verify that products load on the homepage.
    - Try logging into the Admin panel (`/admin/login`).

## 5. Troubleshooting

-   **CORS Errors**: If you see CORS errors in the browser console, you may need to update the allowed origins in `backend/main.py`.
    - Currently, it allows all origins (`allow_origins=["*"]`), which is fine for initial testing but should be restricted to your Vercel domain in production.
-   **Database Issues**: If data disappears after redeploying the backend, it's because you are using SQLite on a transient file system. Switch to a managed PostgreSQL database and update `backend/database.py` and the `DATABASE_URL` env var.
