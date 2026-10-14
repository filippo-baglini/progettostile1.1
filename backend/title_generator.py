import logging
from dotenv import load_dotenv

from ai.src.model_fallback import generate_content_with_fallback

load_dotenv()

def generate_title(prompt: str) -> str:
    prompt_text = (
        f"Generate strictly ONE single title based on this prompt: '{prompt}'. "
        "The title must be short, concise and informative, and written in the same language as the prompt. "
        "Do not provide a list. Do not output intro text. Output ONLY the title."
    )

    try:
        response = generate_content_with_fallback([{"role": "user", "content": prompt_text}])

        # Mistral tends to wrap the title in **bold** and quotes
        return str(response.text).strip().strip('*"\' ')

    except Exception as e:
        logging.error(f"Title generation error: {e}")
        raise