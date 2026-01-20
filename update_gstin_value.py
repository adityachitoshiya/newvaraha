from database import get_session, engine
from models import StoreSettings
from sqlmodel import Session, select

def update_gstin():
    with Session(engine) as session:
        settings = session.get(StoreSettings, 1)
        if settings:
            print(f"Old GSTIN: {settings.gstin}")
            settings.gstin = "08CBRPC0024J1ZT"
            session.add(settings)
            session.commit()
            print(f"New GSTIN: {settings.gstin}")
        else:
            print("StoreSettings not found, creating...")
            new_settings = StoreSettings(gstin="08CBRPC0024J1ZT")
            session.add(new_settings)
            session.commit()
            print("Created with GSTIN.")

if __name__ == "__main__":
    update_gstin()
