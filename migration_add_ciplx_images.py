from sqlmodel import Session, create_engine, text
from database import engine

def migrate():
    with Session(engine) as session:
        print("Migrating: Adding ciplx_images_json to storesettings...")
        try:
            # Check if column exists
            session.exec(text("SELECT ciplx_images_json FROM storesettings LIMIT 1"))
            print("Column 'ciplx_images_json' already exists.")
        except Exception:
            session.rollback() # Fix transaction state
            # Add column
            print("Adding column 'ciplx_images_json'...")
            session.exec(text("ALTER TABLE storesettings ADD COLUMN ciplx_images_json TEXT DEFAULT '[]'"))
            session.commit()
            print("Column added successfully.")

if __name__ == "__main__":
    migrate()
