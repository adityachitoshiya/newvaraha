"""
Migration to add tracking_data column to orders table.
Run with: python backend/migration_add_tracking_data.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlmodel import create_engine

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://"))

def migrate():
    print("Adding tracking_data column to order table...")
    
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE \"order\" ADD COLUMN tracking_data TEXT"))
            print("  Added: tracking_data")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Skipped: tracking_data (already exists)")
            else:
                print(f"  Error: {e}")
        
        conn.commit()
    
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
