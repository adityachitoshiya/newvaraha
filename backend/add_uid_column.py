from database import engine
from sqlalchemy import text

def add_uid_column():
    print("Getting raw connection...")
    try:
        connection = engine.raw_connection()
        connection.set_isolation_level(0) # Autocommit
        cursor = connection.cursor()
        
        print("Executing ALTER TABLE to add supabase_uid...")
        try:
            cursor.execute('ALTER TABLE "customer" ADD COLUMN IF NOT EXISTS supabase_uid VARCHAR;')
            print("Column added.")
        except Exception as e:
            print(f"ALTER TABLE failed: {e}")

        print("Executing CREATE INDEX...")
        try:
            cursor.execute('CREATE INDEX IF NOT EXISTS ix_customer_supabase_uid ON "customer" (supabase_uid);')
            print("Index created.")
        except Exception as e:
             print(f"CREATE INDEX failed: {e}")
             
        cursor.close()
        connection.close()
        print("Schema update process finished.")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    add_uid_column()
