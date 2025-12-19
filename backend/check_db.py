from database import engine
from sqlalchemy import text, inspect

def check_column():
    inspector = inspect(engine)
    columns = [c['name'] for c in inspector.get_columns('order')]
    if 'user_id' in columns:
        print("Column 'user_id' EXISTS in 'order' table.")
    else:
        print("Column 'user_id' MISSING in 'order' table.")

if __name__ == "__main__":
    check_column()
