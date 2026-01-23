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


from io import BytesIO
from PIL import Image

def upload_image_to_cloudinary(file_content, folder="returns"):
    """
    Uploads an image to Cloudinary after compressing to WebP.
    Returns the secure URL of the uploaded image.
    """
    try:
        # Compress to WebP first
        img = Image.open(BytesIO(file_content))
        
        # Convert mode if needed
        if img.mode in ('RGBA', 'LA', 'P'):
            if img.mode == 'P':
                img = img.convert('RGBA')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (max 1920px)
        width, height = img.size
        max_size = 1920
        if width > max_size or height > max_size:
            ratio = min(max_size / width, max_size / height)
            new_size = (int(width * ratio), int(height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Convert to WebP
        output = BytesIO()
        if img.mode == 'RGBA':
            img.save(output, format='WEBP', quality=85, lossless=False)
        else:
            img.save(output, format='WEBP', quality=85)
        
        compressed_content = output.getvalue()
        
        print(f"Image compressed: {len(file_content)} bytes -> {len(compressed_content)} bytes (WebP)")
        print(f"Uploading WebP image to Cloudinary (size: {len(compressed_content)} bytes)...")
        
        # Upload options with WebP format
        options = {
            "resource_type": "image",
            "folder": folder,
            "format": "webp",  # Force WebP format
            "transformation": [
                {"quality": "auto:good", "fetch_format": "webp"}
            ]
        }
        
        response = cloudinary.uploader.upload(compressed_content, **options)
        
        print(f"Cloudinary image upload success: {response.get('secure_url')}")
        return response.get('secure_url')
        
    except Exception as e:
        print(f"Cloudinary image upload failed: {e}")
        import traceback
        print(traceback.format_exc())
        return None

