import logging

from google.genai import types

from ai.src.model_fallback import generate_content_with_fallback

SYSTEM_PROMPT = """
You are a fashion stylist. You receive a user's conversation with a styling app and one outfit the app suggested.
Explain briefly why this outfit fits what the user asked for.

- Keep it under 80 words: a short paragraph, no headings, no introduction, no conclusion, no follow-up questions.
- Cover how the pieces work together (colours, style) and how they meet the request (occasion, budget, style).
- Only use details found in the item data; don't invent colours, materials or fits.
- Write in the same language as the user's messages.
"""

def explain_selected_outfit(user_prompt: str, retrieved_outfit) -> str:
    """A short explanation of why `retrieved_outfit` fits the conversation so far."""
    try:
        
        user_request_block = (
            "*** USER REQUEST ***\n"
            f"{user_prompt}"
            "\n**************************\n"
        )
                
        retrieved_outfit_block = (
            "*** OUTFIT RETRIEVED ***\n"
            f"{retrieved_outfit}"
            "\n**************************\n"
        )

        full_prompt = user_request_block + retrieved_outfit_block
    
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT
        )
        
        response = generate_content_with_fallback(
            contents=[full_prompt],
            config=config
        )
        return response.text
    except Exception:
        logging.exception("Error generating outfit explanation")
        return "Sorry, I couldn't generate an explanation at this time."