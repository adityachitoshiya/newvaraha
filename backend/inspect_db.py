from sqlmodel import create_engine, text, inspect
import os
from dotenv import load_dotenv

# Load env manually
load_dotenv()

database_url = os.getenv("DATABASE_URL")
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

print(f"Connecting to: {database_url.split('@')[-1]}")

try:
    engine = create_engine(database_url)
    inspector = inspect(engine)
    
    tables = inspector.get_table_names()
    print("\n--- Available Tables ---")
    for table in tables:
        print(f"- {table}")
        
    # Sample data from 'product' if it exists, else first table
    target_table = "product" if "product" in tables else (tables[0] if tables else None)
    
    if target_table:
        print(f"\n--- Sample Data from '{target_table}' ---")
        with engine.connect() as connection:
            result = connection.execute(text(f"SELECT * FROM {target_table} LIMIT 5"))
            columns = result.keys()
            print(f"Columns: {', '.join(columns)}")
            for row in result:
                print(row)
    else:
        print("\nNo tables found to sample data from.")

except Exception as e:
    print(f"Error: {e}")
