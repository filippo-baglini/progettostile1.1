"""The catalogue keeps every accessory in one category, 'accessories', though it holds several kinds.
A search for an accessory the catalogue lacks (LED goggles, gloves) returns the closest accessory,
usually sunglasses, so an outfit could end up with two pairs. Each planned accessory therefore gets
products of its own kind only, and an outfit gets at most one of each kind."""
import re

# The kinds the catalogue carries (import_ebay.py QUERIES), by the words that name them
# ponytail: keyword match on titles; store each product's kind at import if this misfires
ACCESSORY_KINDS = {
    'eyewear': r'sunglass(es)?|glasses|goggles?|eyewear|shades',
    'headwear': r'caps?|hats?|beanies?|berets?',
    'watch': r'watch(es)?',
    'scarf': r'scarf|scarves|bandanas?|shawls?',
    'jewelry': r'necklaces?|pendants?|chains?|chokers?|bracelets?|rings?|earrings?',
    'bag': r'bags?|handbags?|purses?|totes?|clutch(es)?|backpacks?',
}
_PATTERNS = {kind: re.compile(rf'\b({words})\b', re.I) for kind, words in ACCESSORY_KINDS.items()}


def accessory_kinds(title) -> set[str]:
    """Every kind a product title names ('Baseball Cap with Flip-Up Sunglasses' is both)."""
    return {kind for kind, pattern in _PATTERNS.items() if pattern.search(title or '')}


def planned_kind(description: str) -> str | None:
    """The kind a planned item asks for: the last one named, since the description ends with the item
    ('silver chain watch' is a watch). None when the catalogue has no such kind."""
    found = [(match.start(), kind) for kind, pattern in _PATTERNS.items() for match in pattern.finditer(description or '')]
    return max(found)[1] if found else None


def narrow_accessories(all_candidates: list, planned: dict) -> list:
    """all_candidates: one candidate list per outfit slot. planned: slot index -> planned item, for the
    searched slots. Accessory slots keep only products of the planned kind; a slot becomes [] when the
    catalogue has none of that kind or the outfit already has one (also from kept or picked pieces)."""
    used = set()
    for i, candidates in enumerate(all_candidates):
        if i not in planned and candidates and candidates[0].get('main_category') == 'accessories':
            used |= accessory_kinds(candidates[0].get('title'))

    narrowed = list(all_candidates)
    for i, item in sorted(planned.items()):
        if item.get('category') != 'accessories' or not narrowed[i]:
            continue
        kind = planned_kind(item.get('description'))
        narrowed[i] = [c for c in narrowed[i] if kind in accessory_kinds(c.get('title'))] if kind not in used else []
        if narrowed[i]:
            used.add(kind)
    return narrowed
