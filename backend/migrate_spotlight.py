"""
Migration script to add spotlight_source column to StoreSettings table
"""
from database import get_session
from sqlmodel import Session, text

def migrate():
    session = next(get_session())
    
    try:
        # Check if column exists (PostgreSQL)
        result = session.exec(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='storesettings' AND column_name='spotlight_source'
        """)).fetchall()
        
        if len(result) == 0:
            print("Adding spotlight_source column to storesettings table...")
            session.exec(text("ALTER TABLE storesettings ADD COLUMN spotlight_source VARCHAR DEFAULT 'featured'"))
            session.commit()
            print("✓ Migration completed successfully!")
        else:
            print("✓ Column spotlight_source already exists, skipping migration")
            
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    migrate()
