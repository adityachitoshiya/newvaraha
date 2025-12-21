
from sqlmodel import Session, select
from database import engine
from models import AdminUser
from auth_utils import get_password_hash

def reset_admin():
    with Session(engine) as session:
        user = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        if user:
            user.hashed_password = get_password_hash("password123")
            session.add(user)
            session.commit()
            print("Admin password reset to 'password123'")
        else:
            print("Admin user not found, creating...")
            user = AdminUser(username="admin", hashed_password=get_password_hash("password123"))
            session.add(user)
            session.commit()
            print("Admin user created with 'password123'")

if __name__ == "__main__":
    reset_admin()
