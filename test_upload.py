import requests
import os

# Create a dummy image file
dummy_file = "test_image.txt"
with open(dummy_file, "w") as f:
    f.write("This is a test file for Cloudinary upload")

url = "http://localhost:8000/api/upload"
print(f"Testing Upload to {url}...")

try:
    with open(dummy_file, "rb") as f:
        files = {"file": (dummy_file, f, "text/plain")}
        response = requests.post(url, files=files)
        
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200 and "cloudinary" in response.text:
        print("✅ SUCCESS: File uploaded to Cloudinary!")
    else:
        print("❌ FAILURE: Verify logs.")

except Exception as e:
    print(f"ERROR: {e}")

# Cleanup
if os.path.exists(dummy_file):
    os.remove(dummy_file)
