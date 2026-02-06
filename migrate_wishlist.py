from sqlmodel import SQLModel, create_engine, Session, text
from models import Wishlist
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = "sqlite:///./varaha.db"
engine = create_engine(DATABASE_URL)

def create_wishlist_table():
    print("Creating Wishlist table...")
    SQLModel.metadata.create_all(engine)
    print("Wishlist table created successfully!")

    # Verify
    with Session(engine) as session:
        result = session.exec(text("SELECT name FROM sqlite_master WHERE type='table' AND name='wishlist';"))
        table = result.first()
        if table:
            print("Verified: Table 'wishlist' exists.")
        else:
            print("Error: Table 'wishlist' was not found.")

if __name__ == "__main__":
    create_wishlist_table()
