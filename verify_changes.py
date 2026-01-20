from routes.orders import calculate_tax_breakdown
from main import app

def test_tax():
    print("Testing Tax Logic...")
    
    # Test 1: Rajasthan (Intra)
    res = calculate_tax_breakdown(1030, "Rajasthan")
    print(f"Rajasthan (1030): {res}")
    assert res['taxable_value'] == 1000.0
    assert res['cgst_amount'] == 15.0
    assert res['sgst_amount'] == 15.0
    assert res['igst_amount'] == 0.0

    # Test 2: Mumbai (Inter)
    res = calculate_tax_breakdown(1030, "Maharashtra")
    print(f"Maharashtra (1030): {res}")
    assert res['taxable_value'] == 1000.0
    assert res['igst_amount'] == 30.0
    assert res['cgst_amount'] == 0.0

    # Test 3: Standard 1000
    # Taxable = 1000/1.03 = 970.87
    # GST = 29.13
    res = calculate_tax_breakdown(1000, "Delhi")
    print(f"Delhi (1000): {res}")
    assert res['igst_amount'] == 29.13

    print("✅ Tax Logic Verified")

def test_app_load():
    print("Testing App Import...")
    assert app is not None
    print("✅ App Loaded Successfully")

if __name__ == "__main__":
    test_tax()
    test_app_load()
