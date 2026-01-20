"""
Migration script to create blockedregion table and seed Indian states.
Run with: python backend/migration_add_blocked_regions.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlmodel import SQLModel, create_engine, Session, select
from models import BlockedRegion

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://"))

# All Indian States and UTs with ISO 3166-2:IN codes
INDIAN_REGIONS = [
    {"region_code": "AN", "region_name": "Andaman and Nicobar Islands"},
    {"region_code": "AP", "region_name": "Andhra Pradesh"},
    {"region_code": "AR", "region_name": "Arunachal Pradesh"},
    {"region_code": "AS", "region_name": "Assam"},
    {"region_code": "BR", "region_name": "Bihar"},
    {"region_code": "CH", "region_name": "Chandigarh"},
    {"region_code": "CT", "region_name": "Chhattisgarh"},
    {"region_code": "DD", "region_name": "Daman and Diu"},
    {"region_code": "DL", "region_name": "Delhi"},
    {"region_code": "GA", "region_name": "Goa"},
    {"region_code": "GJ", "region_name": "Gujarat", "is_blocked": True},  # Pre-blocked
    {"region_code": "HP", "region_name": "Himachal Pradesh"},
    {"region_code": "HR", "region_name": "Haryana"},
    {"region_code": "JH", "region_name": "Jharkhand"},
    {"region_code": "JK", "region_name": "Jammu and Kashmir"},
    {"region_code": "KA", "region_name": "Karnataka"},
    {"region_code": "KL", "region_name": "Kerala"},
    {"region_code": "LA", "region_name": "Ladakh"},
    {"region_code": "LD", "region_name": "Lakshadweep"},
    {"region_code": "MH", "region_name": "Maharashtra"},
    {"region_code": "ML", "region_name": "Meghalaya"},
    {"region_code": "MN", "region_name": "Manipur"},
    {"region_code": "MP", "region_name": "Madhya Pradesh"},
    {"region_code": "MZ", "region_name": "Mizoram"},
    {"region_code": "NL", "region_name": "Nagaland"},
    {"region_code": "OR", "region_name": "Odisha"},
    {"region_code": "PB", "region_name": "Punjab"},
    {"region_code": "PY", "region_name": "Puducherry"},
    {"region_code": "RJ", "region_name": "Rajasthan"},
    {"region_code": "SK", "region_name": "Sikkim"},
    {"region_code": "TN", "region_name": "Tamil Nadu"},
    {"region_code": "TS", "region_name": "Telangana"},
    {"region_code": "TR", "region_name": "Tripura"},
    {"region_code": "UK", "region_name": "Uttarakhand"},
    {"region_code": "UP", "region_name": "Uttar Pradesh"},
    {"region_code": "WB", "region_name": "West Bengal"},
]

def migrate():
    print("Creating blockedregion table...")
    SQLModel.metadata.create_all(engine, tables=[BlockedRegion.__table__])
    print("Table created.")

    print("Seeding Indian states...")
    with Session(engine) as session:
        for region in INDIAN_REGIONS:
            existing = session.exec(select(BlockedRegion).where(BlockedRegion.region_code == region["region_code"])).first()
            if not existing:
                session.add(BlockedRegion(
                    region_code=region["region_code"],
                    region_name=region["region_name"],
                    is_blocked=region.get("is_blocked", False)
                ))
                print(f"  Added: {region['region_code']} - {region['region_name']}")
            else:
                print(f"  Skipped: {region['region_code']}")
        session.commit()
    
    print("\\nMigration complete!")

if __name__ == "__main__":
    migrate()
