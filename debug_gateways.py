from sqlmodel import Session, select, create_engine
from backend.models import PaymentGateway
import os
import json
import razorpay

db_path = "backend/database.db"
if not os.path.exists(db_path):
    db_path = "database/database.db"

sqlite_url = f"sqlite:///{db_path}"
engine = create_engine(sqlite_url)

with Session(engine) as session:
    gateways = session.exec(select(PaymentGateway)).all()
    print(f"--- Payment Gateways ({len(gateways)}) ---")
    
    for g in gateways:
        if g.is_active:
            print(f"Active Gateway: {g.name}")
            try:
                creds = json.loads(g.credentials_json)
                key_id = creds.get("key_id", "")
                key_secret = creds.get("key_secret", "")
                
                print(f"Key ID Length: {len(key_id)}")
                print(f"Key Secret Length: {len(key_secret)}")
                print(f"Key ID Prefix: {key_id[:9]}...") 
                print(f"Key Secret Prefix: {key_secret[:4]}...")
                
                # Check for whitespace
                if key_id.strip() != key_id or key_secret.strip() != key_secret:
                    print("WARNING: Keys contain leading/trailing whitespace!")
                
                if "rzp_" not in key_id:
                    print("WARNING: Key ID does not start with 'rzp_'. Is this a Razorpay key?")
                    
            except Exception as e:
                print(f"Error parsing credentials: {e}")
