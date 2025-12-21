
from sqlmodel import text, Session
from database import engine

def migrate():
    with Session(engine) as session:
        print("Migrating Order table...")
        try:
            session.exec(text('ALTER TABLE "order" ADD COLUMN label_url TEXT'))
            print("Added label_url to Order")
        except Exception as e:
            print(f"Error adding label_url: {e}")
            session.rollback()
            
        try:
            session.exec(text('ALTER TABLE "order" ADD COLUMN manifest_url TEXT'))
            print("Added manifest_url to Order")
        except Exception as e:
            print(f"Error adding manifest_url: {e}")
            session.rollback()

        print("Migrating OrderReturn table...")
        try:
            session.exec(text('ALTER TABLE orderreturn ADD COLUMN shipment_id TEXT'))
            print("Added shipment_id to OrderReturn")
        except Exception as e:
            print(f"Error adding shipment_id: {e}")
            session.rollback()
            
        try:
            session.exec(text('ALTER TABLE orderreturn ADD COLUMN label_url TEXT'))
            print("Added label_url to OrderReturn")
        except Exception as e:
            print(f"Error adding label_url: {e}")
            session.rollback()

        session.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
