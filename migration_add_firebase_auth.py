"""
Migration: Add Firebase UID column to customers table

Run this migration to add support for Firebase Authentication.
"""

import os
import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from dotenv import load_dotenv

# Load env from backend folder
env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(env_file):
    load_dotenv(dotenv_path=env_file)
else:
    # Try parent folder
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'newvaraha.env')
    load_dotenv(dotenv_path=env_file)

from sqlmodel import Session, text
from database import engine

def migrate():
    """Add firebase_uid and phone columns to customers table"""
    
    with Session(engine) as session:
        # Add firebase_uid column
        try:
            session.exec(text("""
                ALTER TABLE customer 
                ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(255) UNIQUE
            """))
            session.commit()
            print("✅ Added firebase_uid column to customer table")
        except Exception as e:
            print(f"⚠️  firebase_uid column may already exist or error: {e}")
            session.rollback()
        
        # Add phone column
        try:
            session.exec(text("""
                ALTER TABLE customer 
                ADD COLUMN IF NOT EXISTS phone VARCHAR(20)
            """))
            session.commit()
            print("✅ Added phone column to customer table")
        except Exception as e:
            print(f"⚠️  phone column may already exist or error: {e}")
            session.rollback()
        
        # Create index on firebase_uid
        try:
            session.exec(text("""
                CREATE INDEX IF NOT EXISTS ix_customer_firebase_uid 
                ON customer (firebase_uid)
            """))
            session.commit()
            print("✅ Created index on firebase_uid")
        except Exception as e:
            print(f"⚠️  Index may already exist or error: {e}")
            session.rollback()
    
    print("\n🎉 Firebase Auth migration completed!")

if __name__ == "__main__":
    print("🔄 Running Firebase Auth Migration...")
    migrate()
