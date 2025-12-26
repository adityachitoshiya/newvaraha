
from sqlmodel import Session, select
from database import engine
from models import AdminUser
from auth_utils import get_password_hash

def check_admin():
    with Session(engine) as session:
        statement = select(AdminUser)
        results = session.exec(statement).all()
        
        print(f"Found {len(results)} admin users:")
        if results:
            for user in results:
                print(f"- Username: {user.username}")
                # Reset password to ensure access
                print(f"  Resetting password for {user.username} to 'admin123'")
                user.hashed_password = get_password_hash("admin123")
                session.add(user)
            session.commit()
            print("Password reset successful.")
        else:
            print("No admin user found. Creating default admin...")
            admin = AdminUser(
                username="admin",
                hashed_password=get_password_hash("admin123")
            )
            session.add(admin)
            session.commit()
            print("Created default admin: username='admin', password='admin123'")

if __name__ == "__main__":
    check_admin()
