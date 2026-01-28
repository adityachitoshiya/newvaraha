"""
Database Migration: Add stock column to product table

This script adds the stock column to the product table if it doesn't exist.
Run this script to migrate the Supabase database.
"""

import sys
import os
# Add parent directory to path to import database module
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/..')

from sqlalchemy import text
from database import engine

def run_migration():
    try:
        print("🔄 Starting migration: Adding stock column to product table...")
        
        with engine.connect() as connection:
            # Check if column exists
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='product' AND column_name='stock';
            """)
            
            result = connection.execute(check_query)
            exists = result.fetchone() is not None
            
            if exists:
                print("✅ Stock column already exists. Skipping migration.")
                return True
            
            # Add stock column
            migration_query = text("""
                ALTER TABLE product 
                ADD COLUMN stock INTEGER DEFAULT 0;
            """)
            
            connection.execute(migration_query)
            connection.commit()
            
            print("✅ Migration completed successfully!")
            print("   - Added 'stock' column to 'product' table")
            print("   - Default value: 0")
            
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
