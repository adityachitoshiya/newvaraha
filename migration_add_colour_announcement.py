"""
Migration: Add colour to product table, announcement_bar_json to storesettings
Date: 2026-02-12
"""
from sqlalchemy import text
from database import engine

def run_migration():
    with engine.connect() as conn:
        # Add colour column to product table
        try:
            conn.execute(text("ALTER TABLE product ADD COLUMN IF NOT EXISTS colour TEXT"))
            print("✅ Added 'colour' column to product table")
        except Exception as e:
            print(f"⚠️ colour column: {e}")

        # Add announcement_bar_json column to storesettings table
        try:
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS announcement_bar_json TEXT DEFAULT '[]'"))
            print("✅ Added 'announcement_bar_json' column to storesettings table")
        except Exception as e:
            print(f"⚠️ announcement_bar_json column: {e}")

        conn.commit()

if __name__ == "__main__":
    run_migration()
