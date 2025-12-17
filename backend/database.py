from sqlmodel import create_engine, SQLModel, Session
import os
from dotenv import load_dotenv
from pathlib import Path

# Explicitly load .env from project root
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Default to SQLite for local development
sqlite_file_name = "database/database.db" # Adjusted path relative to project root or absolute if running from root
if os.getcwd().endswith('backend'):
    sqlite_file_name = "../database/database.db"

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

engine = create_engine(database_url, echo=True, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
