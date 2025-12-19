from database import engine
from sqlalchemy import text

def fix():
    print("Getting raw connection...")
    try:
        connection = engine.raw_connection()
        # Set isolation level to AUTOCOMMIT (0)
        connection.set_isolation_level(0)
        cursor = connection.cursor()
        
        print("Executing ALTER TABLE to add user_id...")
        try:
            cursor.execute('ALTER TABLE "order" ADD COLUMN IF NOT EXISTS user_id UUID;')
            print("Column added (or already existed).")
        except Exception as e:
            print(f"ALTER TABLE failed: {e}")

        print("Executing CREATE INDEX...")
        try:
            cursor.execute('CREATE INDEX IF NOT EXISTS ix_order_user_id ON "order" (user_id);')
            print("Index created.")
        except Exception as e:
             print(f"CREATE INDEX failed: {e}")
             
        cursor.close()
        connection.close()
        print("Schema update process finished.")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    fix()
