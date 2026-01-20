from database import engine
from models import StoreSettings
from sqlmodel import Session

def read_gstin():
    with Session(engine) as session:
        settings = session.get(StoreSettings, 1)
        if settings:
            print(f"Current GSTIN in DB: {settings.gstin}")
        else:
            print("StoreSettings not found.")

if __name__ == "__main__":
    read_gstin()
