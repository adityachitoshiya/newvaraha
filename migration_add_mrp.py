"""
Migration to add mrp (Maximum Retail Price) column to the product table.
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


def run_migration():
    print("Adding mrp column to product table...")

    with engine.connect() as conn:
        try:
            conn.execute(text('ALTER TABLE product ADD COLUMN mrp FLOAT'))
            print("  Added: mrp")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Skipped: mrp (already exists)")
            else:
                print(f"  Error: {e}")
        conn.commit()

    print("MRP column migration complete!")


if __name__ == "__main__":
    run_migration()
