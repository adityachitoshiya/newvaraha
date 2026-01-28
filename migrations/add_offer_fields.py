"""
Database Migration: Add dynamic offer fields to storesettings table
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')

from sqlalchemy import text
from database import engine

def run_migration():
    try:
        print("🔄 Starting migration: Adding offer fields to storesettings...")
        
        migrations = [
            ("mega_deal_enabled", "BOOLEAN DEFAULT TRUE"),
            ("mega_deal_discount_percent", "INTEGER DEFAULT 10"),
            ("mega_deal_label", "VARCHAR(50) DEFAULT 'MEGA DEAL'"),
            ("bank_offers_json", "TEXT DEFAULT '[]'"),
        ]
        
        with engine.connect() as connection:
            for column_name, column_type in migrations:
                # Check if column exists
                check_query = text(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='storesettings' AND column_name='{column_name}';
                """)
                
                result = connection.execute(check_query)
                exists = result.fetchone() is not None
                
                if exists:
                    print(f"  ⏭️  Column '{column_name}' already exists")
                    continue
                
                # Add column
                migration_query = text(f"""
                    ALTER TABLE storesettings 
                    ADD COLUMN {column_name} {column_type};
                """)
                
                connection.execute(migration_query)
                print(f"  ✅ Added column: {column_name}")
            
            connection.commit()
            
        print("✅ Migration completed successfully!")
        return True
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
