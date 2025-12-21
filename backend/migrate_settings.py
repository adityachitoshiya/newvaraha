
from sqlmodel import SQLModel
from database import engine
from models import SystemSetting

def migrate_settings():
    print("Creating SystemSetting table...")
    SQLModel.metadata.create_all(engine)
    print("Table created.")

if __name__ == "__main__":
    migrate_settings()
