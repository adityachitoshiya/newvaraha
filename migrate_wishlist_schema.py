import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import create_engine, text

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Ensure Wishlist table has customer_id"""
    
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
            print("🔄 Checking Wishlist table schema...")
            
            # Check for customer_id column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'wishlist' 
                AND column_name = 'customer_id'
            """))
            has_customer_id = result.fetchone()
            
            # Check for user_id column
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'wishlist' 
                AND column_name = 'user_id'
            """))
            has_user_id = result.fetchone()
            
            if not has_customer_id:
                print("⚠️ 'customer_id' column missing. Adding it...")
                conn.execute(text("""
                    ALTER TABLE wishlist 
                    ADD COLUMN customer_id INTEGER
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_wishlist_customer_id ON wishlist(customer_id)
                """))
                print("✅ 'customer_id' column added.")
                
                # Migrate data if user_id exists? 
                # Assuming user_id might store customer ID if they were integers. 
                # risky without verifying data types.
                # If user_id is UUID and customer_id is INT, we can't simple migrate.
                # For now, just ensuring column exists is enough for code to not crash.
            else:
                print("✅ 'customer_id' column already exists.")

            if has_user_id:
                 print("ℹ️ Note: 'user_id' column exists (legacy). You might want to remove it later.")

            conn.commit()
            print("\n🎉 Wishlist Schema Check Completed!")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    print("=" * 50)
    run_migration()
    print("=" * 50)
