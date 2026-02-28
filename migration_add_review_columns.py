"""
Migration to add review-related columns to the product table.
Adds: average_rating, total_reviews, rating_distribution
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
    print("Adding review columns to product table...")

    columns = [
        ("average_rating", "FLOAT"),
        ("total_reviews", "INTEGER DEFAULT 0"),
        ("rating_distribution", "TEXT DEFAULT '{}'"),
    ]

    with engine.connect() as conn:
        for col_name, col_def in columns:
            try:
                conn.execute(text(f'ALTER TABLE product ADD COLUMN {col_name} {col_def}'))
                print(f"  Added: {col_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Skipped: {col_name} (already exists)")
                else:
                    print(f"  Error adding {col_name}: {e}")
        conn.commit()

    print("Review columns migration complete!")


if __name__ == "__main__":
    run_migration()
