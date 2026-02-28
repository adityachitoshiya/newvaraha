"""Add is_mega_deal column to product table"""
from sqlmodel import SQLModel
from database import engine
import sqlalchemy as sa

def run():
    with engine.connect() as connection:
        # Check if column exists
        result = connection.execute(sa.text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='product' AND column_name='is_mega_deal'"
        ))
        if result.fetchone() is None:
            connection.execute(sa.text("ALTER TABLE product ADD COLUMN is_mega_deal BOOLEAN DEFAULT FALSE"))
            connection.commit()
            print("✅ Added is_mega_deal column to product table")
        else:
            print("ℹ️ is_mega_deal column already exists")

if __name__ == "__main__":
    run()
