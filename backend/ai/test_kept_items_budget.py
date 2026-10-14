# Run with: venv/bin/python -m ai.test_kept_items_budget  (from backend/)
# While refining, kept items are never dropped to fit a lower budget and every piece the user asked for
# is filled; if they don't fit, the outfit goes over budget (B9).
from ai.src.assemble_outfit import get_outfit


def item(id, price, similarity, locked=False):
    return {'id': id, 'price': price, 'similarity': similarity, 'title': id, **({'locked': True} if locked else {})}


def ids(outfit):
    return [o['id'] for o in outfit]


jacket = [item('jacket', 100, 1.0, locked=True)]
shoes = [item('cheap shoes', 30, 0.3), item('nice shoes', 80, 0.9)]
trousers = [item('trousers', 40, 0.8)]

# Room left after the jacket: the new pieces are chosen within it
outfit, remaining, _, _ = get_outfit([jacket, shoes, trousers], 180)
assert ids(outfit) == ['jacket', 'cheap shoes', 'trousers'] and remaining == 10

# The old code dropped the jacket here for nice shoes + trousers (1.7 similarity, €120).
# €30 left can't buy both requested pieces: both still come, the cheapest ones, over budget
outfit, remaining, _, _ = get_outfit([jacket, shoes, trousers], 130)
assert ids(outfit) == ['jacket', 'cheap shoes', 'trousers'] and remaining == -40

# The jacket alone is over budget: still kept, the requested shoes still come
outfit, remaining, _, _ = get_outfit([jacket, shoes], 60)
assert ids(outfit) == ['jacket', 'cheap shoes'] and remaining == -70

# Only the budget changed (nothing new asked for)
outfit, remaining, _, _ = get_outfit([jacket], 160)
assert ids(outfit) == ['jacket'] and remaining == 60

# A new outfit (nothing kept) may still skip a slot to fit the budget, as before
outfit, remaining, _, _ = get_outfit([shoes, trousers], 100)
assert ids(outfit) == ['cheap shoes', 'trousers'] and remaining == 30
outfit, remaining, _, _ = get_outfit([shoes, trousers], 50)
assert ids(outfit) == ['trousers'] and remaining == 10
print("ok")
