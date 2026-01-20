from database import engine
from sqlmodel import text

def migrate():
    with engine.connect() as conn:
        # List of columns to check and add
        columns = {
            "state": "TEXT",
            "hsn_code": "TEXT DEFAULT '7117'",
            "taxable_value": "DOUBLE PRECISION DEFAULT 0.0",
            "cgst_amount": "DOUBLE PRECISION DEFAULT 0.0",
            "sgst_amount": "DOUBLE PRECISION DEFAULT 0.0",
            "igst_amount": "DOUBLE PRECISION DEFAULT 0.0"
        }
        
        for col_name, col_type in columns.items():
            try:
                print(f"Adding column '{col_name}'...")
                conn.execute(text(f"ALTER TABLE \"order\" ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                print(f"Column '{col_name}' added (or already exists).")
            except Exception as e:
                print(f"Error adding column {col_name}: {e}")
        
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
