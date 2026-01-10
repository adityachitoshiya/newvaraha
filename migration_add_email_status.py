from sqlmodel import Session, text
from database import engine

def migrate():
    print("Starting migration: Adding email_status column to order table...")
    with Session(engine) as session:
        try:
            # Check if column exists, if not add it
            # This SQL is compatible with PostgreSQL and SQLite
            # Note: "order" is a reserved word in SQL, checking how SQLModel names it. 
            # SQLModel uses the class name lowercase by default -> "order".
            # In Postgres "order" must be quoted as "order" or public.order.
            
            # Step 1: Add the column
            session.exec(text('ALTER TABLE "order" ADD COLUMN email_status VARCHAR DEFAULT \'pending\''))
            session.commit()
            print("Successfully added email_status column.")
        except Exception as e:
            print(f"Migration failed (Column might already exist): {e}")

if __name__ == "__main__":
    migrate()
