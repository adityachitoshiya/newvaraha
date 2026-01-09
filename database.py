from sqlmodel import create_engine, SQLModel, Session
import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from backend folder
env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=env_path)

# Default to SQLite for local development
sqlite_file_name = "database.db" # Database is now in the same folder as backend app
if os.getcwd().endswith('backend'):
    sqlite_file_name = "database.db"
else:
    # If running from root, it's inside backend/
    sqlite_file_name = "backend/database.db"

sqlite_url = f"sqlite:///{sqlite_file_name}"

# Check for DATABASE_URL environment variable (used by AWS/Render/Heroku)
database_url = os.getenv("DATABASE_URL", sqlite_url)

# PostgreSQL requires the URL to start with postgresql:// instead of postgres://
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {}

# Only use check_same_thread for SQLite
if "sqlite" in database_url:
    connect_args["check_same_thread"] = False

# Mask password for logging
masked_url = database_url
if ":" in database_url and "@" in database_url:
    # Basic masking logic
    try:
        prefix, rest = database_url.split("://")
        auth, host_port_db = rest.split("@")
        user, _ = auth.split(":")
        masked_url = f"{prefix}://{user}:****@{host_port_db}"
    except:
        pass

print(f"🔌 Database Connection: {masked_url}")

if "sqlite" in database_url:
    print("⚠️  WARNING: Using local SQLite database. Data will NOT be synced to Supabase.")
    connect_args["check_same_thread"] = False
    engine = create_engine(database_url, echo=True, connect_args=connect_args)
else:
    print("✅ Using Remote Database (Supabase/PostgreSQL)")
    # Optimize connection pool for remote DB to prevent timeouts
    engine = create_engine(
        database_url, 
        echo=True, 
        connect_args=connect_args,
        pool_pre_ping=True, 
        pool_recycle=1800,
        pool_size=10, 
        max_overflow=20
    )

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
