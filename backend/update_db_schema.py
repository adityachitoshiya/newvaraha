import sqlite3

def add_columns():
    conn = sqlite3.connect('../database/database.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE storesettings ADD COLUMN show_full_page_countdown BOOLEAN DEFAULT 1")
        print("Added show_full_page_countdown")
    except Exception as e:
        print(f"show_full_page_countdown might already exist or error: {e}")

    try:
        cursor.execute("ALTER TABLE product ADD COLUMN additional_images TEXT DEFAULT '[]'")
        print("Added additional_images")
    except Exception as e:
        print(f"additional_images might already exist or error: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
