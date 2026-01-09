import sys
import os
from fastapi.testclient import TestClient

# Add backend to path
sys.path.append(os.getcwd())

try:
    from main import app
except ImportError:
    print("Could not import app. Fixing path...")
    sys.exit(1)

client = TestClient(app)

def test_track_visit():
    print("\n🔍 Testing track-visit API...")
    
    payload = {"path": "/test-page"}
    
    resp = client.post("/api/track-visit", json=payload)
    if resp.status_code == 200:
        print("✅ Track Visit Success")
        print(resp.json())
    else:
        print(f"❌ Failed: {resp.text}")

if __name__ == "__main__":
    test_track_visit()
