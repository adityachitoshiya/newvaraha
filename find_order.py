import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv(os.path.join('backend', '.env'))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found")
    sys.exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # Search for the user in Customer table first to get ID
        result = conn.execute(text("SELECT * FROM \"order\" WHERE email = 'fakese4551@arugy.com' ORDER BY created_at DESC LIMIT 1"))
        order = result.fetchone()
        
        if order:
            print(f"FOUND_ORDER_ID: {order.id}")
            print(f"Order Details: {order}")
        else:
            print("No order found for fakese4551@arugy.com")
            
except Exception as e:
    print(f"Error: {e}")
