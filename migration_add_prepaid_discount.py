"""
Migration Script: Add Prepaid Discount Columns to store_settings
Created: 2026-01-29
"""

from sqlalchemy import text
from database import engine

def run_migration():
    print("🔄 Starting migration: Add prepaid discount columns...")
    
    with engine.connect() as conn:
        # Check if columns already exist
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='storesettings' 
            AND column_name IN ('prepaid_discount_enabled', 'prepaid_discount_percent')
        """)
        
        result = conn.execute(check_query)
        existing_columns = [row[0] for row in result]
        
        # Add columns if they don't exist
        if 'prepaid_discount_enabled' not in existing_columns:
            print("   Adding column: prepaid_discount_enabled...")
            conn.execute(text("""
                ALTER TABLE storesettings 
                ADD COLUMN prepaid_discount_enabled BOOLEAN DEFAULT TRUE
            """))
            conn.commit()
            print("   ✓ Column prepaid_discount_enabled added")
        else:
            print("   ⏭️  Column prepaid_discount_enabled already exists")
        
        if 'prepaid_discount_percent' not in existing_columns:
            print("   Adding column: prepaid_discount_percent...")
            conn.execute(text("""
                ALTER TABLE storesettings 
                ADD COLUMN prepaid_discount_percent INTEGER DEFAULT 5
            """))
            conn.commit()
            print("   ✓ Column prepaid_discount_percent added")
        else:
            print("   ⏭️  Column prepaid_discount_percent already exists")
    
    print("✅ Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
