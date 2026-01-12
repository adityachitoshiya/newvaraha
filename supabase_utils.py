from supabase import create_client, Client
import os
from fastapi import UploadFile
import time
from io import BytesIO
from PIL import Image

from dotenv import load_dotenv
from pathlib import Path

# Load env from root directory (one level up from backend/)
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

def init_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    if not url or not key:
        print("Error: Supabase credentials missing")
        return None
    return create_client(url, key)

def compress_image_to_webp(file_content: bytes, content_type: str, max_size: int = 1920, quality: int = 85) -> tuple:
    """
    Compresses an image and converts it to WebP format.
    Returns (compressed_content, new_filename_extension, new_content_type)
    """
    try:
        # Check if it's an image
        if not content_type or "image" not in content_type:
            return file_content, None, content_type
        
        # Skip if already WebP (but still compress)
        img = Image.open(BytesIO(file_content))
        
        # Convert to RGB if necessary (for PNG with transparency, convert to RGBA first)
        if img.mode in ('RGBA', 'LA', 'P'):
            # For images with transparency, use RGBA
            if img.mode == 'P':
                img = img.convert('RGBA')
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (maintain aspect ratio)
        width, height = img.size
        if width > max_size or height > max_size:
            ratio = min(max_size / width, max_size / height)
            new_size = (int(width * ratio), int(height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Save as WebP
        output = BytesIO()
        if img.mode == 'RGBA':
            img.save(output, format='WEBP', quality=quality, lossless=False)
        else:
            img.save(output, format='WEBP', quality=quality)
        
        compressed_content = output.getvalue()
        
        print(f"Image compressed: {len(file_content)} bytes -> {len(compressed_content)} bytes (WebP)")
        
        return compressed_content, '.webp', 'image/webp'
    except Exception as e:
        print(f"Image compression error: {e}")
        # Return original if compression fails
        return file_content, None, content_type

# Video compression removed


def upload_file_to_supabase(file: UploadFile, bucket: str = None):
    """
    Uploads a file to Supabase Storage.
    Images compressed to WebP.
    Videos compressed if > 10MB.
    """
    try:
        supabase = init_supabase()
        if not supabase:
            print("Supabase client initialization failed")
            return None

        # Read file content
        file_content = file.file.read()
        file.file.seek(0)
        
        if not file_content:
            print("File content is empty")
            return None
            
        file_size_mb = len(file_content) / (1024 * 1024)
        print(f"File read success: {file_size_mb:.2f} MB")
        
        content_type = file.content_type
        original_filename = file.filename.replace(" ", "_").replace("(", "").replace(")", "")
        
        # Determine bucket if not provided
        if not bucket:
            if content_type and "video" in content_type:
                bucket = "VIDEO"
            else:
                bucket = "IMAGE"

        # Compress Image (Video compression removed as per user request)
        if bucket == "IMAGE" and content_type and "image" in content_type:
            file_content, new_ext, content_type = compress_image_to_webp(file_content, content_type)
            if new_ext:
                base_name = os.path.splitext(original_filename)[0]
                original_filename = base_name + new_ext
                
        # Generate unique path
        timestamp = int(time.time())
        file_path = f"{timestamp}_{original_filename}"
        
        # Upload
        print(f"Uploading to bucket: {bucket}, file: {file_path}, size: {len(file_content)} bytes")
        response = supabase.storage.from_(bucket).upload(
            file=file_content,
            path=file_path,
            file_options={"content-type": content_type}
        )
        print(f"Upload response: {response}")
        
        # Get Public URL
        public_url = supabase.storage.from_(bucket).get_public_url(file_path)
        print(f"Public URL: {public_url}")
        
        return public_url
    except Exception as e:
        import traceback
        print(f"Supabase Upload Error: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        return None

