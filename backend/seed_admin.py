from sqlmodel import Session, select
from database import engine
from models import AdminUser
from auth_utils import get_password_hash

def seed_admin():
    with Session(engine) as session:
        existing_admin = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        if not existing_admin:
            print("Creating default admin user...")
            admin = AdminUser(
                username="admin",
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"), # Default password
                role="admin"
            )
            session.add(admin)
            session.commit()
            print("Admin user created: admin / admin123")
        else:
            print("Admin user already exists.")

if __name__ == "__main__":
    seed_admin()
