import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import create_engine, text

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Add missing columns to product and wishlist tables"""
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    # Fix for SQLAlchemy (Postgres requires postgresql://)
    db_url = DATABASE_URL
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    
    # Create engine
    engine = create_engine(db_url, echo=True)
    
    with engine.connect() as conn:
        try:
            print("🔄 Checking Database Schema...")
            
            # 1. Check Product Table
            print("--- Checking Product Table ---")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'product' 
            """))
            product_columns = [row[0] for row in result.fetchall()]
            
            columns_to_add = {
                'gender': 'VARCHAR(20)',
                'collection': 'VARCHAR(50)',
                'product_type': 'VARCHAR(50)',
                'colour': 'VARCHAR(50)'
            }
            
            for col, type_ in columns_to_add.items():
                if col not in product_columns:
                    print(f"🔄 Adding '{col}' column to product...")
                    conn.execute(text(f"ALTER TABLE product ADD COLUMN {col} {type_} DEFAULT NULL"))
                    if col != 'colour': # Index for filtered fields
                        conn.execute(text(f"CREATE INDEX IF NOT EXISTS ix_product_{col} ON product({col})"))
                    print(f"✅ '{col}' column added.")
                else:
                    print(f"ℹ️ '{col}' column already exists.")

            # 2. Check Wishlist Table
            print("--- Checking Wishlist Table ---")
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'wishlist' 
            """))
            wishlist_columns = [row[0] for row in result.fetchall()]
            
            if 'customer_id' not in wishlist_columns:
                print("⚠️ 'customer_id' column missing in wishlist. Adding it...")
                conn.execute(text("ALTER TABLE wishlist ADD COLUMN customer_id INTEGER"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_wishlist_customer_id ON wishlist(customer_id)"))
                print("✅ 'customer_id' column added.")
            else:
                print("ℹ️ 'customer_id' column already exists in wishlist.")
                
            # 3. Check Order Table for tracking_data (just in case)
            print("--- Checking Order Table ---")
            result = conn.execute(text("""
                 SELECT column_name 
                 FROM information_schema.columns 
                 WHERE table_name = 'order' 
             """))
            order_columns = [row[0] for row in result.fetchall()]
             
            if 'tracking_data' not in order_columns:
                 print("⚠️ 'tracking_data' column missing in order. Adding it...")
                 conn.execute(text("ALTER TABLE \"order\" ADD COLUMN tracking_data TEXT DEFAULT NULL")) # Order is keyword
                 print("✅ 'tracking_data' column added.")
            else:
                 print("ℹ️ 'tracking_data' column already exists in order.")

            conn.commit()
            print("\n🎉 Migration completed successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    print("=" * 50)
    print("Running Critical DB Fixes")
    print("=" * 50)
    run_migration()
