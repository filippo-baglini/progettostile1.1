"""Checks on what users upload or write before it's saved: wardrobe pieces (ai/src/wardrobe.py) and profiles.
Checked once, when created or changed: with friends or sharing, that's when others can start seeing it."""

import logging

from ai.src.model_fallback import generate_content_with_fallback, image_part, text_part

OFFENSIVE_MESSAGE = ("I cannot fulfill this request. Content that promotes hate speech, discrimination, "
                     "or is offensive toward any group or individual violates my safety policy and is strictly forbidden.")

PROFILE_CHECK_PROMPT = """You check the profile picture and names users show to other users. Reply with one verdict:
- OFFENSIVE: the photo or the text shows hate symbols, hateful, discriminatory or harassing words, nudity or sexually explicit content.
- OK: anything else, whatever the photo shows (a person, a pet, a drawing, a place)."""


def verdict(prompt: str, verdicts: list[str], text: str, image: bytes | None) -> str | None:
    """The model's verdict on a text and an optional JPEG.
    An unreachable model raises: the content is refused rather than let in unchecked."""
    parts = [text_part(text)] + ([image_part(image)] if image is not None else [])
    response = generate_content_with_fallback(
        [{"role": "user", "content": parts}], system=prompt, temperature=0,
        schema={"type": "object", "properties": {"verdict": {"type": "string", "enum": verdicts}}, "required": ["verdict"]},
    )
    return (response.parsed or {}).get("verdict")


def check_profile(image: bytes | None = None, name: str | None = None, username: str | None = None) -> str | None:
    """The message to refuse a new avatar or name with, or None if it's fine."""
    text = "; ".join(f"{field}: {value}" for field, value in (("name", name), ("username", username)) if value)
    result = verdict(PROFILE_CHECK_PROMPT, ["OK", "OFFENSIVE"], f"Names the user wrote: {text or 'none'}", image)
    logging.info(f"Profile check: {result}")
    return OFFENSIVE_MESSAGE if result == "OFFENSIVE" else None
