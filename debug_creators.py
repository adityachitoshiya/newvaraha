from sqlmodel import Session, select, create_engine
from backend.models import CreatorVideo
import os

db_path = "backend/database.db"
if not os.path.exists(db_path):
    db_path = "database/database.db"

sqlite_url = f"sqlite:///{db_path}"
engine = create_engine(sqlite_url)

with Session(engine) as session:
    videos = session.exec(select(CreatorVideo)).all()
    print(f"--- Creator Videos in Database ({len(videos)}) ---")
    for v in videos:
        print(f"ID: {v.id} | Name: {v.name}")
