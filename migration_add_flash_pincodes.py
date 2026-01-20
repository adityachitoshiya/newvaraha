"""
Migration script to create flashpincode table and seed initial data.
Run with: python backend/migration_add_flash_pincodes.py
"""
import os
import sys

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel, create_engine, Session, select
from models import FlashPincode

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set. Please set it in your environment.")
    sys.exit(1)

engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://"))

# Initial PIN codes for Jaipur Flash Delivery
INITIAL_PINCODES = [
    {"pincode": "302001", "area_name": "M.I. Road, C-Scheme, Jaipur GPO"},
    {"pincode": "302015", "area_name": "Bajaj Nagar, Gandhi Nagar, Tonk Road"},
    {"pincode": "302018", "area_name": "Durgapura, Tonk Road"},
    {"pincode": "302016", "area_name": "Bani Park, Shastri Nagar, Collectorate"},
    {"pincode": "302029", "area_name": "Sanganer Airport, Sanganer"},
    {"pincode": "302020", "area_name": "Mansarovar"},
    {"pincode": "302021", "area_name": "Vaishali Nagar, Hanuman Nagar"},
    {"pincode": "302039", "area_name": "Amba Bari, Vidhyadhar Nagar"},
    {"pincode": "302012", "area_name": "Jhotwara, Khatipura"},
    {"pincode": "302004", "area_name": "Jawahar Nagar, Raja Park, Janta Colony"},
    {"pincode": "302003", "area_name": "Jaipur City, Ramganj Bazar"},
    {"pincode": "302017", "area_name": "Jagatpura, Malviya Nagar"},
    {"pincode": "302002", "area_name": "Amer Road, Govind Nagar"},
]

def migrate():
    print("Creating flashpincode table...")
    SQLModel.metadata.create_all(engine, tables=[FlashPincode.__table__])
    print("Table created (or already exists).")

    print("Seeding initial PIN codes...")
    with Session(engine) as session:
        for pin_data in INITIAL_PINCODES:
            existing = session.exec(select(FlashPincode).where(FlashPincode.pincode == pin_data["pincode"])).first()
            if not existing:
                session.add(FlashPincode(**pin_data))
                print(f"  Added: {pin_data['pincode']} - {pin_data['area_name']}")
            else:
                print(f"  Skipped (exists): {pin_data['pincode']}")
        session.commit()
    
    print("\\nMigration complete!")

if __name__ == "__main__":
    migrate()
