from database import engine
from sqlalchemy import text

def fix_schema():
    print("Attempting to add user_id column to 'order' table...")
    try:
        with engine.begin() as conn:
            # Add user_id column
            conn.execute(text('ALTER TABLE "order" ADD COLUMN IF NOT EXISTS user_id UUID;'))
            # Add index
            conn.execute(text('CREATE INDEX IF NOT EXISTS ix_order_user_id ON "order" (user_id);'))
        print("Schema updated successfully.")
    except Exception as e:
        print(f"Error updating schema: {e}")

if __name__ == "__main__":
    fix_schema()
