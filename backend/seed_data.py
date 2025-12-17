import json
import os
from dotenv import load_dotenv

load_dotenv()

from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import Product, AdminUser, PaymentGateway, Customer
from passlib.context import CryptContext

def seed_data():
    with Session(engine) as session:
        # 1. Seed Products
        existing_products = session.exec(select(Product)).first()
        if not existing_products:
            json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data/collections.json")
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    data = json.load(f)
                
                print(f"Seeding {len(data)} products...")
                for item in data:
                    stones_str = json.dumps(item.get("stones", []))
                    product = Product(
                        id=item["id"],
                        name=item["name"],
                        image=item["image"],
                        metal=item["metal"],
                        carat=item["carat"],
                        stones=stones_str,
                        polish=item.get("polish"),
                        price=item["price"],
                        premium=item.get("premium", False),
                        tag=item.get("tag"),
                        category=item["category"],
                        style=item["style"],
                        description=item["description"]
                    )
                    session.add(product)
        
        # 2. Seed Admin
        pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
        admin = session.exec(select(AdminUser).where(AdminUser.username == "admin")).first()
        if not admin:
            print("Creating default admin user...")
            admin_user = AdminUser(
                username="admin", 
                hashed_password=pwd_context.hash("admin123")
            )
            session.add(admin_user)
            
        # 3. Seed Default Gateways (New Logic)
        existing_gateways = session.exec(select(PaymentGateway)).first()
        if not existing_gateways:
            print("Initializing default payment gateways...")
            
            defaults = [
                {
                    "name": "Razorpay Default",
                    "provider": "razorpay",
                    "is_active": True,
                    "credentials": {"key_id": "", "key_secret": ""}
                },
                {
                    "name": "PhonePe Default",
                    "provider": "phonepe",
                    "is_active": False,
                    "credentials": {"merchant_id": "", "salt_key": "", "salt_index": "1"}
                },
                {
                    "name": "Pine Labs Default",
                    "provider": "pinelabs",
                    "is_active": False,
                    "credentials": {"merchant_id": "", "api_key": ""}
                }
            ]
            
            for g in defaults:
                gateway = PaymentGateway(
                    name=g["name"],
                    provider=g["provider"],
                    is_active=g["is_active"],
                    credentials_json=json.dumps(g["credentials"])
                )
                session.add(gateway)

        session.commit()
        print("Seeding logic complete!")

if __name__ == "__main__":
    create_db_and_tables()
    seed_data()
