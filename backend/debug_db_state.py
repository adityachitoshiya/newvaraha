from sqlmodel import Session, select, text
from database import engine, create_db_and_tables
from models import AdminUser, Customer

def check_db():
    try:
        # 1. Try to create tables if they don't exist (safety check)
        print("Checking/Creating tables...")
        create_db_and_tables()
        print("Tables checked.")

        with Session(engine) as session:
            # 2. Check Admin Users
            admins = session.exec(select(AdminUser)).all()
            print(f"Admin Users Found: {len(admins)}")
            for admin in admins:
                print(f" - Admin: {admin.username} (Email: {admin.email})")

            # 3. Check Customers
            customers = session.exec(select(Customer)).all()
            print(f"Customers Found: {len(customers)}")
            for cust in customers:
                print(f" - Customer: {cust.email} (Provider: {cust.provider})")

    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    check_db()
