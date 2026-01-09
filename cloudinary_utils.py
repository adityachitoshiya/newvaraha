import cloudinary
import cloudinary.uploader
import os

def init_cloudinary():
    cloudinary.config( 
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
        api_key = os.getenv("CLOUDINARY_API_KEY"), 
        api_secret = os.getenv("CLOUDINARY_API_SECRET"),
        secure = True
    )

def upload_media(file_obj, folder="varaha-cms"):
    """
    Uploads a file object (from FastAPI UploadFile) to Cloudinary.
    Returns the secure URL.
    """
    try:
        # init just in case it wasn't called (though app startup should call it)
        init_cloudinary()
        
        response = cloudinary.uploader.upload(
            file_obj.file,
            folder=folder,
            resource_type="auto" # Auto detect image/video
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        return None
