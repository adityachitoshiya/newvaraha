from sqlmodel import Session, select, create_engine
from models import StoreSettings

engine = create_engine("sqlite:///database.db")

def check_settings():
    with Session(engine) as session:
        try:
            settings = session.get(StoreSettings, 1)
            print(f"Settings found: {settings}")
            if settings:
                print(f"Countdown: {settings.show_full_page_countdown}")
                print(f"Maintenance: {settings.is_maintenance_mode}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_settings()
