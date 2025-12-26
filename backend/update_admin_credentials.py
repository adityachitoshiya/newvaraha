
from sqlmodel import Session, select
from database import engine
from models import AdminUser
from auth_utils import get_password_hash

def update_admin_credentials():
    with Session(engine) as session:
        # Find the existing admin user (we know it was 'admin')
        statement = select(AdminUser).where(AdminUser.username == "admin")
        results = session.exec(statement).all()
        
        if not results:
            print("User 'admin' not found. Checking if 'aditya' already exists...")
            statement_check = select(AdminUser).where(AdminUser.username == "aditya")
            results_check = session.exec(statement_check).all()
            if results_check:
                print("User 'aditya' already exists. Updating password only.")
                user = results_check[0]
            else:
                print("No admin user found. Creating new admin 'aditya'...")
                user = AdminUser(
                    username="aditya",
                    hashed_password=get_password_hash("chitoshiya")
                )
                session.add(user)
                session.commit()
                print("Created admin: aditya / chitoshiya")
                return
        else:
            user = results[0]

        # Update credentials
        print(f"Updating credentials for user ID {user.id}...")
        user.username = "aditya"
        user.hashed_password = get_password_hash("chitoshiya")
        
        session.add(user)
        session.commit()
        session.refresh(user)
        print(f"Successfully updated admin credentials for '{user.username}'")

if __name__ == "__main__":
    update_admin_credentials()
