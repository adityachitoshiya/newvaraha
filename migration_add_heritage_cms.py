"""Add secondary_link fields to heroslide and heritage_cards_json to storesettings"""
from database import engine
import sqlalchemy as sa

def run():
    migrations = [
        ("heroslide", "secondary_link_text", "VARCHAR(100) DEFAULT 'Our Heritage'"),
        ("heroslide", "secondary_link_url", "VARCHAR(200) DEFAULT '/heritage'"),
        ("storesettings", "heritage_cards_json", "TEXT DEFAULT '[]'"),
    ]
    
    with engine.connect() as connection:
        for table, column, col_type in migrations:
            result = connection.execute(sa.text(
                f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND column_name='{column}'"
            ))
            if result.fetchone() is None:
                connection.execute(sa.text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
                print(f"✅ Added {column} to {table}")
            else:
                print(f"ℹ️ {column} already exists in {table}")
        connection.commit()

if __name__ == "__main__":
    run()
