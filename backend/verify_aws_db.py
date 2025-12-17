from sqlmodel import create_engine, text
import os
from dotenv import load_dotenv

# Load env manually to be sure
load_dotenv()

database_url = os.getenv("DATABASE_URL")
print(f"Testing connection to: {database_url.split('@')[-1]}") # Hide link credentials

try:
    engine = create_engine(database_url)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT version()"))
        print("Connection Successful!")
        print(f"Database Version: {result.fetchone()[0]}")
except Exception as e:
    print(f"Connection Failed: {e}")
