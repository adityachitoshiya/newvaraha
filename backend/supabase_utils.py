from supabase import create_client, Client
import os
from fastapi import UploadFile
import time 

# Initialize Supabase Client within the function to ensure env vars are loaded


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

def upload_file_to_supabase(file: UploadFile, bucket: str = None):
    """
    Uploads a file to Supabase Storage.
    Automatically selects bucket 'video' or 'image' based on content type if bucket is not provided.
    Returns the public URL.
    """
    try:
        supabase = init_supabase()
        if not supabase:
            return None

        # Determine bucket if not provided
        if not bucket:
            content_type = file.content_type
            if content_type and "video" in content_type:
                bucket = "VIDEO"
            else:
                # Default to image for images and others, or check explicitly
                bucket = "IMAGE"

        # Generate unique path
        timestamp = int(time.time())
        # Safe filename
        filename = file.filename.replace(" ", "_").replace("(", "").replace(")", "")
        file_path = f"{timestamp}_{filename}"
        
        # Read file
        file_content = file.file.read()
        
        # Reset cursor just in case
        file.file.seek(0)
        
        # Upload
        print(f"Uploading to bucket: {bucket}")
        response = supabase.storage.from_(bucket).upload(
            file=file_content,
            path=file_path,
            file_options={"content-type": file.content_type}
        )
        
        # Get Public URL
        public_url = supabase.storage.from_(bucket).get_public_url(file_path)
        
        return public_url
    except Exception as e:
        print(f"Supabase Upload Error: {e}")
        log_path = "/Users/adityachitoshiya/Desktop/untitled folder/varahaJewels-main/backend/debug_error.log"
        try:
            with open(log_path, "a") as f:
                f.write(f"SUPABASE UILS ERROR: {str(e)}\n")
        except:
            pass
        return None
