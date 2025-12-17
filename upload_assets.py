import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
import os

# Load environment variables from backend/.env
load_dotenv("backend/.env")

# Init Cloudinary
cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
    api_key = os.getenv("CLOUDINARY_API_KEY"), 
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure = True
)

# Files to upload
files_to_upload = [
    "frontend/public/varaha-assets/h1.jpg",
    "frontend/public/varaha-assets/h2.jpg",
    "frontend/public/varaha-assets/h3.jpg"
]

print("--- Uploading Hero Assets ---")
for file_path in files_to_upload:
    if os.path.exists(file_path):
        file_name = os.path.basename(file_path)
        print(f"Uploading {file_name}...")
        try:
            response = cloudinary.uploader.upload(
                file_path,
                folder="varaha-cms",
                resource_type="image",
                public_id=f"hero_{file_name.split('.')[0]}" # e.g. hero_h1
            )
            print(f"✅ URL: {response.get('secure_url')}")
        except Exception as e:
            print(f"❌ Error uploading {file_name}: {e}")
    else:
        print(f"⚠️ File not found: {file_path}")
