from dotenv import load_dotenv
from PIL import Image, ImageOps

# A small, highly compressed upload can decode to a huge image (the 10 MB cap doesn't stop that).
# Pillow warns above this and refuses above twice this: 60 MP, ~180 MB decoded; phone photos are up to ~50 MP.
Image.MAX_IMAGE_PIXELS = 30_000_000
import io
import os

from supabase import create_client, Client

load_dotenv()

# The one Supabase client: Storage and deleting Auth accounts. The database itself goes through psycopg2 (db_manager.py).
# A secret key (sb_secret_...): it bypasses RLS, so it stays on the server.
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set in the environment or .env file "
                     "(SUPABASE_SECRET_KEY replaced SUPABASE_KEY and SUPABASE_RLS_KEY, which held the same key).")

try:
    SUPABASE_CLIENT: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")
    raise

def upload_image(filename, image: bytes, bucket: str = "images"):
    file_path = f"public/{filename}.jpg"

    try:
        SUPABASE_CLIENT.storage.from_(bucket).upload(
            path=file_path,
            file=image,
            file_options={"content-type": "image/jpeg"}
        )

        return get_image_url(file_path, bucket)

    except Exception as e:
        print(f"Errore upload Supabase: {e}")
        return None

def download_image(image_id: str, bucket: str = "images") -> bytes | None:
    file_path = f"public/{image_id}.jpg"

    try:
        return SUPABASE_CLIENT.storage.from_(bucket).download(file_path)

    except Exception as e:
        print(f"Errore upload Supabase: {e}")
        return None


def get_image_url(image_id: str, bucket: str = "images") -> str:
    return SUPABASE_CLIENT.storage.from_(bucket).get_public_url(image_id)


def delete_images(images_id: list[str], bucket: str = "images"):
    files = [f"public/{image_id}.jpg" for image_id in images_id]

    try:
        SUPABASE_CLIENT.storage.from_(bucket).remove(files)

        return True

    except Exception as e:
        print(f"Errore while deleting Supabase: {e}")
        return False

def compress_image(image_bytes: bytes, quality: int = 80, max_size: tuple | None = None) -> bytes:
    """
    Comprime un'immagine, la ridimensiona (opzionale) e la converte in JPEG.

    Args:
        image_bytes (bytes): L'immagine originale in formato bytes.
        quality (int): La qualità della compressione JPEG (1-100). Default 85.
        max_size (tuple): Opzionale. Una tupla (larghezza, altezza) per il ridimensionamento massimo.
                          Mantiene l'aspect ratio. Esempio: (1920, 1080).

    Returns:
        bytes: L'immagine compressa e convertita in bytes.
    """
    try:
        img_stream = io.BytesIO(image_bytes)
        img = Image.open(img_stream)
        img = ImageOps.exif_transpose(img)  # phone photos are stored sideways + an EXIF rotation tag

        if img.mode != "RGB":
            img = img.convert("RGB")

        if max_size:
            img.thumbnail(max_size)

        output_stream = io.BytesIO()
        img.save(
            output_stream,
            format="JPEG",
            quality=quality,
            optimize=True
        )

        compressed_data = output_stream.getvalue()

        return compressed_data

    except Exception as e:
        # Logga l'errore o gestiscilo come preferisci nel contesto Flask
        print(f"Errore durante la compressione dell'immagine: {e}")
        raise e