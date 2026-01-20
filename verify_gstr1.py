from routes.reports import get_gstr1_json
from database import get_session
from models import Order, StoreSettings
from datetime import datetime
import json

# Mock Session
class MockSession:
    def exec(self, query):
        return self
    
    def all(self):
        # Mock Orders
        return [
            Order(
                order_id="ORD1",
                created_at=datetime.strptime("2025-12-15", "%Y-%m-%d"),
                state="Rajasthan", # INTRA
                taxable_value=1000.0,
                cgst_amount=15.0,
                sgst_amount=15.0,
                igst_amount=0.0
            ),
            Order(
                order_id="ORD2",
                created_at=datetime.strptime("2025-12-16", "%Y-%m-%d"),
                state="Maharashtra", # INTER
                taxable_value=1000.0,
                cgst_amount=0.0,
                sgst_amount=0.0,
                igst_amount=30.0
            )
        ]

    def get(self, model, id):
        if model == StoreSettings:
            return StoreSettings(gstin="08MOCKGSTIN")
        return None

def test_gstr1():
    print("Testing GSTR1 JSON Generation...")
    
    # Mock Admin
    class MockAdmin:
        id = 1
        
    session = MockSession()
    
    try:
        json_out = get_gstr1_json(
            start_date="2025-12-01",
            end_date="2025-12-31",
            session=session,
            current_user=MockAdmin()
        )
        
        print("Generated JSON:")
        print(json.dumps(json_out, indent=2))
        
        # Verify Keys
        assert "gstin" in json_out
        assert "fp" in json_out
        assert "b2cs" in json_out
        assert "hsn" in json_out
        
        # Verify B2CS
        b2cs = json_out["b2cs"]
        assert len(b2cs) >= 2
        
        # Verify INTRA (Rajasthan - 08)
        intra = next((x for x in b2cs if x["pos"] == "08"), None)
        assert intra is not None
        assert intra["sply_ty"] == "INTRA"
        assert intra["txval"] == 1000.0

        # Verify INTER (Maharashtra - 27)
        inter = next((x for x in b2cs if x["pos"] == "27"), None)
        assert inter is not None
        assert inter["sply_ty"] == "INTER"
        assert inter["iamt"] == 30.0
        
        # Verify HSN
        hsn = json_out["hsn"]["hsn_b2c"]
        assert len(hsn) > 0
        total_tx = sum(x["txval"] for x in hsn)
        assert total_tx == 2000.0
        
        print("✅ GSTR1 JSON Verified Successfully")
        
    except Exception as e:
        print(f"❌ Test Failed: {e}")
        raise e

if __name__ == "__main__":
    test_gstr1()
