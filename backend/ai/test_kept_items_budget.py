# Run with: venv/bin/python -m ai.test_kept_items_budget  (from backend/)
# Items kept while refining are never dropped to fit a lower budget (B9).
from ai.src.assemble_outfit import get_outfit


def item(id, price, similarity, locked=False):
    return {'id': id, 'price': price, 'similarity': similarity, 'title': id, **({'locked': True} if locked else {})}


jacket = [item('jacket', 100, 1.0, locked=True)]
shoes = [item('cheap shoes', 30, 0.3), item('nice shoes', 80, 0.9)]
trousers = [item('trousers', 40, 0.8)]

# Room left after the jacket: the rest is chosen within it
outfit, remaining, _, _ = get_outfit([jacket, shoes, trousers], 180)
assert [o['id'] for o in outfit] == ['jacket', 'cheap shoes', 'trousers'] and remaining == 10

# The old code dropped the jacket here for nice shoes + trousers (1.7 similarity, €120)
outfit, remaining, _, _ = get_outfit([jacket, shoes, trousers], 130)
assert [o['id'] for o in outfit] == ['jacket', 'cheap shoes'] and remaining == 0

# The jacket alone is over budget: kept, nothing else bought, shown as over
outfit, remaining, _, _ = get_outfit([jacket, shoes], 60)
assert [o['id'] for o in outfit] == ['jacket'] and remaining == -40

# A new outfit (nothing kept) still fits the budget as before
outfit, remaining, _, _ = get_outfit([shoes, trousers], 100)
assert [o['id'] for o in outfit] == ['cheap shoes', 'trousers'] and remaining == 30
print("ok")
