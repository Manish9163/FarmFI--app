import os
from config import Config

ALLOWED_EXTENSIONS = Config.ALLOWED_EXTENSIONS

def allowed_file(filename: str) -> bool:
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
    )

def sanitize_filename(filename: str) -> str:
    return os.path.basename(filename).replace(' ', '_')
