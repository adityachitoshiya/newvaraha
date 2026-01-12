from sqlmodel import SQLModel, create_engine, text
from models import StoreSettings
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env")

engine = create_engine(DATABASE_URL)

def migrate():
    print("🚀 Starting Migration: Add Heritage Video Fields...")
    
    with engine.connect() as connection:
        trans = connection.begin()
        try:
            # Check if columns exist
            # This is a basic check; usually we'd inspect information_schema but 'ALTER TABLE ... ADD COLUMN IF NOT EXISTS' is cleaner in Postgres
            
            print("1️⃣  Adding heritage_video_desktop column...")
            connection.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS heritage_video_desktop TEXT"))
            
            print("2️⃣  Adding heritage_video_mobile column...")
            connection.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS heritage_video_mobile TEXT"))
            
            trans.commit()
            print("✅ Migration Successful!")
        except Exception as e:
            trans.rollback()
            print(f"❌ Migration Failed: {e}")

if __name__ == "__main__":
    migrate()
