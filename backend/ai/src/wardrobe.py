"""The user's own clothes in the outfit pipeline: pieces they pick, and the 'only my clothes' search."""

import logging
from collections import defaultdict

from supabase import Client

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
