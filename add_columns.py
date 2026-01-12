from database import engine
from sqlmodel import text

def add_columns():
    with engine.connect() as conn:
        try:
            print("Attempting to add heritage_video_desktop column...")
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS heritage_video_desktop TEXT;"))
            print("Added heritage_video_desktop.")
        except Exception as e:
            print(f"Error adding heritage_video_desktop: {e}")

        try:
            print("Attempting to add heritage_video_mobile column...")
            conn.execute(text("ALTER TABLE storesettings ADD COLUMN IF NOT EXISTS heritage_video_mobile TEXT;"))
            print("Added heritage_video_mobile.")
        except Exception as e:
            print(f"Error adding heritage_video_mobile: {e}")
            
        conn.commit()
        print("Schema update complete.")

if __name__ == "__main__":
    add_columns()
