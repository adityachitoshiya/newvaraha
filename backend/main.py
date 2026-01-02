from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables

# Import Routers
from routes import auth, products, orders, cart, gateways, admin, settings, customer, coupons, analytics

app = FastAPI(
    title="Varaha Jewels API",
    description="Backend API for Varaha Jewels E-commerce Platform",
    version="1.0.0"
)

origins = [
    "*", # Allow all for local network access
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

@app.get("/")
def read_root():
    return {"message": "Welcome to Varaha Jewels Backend"}

# Include Routers
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
