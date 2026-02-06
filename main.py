from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables

from middleware import MonitoringMiddleware
# Import Routers
from routes import auth, customer, products, cart, orders, gateways, admin, settings, coupons, analytics, health, dashboard, notifications, reports, tracking, otp, web, categories, wishlist

import logging
from monitoring import monitor

# Custom Log Handler
class DashboardHandler(logging.Handler):
    def emit(self, record):
        log_entry = self.format(record)
        monitor.log_message("BACKEND", record.levelname, log_entry)

# Config Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()
logger.addHandler(DashboardHandler())

app = FastAPI(
    title="Varaha Jewels API",
    description="Backend API for Varaha Jewels E-commerce Platform",
    version="1.0.0",
    docs_url=None,    
    redoc_url=None,   
    openapi_url=None  
)

origins = [
    # Development
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    
    # Production
    "https://varahajewels.in",
    "https://www.varahajewels.in",
    "https://backend.varahajewels.in",
    "https://newvaraha.onrender.com",
    "https://newvaraha-nwbd.vercel.app",
    "https://varahajewels-versel.vercel.app", # Just in case
]

app.add_middleware(MonitoringMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(.*\.)?varahajewels\.in", # Allow naked domain and subdomains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    
    # Run Migrations
    try:
        from migration_add_gender_collection import run_migration as run_gender_migration
        from migrate_categories import create_category_table
        
        print("🚀 Running Startup Migrations...")
        run_gender_migration()
        create_category_table()
        print("✅ Startup Migrations Completed")
    except Exception as e:
        logger.error(f"Startup Migration Failed: {e}")

# Include Routers
# Web Router handles "/" and docs login
app.include_router(web.router, tags=["Web"]) 

app.include_router(auth.router, tags=["Authentication"])
app.include_router(customer.router, tags=["Customer"])
app.include_router(products.router, tags=["Products"])
app.include_router(cart.router, tags=["Cart"])
app.include_router(orders.router, tags=["Orders"])
app.include_router(gateways.router, tags=["Payment Gateways"])
app.include_router(admin.router, tags=["Admin"])
app.include_router(settings.router, tags=["Settings"])
app.include_router(coupons.router, tags=["Coupons"])
app.include_router(analytics.router, tags=["Analytics"])
app.include_router(health.router, tags=["Health"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(notifications.router, tags=["Notifications"])
app.include_router(reports.router, tags=["Reports"])
app.include_router(tracking.router, tags=["Tracking"])
app.include_router(otp.router, tags=["OTP"])
app.include_router(categories.router, tags=["Categories"])
app.include_router(wishlist.router, tags=["Wishlist"])
