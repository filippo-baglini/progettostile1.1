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
    full_prompt = (
        "*** USER REQUEST ***\n"
        f"{user_prompt}"
        "\n**************************\n"
        "*** OUTFIT RETRIEVED ***\n"
        f"{retrieved_outfit}"
        "\n**************************\n"
    )
    response = generate_content_with_fallback([{"role": "user", "content": full_prompt}], system=SYSTEM_PROMPT)
    return response.text
