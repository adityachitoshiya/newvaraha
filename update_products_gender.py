#!/usr/bin/env python3
"""
Update product gender based on name:
- Products with 'trishul' in name -> Men
- All other products -> Women
"""

from dotenv import load_dotenv
from pathlib import Path
import os
from sqlmodel import Session, create_engine, select
from models import Product

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def update_product_genders():
    """Update gender field for all products"""
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment")
        return
    
    engine = create_engine(DATABASE_URL)
    
    with Session(engine) as session:
        try:
            # Get all products
            statement = select(Product)
            products = session.exec(statement).all()
            
            men_count = 0
            women_count = 0
            
            for product in products:
                # Check if name contains 'trishul'
                if 'trishul' in product.name.lower():
                    product.gender = 'Men'
                    men_count += 1
                else:
                    product.gender = 'Women'
                    women_count += 1
                
                session.add(product)
            
            session.commit()
            
            print(f"✅ Updated {men_count} products with 'trishul' to Men category")
            print(f"✅ Updated {women_count} products to Women category")
            
            # Verify the update
            statement = select(Product)
            all_products = session.exec(statement).all()
            
            gender_counts = {}
            for p in all_products:
                gender = p.gender or 'NULL'
                gender_counts[gender] = gender_counts.get(gender, 0) + 1
            
            print("\n📊 Final gender distribution:")
            for gender, count in gender_counts.items():
                print(f"   {gender}: {count} products")
                
        except Exception as e:
            print(f"❌ Error: {e}")
            session.rollback()

if __name__ == "__main__":
    print("🔄 Updating product genders...")
    update_product_genders()
    print("\n✅ Done!")
