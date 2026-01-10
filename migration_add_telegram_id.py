from sqlmodel import Session, text
from database import engine

def migrate():
    print("Starting migration: Adding telegram_id column to customer table...")
    with Session(engine) as session:
        try:
            # Step 1: Add telegram_id
            print("Adding telegram_id...")
            session.exec(text('ALTER TABLE customer ADD COLUMN telegram_id VARCHAR'))
            session.commit()
            print("Successfully added telegram_id column.")
        except Exception as e:
            print(f"Migration (telegram_id) failed (might exist): {e}")
            session.rollback()

        try:
            # Step 2: Add supabase_uid (Just in case, as it was in the query too)
            print("Checking/Adding supabase_uid...")
            session.exec(text('ALTER TABLE customer ADD COLUMN supabase_uid VARCHAR'))
            session.commit()
            print("Successfully added supabase_uid column.")
        except Exception as e:
             # Likely exists, which is fine
            print(f"Migration (supabase_uid) note: {e}")
            session.rollback()

if __name__ == "__main__":
    migrate()
