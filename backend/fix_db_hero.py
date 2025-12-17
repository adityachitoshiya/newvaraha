import sqlite3
import os

# Path to database
# Path to database - prioritize the one used by app
db_path = "database/database.db"
if not os.path.exists(db_path):
    db_path = "backend/database.db"

print(f"Connecting to database at: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column_if_not_exists(table, column, col_type):
    try:
        cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN {column} {col_type}")
        print(f"Added column {column} to {table}")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print(f"Column {column} already exists in {table}")
        else:
            print(f"Error adding {column}: {e}")

# Add mobile_image to heroslide
add_column_if_not_exists("heroslide", "mobile_image", "TEXT")

conn.commit()
conn.close()
print("Database schema update for HeroSlide complete.")
