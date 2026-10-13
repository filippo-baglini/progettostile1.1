# Run with: venv/bin/python -m ai.test_wardrobe_picks
from ai.src.query_handler import drop_picked_categories
from ai.src.wardrobe import wardrobe_candidate, describe_piece, clean_owned_piece

outfit = lambda: {'top': {'items': [{'tag': 'sweater'}]}, 'bottom': {'items': [{'tag': 'chinos'}]},
                  'shoes': {'items': [{'tag': 'loafers'}]}, 'budget': 150}

# Picked jeans: the planned bottom goes (one per outfit), the rest stays
plan = {'outfits': [outfit(), outfit()]}
drop_picked_categories(plan, {'bottom'})
assert all(set(o) == {'top', 'shoes', 'budget'} for o in plan['outfits'])

# Picked t-shirt: a planned sweater can still go over it
plan = {'outfits': [outfit()]}
drop_picked_categories(plan, {'top'})
assert 'top' in plan['outfits'][0]

# Nothing picked / malformed outfits: unchanged, no crash
plan = {'outfits': [outfit(), None]}
drop_picked_categories(plan, set())
assert plan['outfits'] == [outfit(), None]

piece = {'id': 12, 'section': 'shirts', 'image_id': 'abc', 'name': None, 'color': 'white', 'brand': 'Zara', 'main_category': 'top'}
assert describe_piece(piece) == 'white shirt by Zara'
c = wardrobe_candidate(piece)
assert c['id'] == 'w12' and c['price'] == 0 and c['source'] == 'wardrobe' and c['title'] == 'Your white shirt'
assert c['image_link'].endswith('/wardrobe/public/abc.jpg'), c['image_link']
assert wardrobe_candidate({**piece, 'name': 'Linen shirt'})['title'] == 'Linen shirt'

# The AI's "piece the user owns in the photo": only with a photo this turn, only real sections,
# only if the user really wrote the words the AI quotes; the brand only if the user wrote it
msg = "What goes with this  Sweater I have from Zara?"
guess = {'owner_words': 'sweater i have', 'section': 'sweaters', 'name': '  Grey knit sweater ', 'color': '', 'brand': 'Zara'}
assert clean_owned_piece(guess, True, msg) == {'section': 'sweaters', 'name': 'Grey knit sweater', 'color': None, 'brand': 'Zara'}
assert clean_owned_piece(guess, False, msg) is None
assert clean_owned_piece({**guess, 'section': 'top'}, True, msg) is None
assert clean_owned_piece(None, True, msg) is None
assert clean_owned_piece({**guess, 'owner_words': 'I own it'}, True, msg) is None  # not what they wrote
assert clean_owned_piece({**guess, 'owner_words': ''}, True, msg) is None
assert clean_owned_piece({**guess, 'brand': 'Bape'}, True, msg)['brand'] is None  # brand they never named
assert len(clean_owned_piece({**guess, 'color': 'x' * 500}, True, msg)['color']) == 100

print("wardrobe picks ok")
