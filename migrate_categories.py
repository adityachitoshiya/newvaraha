#!/usr/bin/env python3
"""
Database Migration: Add Category table
"""

from dotenv import load_dotenv
from pathlib import Path
import os
from sqlmodel import Session, create_engine, SQLModel
from models import Category

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def create_category_table():
    """Create Category table in database"""
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        return
    
    # Fix for SQLAlchemy
    db_url = DATABASE_URL
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    engine = create_engine(db_url)
    
    try:
        # Create all tables (will only create if not exists)
        SQLModel.metadata.create_all(engine)
        print("✅ Category table created successfully!")
        
        #  Add some default categories
        with Session(engine) as session:
            # Check if categories already exist
            from sqlmodel import select
            existing = session.exec(select(Category)).first()
            
            if not existing:
                print("\n🌱 Seeding default categories...")
                default_categories = [
                    Category(name="Artificial", display_name="Artificial", gender=None, sort_order=1, is_active=True),
                    Category(name="Bridal", display_name="Bridal", gender="Women", sort_order=2, is_active=True),
                    Category(name="Heritage", display_name="Heritage Collection", gender=None, sort_order=3, is_active=True),
                    Category(name="Gold", display_name="Gold Jewellery", gender=None, sort_order=4, is_active=True),
                    Category(name="Diamond", display_name="Diamond", gender=None, sort_order=5, is_active=True),
                    Category(name="Necklace", display_name="Necklace", gender=None, sort_order=6, is_active=True),
                    Category(name="Earrings", display_name="Earrings", gender="Women", sort_order=7, is_active=True),
                    Category(name="Ring", display_name="Ring", gender=None, sort_order=8, is_active=True),
                    Category(name="Bangles", display_name="Bangles / Bracelets", gender="Women", sort_order=9, is_active=True),
                    Category(name="Men", display_name="Men's Jewellery", gender="Men", sort_order=10, is_active=True),
                ]
                
                for cat in default_categories:
                    session.add(cat)
                
                session.commit()
                print(f"✅ Added {len(default_categories)} default categories")
            else:
                print("ℹ️ Categories already exist, skipping seed")
                
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔄 Creating Category table and seeding data...")
    create_category_table()
    print("\n✅ Done!")
