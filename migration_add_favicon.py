"""Add favicon_url column to storesettings table"""
from database import engine
import sqlalchemy as sa

def run():
    with engine.connect() as connection:
        result = connection.execute(sa.text(
            "SELECT column_name FROM information_schema.columns WHERE table_name='storesettings' AND column_name='favicon_url'"
        ))
        if result.fetchone() is None:
            connection.execute(sa.text(
                "ALTER TABLE storesettings ADD COLUMN favicon_url VARCHAR DEFAULT '/favicon-circle.png'"
            ))
            connection.commit()
            print("✅ Added favicon_url column to storesettings")
        else:
            print("ℹ️ favicon_url already exists in storesettings")

if __name__ == "__main__":
    run()
