"""The user's own clothes in the outfit pipeline: pieces they pick, and the 'only my clothes' search."""

import logging
from collections import defaultdict

from google.genai import types
from supabase import Client

from ai.src.model_fallback import generate_content_with_fallback
from storage_manager import get_image_url

# Wardrobe sections and the outfit-AI category each one belongs to (FASHION_CATEGORIES in query_handler.py).
# The frontend lists the same keys in components/profile/wardrobeSections.ts.
WARDROBE_SECTIONS = {
    't-shirts': 'top', 'shirts': 'top', 'sweaters': 'top',
    'pants': 'bottom', 'shorts': 'bottom', 'skirts': 'bottom',
    'dresses': 'dresses', 'outerwear': 'outerwear', 'swimwear': 'swimwear',
    'shoes': 'shoes', 'accessories': 'accessories',
}

# Wardrobe section -> how one piece is called ('Your white shirt')
PIECE_NAMES = {
    't-shirts': 't-shirt', 'shirts': 'shirt', 'sweaters': 'sweater', 'pants': 'pants', 'shorts': 'shorts',
    'skirts': 'skirt', 'dresses': 'dress', 'outerwear': 'jacket', 'swimwear': 'swimwear', 'shoes': 'shoes',
    'accessories': 'accessory',
}


def describe_piece(piece: dict) -> str:
    """'white shirt by Zara, "Linen shirt"': what the planner is told about a picked piece."""
    text = " ".join(filter(None, [piece.get('color'), PIECE_NAMES.get(piece['section'], piece['section'])]))
    if piece.get('brand'):
        text += f" by {piece['brand']}"
    if piece.get('name'):
        text += f', "{piece["name"]}"'
    return text


def clean_owned_piece(piece, has_photo: bool, user_message: str) -> dict | None:
    """The AI's guess at a piece of the user's own in this turn's photo, or None if it can't be used:
    no photo this turn, a section that doesn't exist, or 'owner_words' (the user's words saying it's theirs)
    that the user didn't actually write. The brand is kept only if the user wrote it too: the model
    otherwise reads brands into printed slogans. Text fields are trimmed and capped like a wardrobe item's."""
    said = lambda text: isinstance(text, str) and text.strip() and " ".join(text.lower().split()) in " ".join((user_message or "").lower().split())
    if (not has_photo or not isinstance(piece, dict) or piece.get('section') not in WARDROBE_SECTIONS
            or not said(piece.get('owner_words'))):
        return None
    cleaned = {'section': piece['section']}
    for field, limit in (('name', 255), ('color', 100), ('brand', 255)):
        value = piece.get(field)
        cleaned[field] = value.strip()[:limit] or None if isinstance(value, str) else None
    if not said(cleaned['brand']):
        cleaned['brand'] = None
    return cleaned


# Same words as the chat guardrail in query_handler.py
OFFENSIVE_MESSAGE = ("I cannot fulfill this request. Content that promotes hate speech, discrimination, "
                     "or is offensive toward any group or individual violates my safety policy and is strictly forbidden.")
NOT_CLOTHING_MESSAGE = "This photo doesn't show a clothing item, shoes or an accessory, so it can't go in your wardrobe."

PIECE_CHECK_PROMPT = """You check what users add to their digital wardrobe. Reply with one verdict:
- OFFENSIVE: the photo or the text shows hate symbols, hateful, discriminatory or harassing words, or sexually explicit content.
- NOT_CLOTHING: the photo doesn't show a clothing item, shoes or a fashion accessory (worn by someone or not).
- OK: anything else."""

TEXT_CHECK_PROMPT = """You check the name, color and brand users give a piece in their digital wardrobe. Reply with one verdict:
- OFFENSIVE: the text contains hate symbols, hateful, discriminatory or harassing words, or sexually explicit content.
- OK: anything else."""


def check_wardrobe_piece(image: bytes | None, details: list) -> str | None:
    """The message to refuse a new or edited piece with, or None if it can go in the wardrobe.
    With a photo: offensive content or not clothing at all; without (an edit): offensive name/color/brand.
    Pieces never reach the chat guardrail ('only my clothes' finds them by embedding), so they are checked here.
    An unreachable model raises: the piece is refused rather than let in unchecked."""
    text = "; ".join(f"{field}: {value}" for field, value in zip(("name", "color", "brand"), details) if value)
    if image is None and not text:
        return None
    parts = [types.Part(text=f"Details the user wrote: {text or 'none'}")]
    if image is not None:
        parts.append(types.Part.from_bytes(data=image, mime_type="image/jpeg"))
    verdicts = ["OK", "OFFENSIVE", "NOT_CLOTHING"] if image is not None else ["OK", "OFFENSIVE"]
    response = generate_content_with_fallback(
        contents=[{"role": "user", "parts": parts}],
        config=types.GenerateContentConfig(
            system_instruction=PIECE_CHECK_PROMPT if image is not None else TEXT_CHECK_PROMPT,
            response_mime_type="application/json",
            response_schema=types.Schema(type=types.Type.OBJECT, required=["verdict"], properties={
                "verdict": types.Schema(type=types.Type.STRING, enum=verdicts)}),
            temperature=0,
        ),
    )
    verdict = (response.parsed or {}).get("verdict")
    logging.info(f"Wardrobe piece check: {verdict}")
    if verdict == "OFFENSIVE":
        return OFFENSIVE_MESSAGE
    if verdict == "NOT_CLOTHING" and image is not None:
        return NOT_CLOTHING_MESSAGE
    return None


def wardrobe_candidate(piece: dict, similarity: float = 1.0) -> dict:
    """A wardrobe piece shaped like a catalogue search result. Price 0: the user already owns it.
    The 'w' id prefix keeps it apart from product ids (diversity tracking, refinement locking)."""
    return {
        'id': f"w{piece['id']}",
        'title': piece.get('name') or f"Your {' '.join(filter(None, [piece.get('color'), PIECE_NAMES.get(piece['section'], piece['section'])]))}",
        'url': None,
        'price': 0,
        'similarity': similarity,
        'image_link': get_image_url(f"public/{piece['image_id']}.jpg", "wardrobe"),
        'brand': piece.get('brand'),
        'material': None,
        'main_category': piece['main_category'],
        'description': f"{describe_piece(piece)} (from the user's own wardrobe)",
        'source': 'wardrobe',
    }


def search_wardrobe_candidates(client: Client, items: list[dict], user_id: int, exclude_ids: set[int]) -> list[list[dict]]:
    """For each planned item, the user's pieces in that category ranked by similarity (possibly none).
    `exclude_ids` are pieces already in the outfit because the user picked them."""
    queries = [{
        "category": item['category'],
        "embedding": item['embedding'],
        "color": (item.get('hard_constraints') or {}).get('color'),
        "brand": (item.get('hard_constraints') or {}).get('brand'),
    } for item in items]

    try:
        rows = client.rpc("search_wardrobe_batch", {
            "queries": queries, "wardrobe_user_id": user_id, "match_count": 20,
        }).execute().data or []
    except Exception as e:
        logging.error(f"Wardrobe search failed: {e}")
        rows = []

    by_query = defaultdict(list)
    for row in rows:
        if row['id'] not in exclude_ids:
            by_query[row['query_index']].append(wardrobe_candidate(row, row['similarity']))
    for i, item in enumerate(items, 1):
        best = by_query[i][0]['similarity'] if by_query[i] else None
        logging.info(f"Wardrobe search '{item.get('description')}' ({item['category']}): {len(by_query[i])} pieces, best similarity {best}")
    return [by_query[i] for i in range(1, len(items) + 1)]
