"""
Migration to add ciplx video columns to StoreSettings table.
Run with: python backend/migration_add_ciplx_columns.py
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
    print("Adding ciplx video columns to storesettings table...")
    
    with engine.connect() as conn:
        # Add ciplx_video_desktop column
        try:
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN ciplx_video_desktop TEXT"))
            print("  Added: ciplx_video_desktop")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Skipped: ciplx_video_desktop (already exists)")
            else:
                print(f"  Error: {e}")
        
        # Add ciplx_video_mobile column
        try:
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN ciplx_video_mobile TEXT"))
            print("  Added: ciplx_video_mobile")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Skipped: ciplx_video_mobile (already exists)")
            else:
                print(f"  Error: {e}")
        
        conn.commit()
    
    print("\nMigration complete!")

if __name__ == "__main__":
    migrate()
