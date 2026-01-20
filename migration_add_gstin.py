from database import engine
from sqlmodel import text

def migrate():
    with engine.connect() as conn:
        try:
            print("Adding column 'gstin' to 'storesettings'...")
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS gstin TEXT DEFAULT '08TESTGSTIN1234';"))
            print("Column 'gstin' added.")
        except Exception as e:
            print(f"Error adding column: {e}")
        
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
