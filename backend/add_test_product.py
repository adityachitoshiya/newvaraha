from sqlmodel import Session, select
from database import engine
from models import Product

def create_verification_product():
    # Connect to AWS (via .env)
    with Session(engine) as session:
        # Check if already exists
        statement = select(Product).where(Product.name == "AWS Connection Verified")
        results = session.exec(statement).first()
        
        if not results:
            print("Creating Verification Product...")
            test_product = Product(
                id="AWS-TEST-001",
                name="AWS Connection Verified",
                image="https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg",
                metal="Gold",
                carat="24k",
                stones="[]",
                polish="Shiny",
                price=1,
                category="Verify",
                style="Modern",
                description="This product proves you are connected to the AWS Database!"
            )
            session.add(test_product)
            session.commit()
            print("Verification Product Created!")
        else:
            print("Verification Product already exists.")

if __name__ == "__main__":
    create_verification_product()
