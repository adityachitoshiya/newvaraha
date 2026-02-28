"""
Migration to add slug column to the product table and populate it from existing product names.
"""
import os
import sys
import re
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from sqlmodel import create_engine

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Try loading from .env file
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'newvaraha.env')
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, value = line.partition('=')
                    os.environ[key.strip()] = value.strip()
        DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL not set.")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)


def generate_slug(name: str) -> str:
    """Convert product name to URL-friendly slug."""
    name = unicodedata.normalize('NFKD', name)
    name = name.encode('ascii', 'ignore').decode('ascii')
    name = name.lower()
    name = re.sub(r'[^a-z0-9]+', '-', name)
    name = name.strip('-')
    return name


def run_migration():
    print("Running slug migration...")

    with engine.connect() as conn:
        # Step 1: Add slug column if it doesn't exist
        try:
            conn.execute(text('ALTER TABLE product ADD COLUMN slug VARCHAR'))
            conn.commit()
            print("  Added: slug column")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("  Skipped: slug column (already exists)")
            else:
                print(f"  Error adding column: {e}")
                return

        # Step 2: Fetch all products without a slug
        rows = conn.execute(text("SELECT id, name FROM product WHERE slug IS NULL OR slug = ''")).fetchall()
        print(f"  Populating slugs for {len(rows)} products...")

        slug_counts = {}
        for row in rows:
            product_id, name = row[0], row[1]
            base_slug = generate_slug(name)

            # Ensure uniqueness
            slug = base_slug
            count = slug_counts.get(base_slug, 0)
            if count > 0:
                slug = f"{base_slug}-{count}"
            slug_counts[base_slug] = count + 1

            conn.execute(
                text("UPDATE product SET slug = :slug WHERE id = :id"),
                {"slug": slug, "id": product_id}
            )

        conn.commit()
        print(f"  Done! Slugs populated for {len(rows)} products.")

        # Step 3: Add unique index on slug (best-effort)
        try:
            conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_product_slug ON product (slug)"))
            conn.commit()
            print("  Added: unique index on slug")
        except Exception as e:
            print(f"  Note: Could not add unique index (may already exist): {e}")

    print("Slug migration complete!")


if __name__ == "__main__":
    run_migration()
