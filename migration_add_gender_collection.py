"""
Migration: Add gender and collection columns to product table
For Men's and Women's navigation feature
"""
import os
from dotenv import load_dotenv
from pathlib import Path
from sqlalchemy import create_engine, text

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Add gender and collection columns to product table"""
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not found in environment variables")
        return False
    
    # Create engine
    engine = create_engine(DATABASE_URL, echo=True)
    
    with engine.connect() as conn:
        try:
            # Check if columns already exist
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'product' 
                AND column_name IN ('gender', 'collection')
            """))
            existing_columns = [row[0] for row in result.fetchall()]
            
            # Add gender column if not exists
            if 'gender' not in existing_columns:
                print("🔄 Adding 'gender' column...")
                conn.execute(text("""
                    ALTER TABLE product 
                    ADD COLUMN gender VARCHAR(20) DEFAULT NULL
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_product_gender ON product(gender)
                """))
                print("✅ 'gender' column added successfully")
            else:
                print("ℹ️ 'gender' column already exists")
            
            # Add collection column if not exists
            if 'collection' not in existing_columns:
                print("🔄 Adding 'collection' column...")
                conn.execute(text("""
                    ALTER TABLE product 
                    ADD COLUMN collection VARCHAR(50) DEFAULT NULL
                """))
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS ix_product_collection ON product(collection)
                """))
                print("✅ 'collection' column added successfully")
            else:
                print("ℹ️ 'collection' column already exists")
            
            conn.commit()
            print("\n🎉 Migration completed successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            return False

if __name__ == "__main__":
    print("=" * 50)
    print("Running Migration: Add Gender & Collection Columns")
    print("=" * 50)
    run_migration()
