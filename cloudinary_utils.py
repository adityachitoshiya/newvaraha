import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from pathlib import Path

# Load env
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Configure Cloudinary
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

def upload_video_to_cloudinary(file_content, public_id=None):
    """
    Uploads a video to Cloudinary.
    Returns the secure URL of the uploaded video.
    """
    try:
        print(f"Uploading video to Cloudinary (size: {len(file_content)} bytes)...")
        
        # Upload options
        options = {
            "resource_type": "video",
            "folder": "heritage_videos",
        }
        
        if public_id:
            options["public_id"] = public_id

        # Cloudinary accepts file-like objects or paths. 
        # Since we have bytes, we can pass it directly.
        response = cloudinary.uploader.upload(file_content, **options)
        
        print(f"Cloudinary upload success: {response.get('secure_url')}")
        return response.get('secure_url')
        
    except Exception as e:
        print(f"Cloudinary upload failed: {e}")
        return None
