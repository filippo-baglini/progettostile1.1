from google.genai import types
from dotenv import load_dotenv

from ai.src.model_fallback import generate_content_with_fallback

load_dotenv()

def generate_title(prompt: str) -> str:
    prompt_text = (
        f"Generate strictly ONE single title based on this prompt: '{prompt}'. "
        "The title must be short, concise and informative. "
        "Do not provide a list. Do not output intro text. Output ONLY the title."
    )

    try:
        print("Sending title request to Mistral (with fallback)...")

        config = types.GenerateContentConfig()
        
        response = generate_content_with_fallback(
            contents=prompt_text,
            config=config
        )

        # Mistral tends to wrap the title in **bold** and quotes
        return str(response.text).strip().strip('*"\' ')

    except Exception as e:
        print(f"Si è verificato un errore: {e}")
        raise e