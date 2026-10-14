# Run with: venv/bin/python -m ai.test_wardrobe_picks
from ai.src.query_handler import drop_picked_categories, keep_one_item_per_category
from types import SimpleNamespace
from ai.src import moderation, wardrobe
from ai.src.wardrobe import wardrobe_candidate, describe_piece, clean_owned_piece, check_wardrobe_piece

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

# Alternatives the model listed in a one-per-outfit category: only the first stays; tops can layer
plan = {'outfits': [{'top': {'items': [{'tag': 't-shirt'}, {'tag': 'sweater'}]},
                     'bottom': {'items': [{'tag': 'slim jeans'}, {'tag': 'distressed jeans'}]},
                     'shoes': {'items': []}, 'swimwear': {'items': [{'tag': 'bikini top'}, {'tag': 'bikini bottom'}]}}, None]}
keep_one_item_per_category(plan)
o = plan['outfits'][0]
assert o['bottom']['items'] == [{'tag': 'slim jeans'}] and len(o['top']['items']) == 2
assert o['shoes']['items'] == [] and len(o['swimwear']['items']) == 2

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

# Wardrobe piece check (model stubbed): verdict -> refusal message; an edit with no text skips the model
calls = []
def stub(verdict):
    moderation.generate_content_with_fallback = lambda **kw: calls.append(kw) or SimpleNamespace(parsed={'verdict': verdict})
stub('OFFENSIVE')
assert check_wardrobe_piece(b'jpg', [None, None, None]) == wardrobe.OFFENSIVE_MESSAGE
assert check_wardrobe_piece(None, ['bad words', None, None]) == wardrobe.OFFENSIVE_MESSAGE
stub('NOT_CLOTHING')
assert check_wardrobe_piece(b'jpg', ['Linen shirt', 'white', None]) == wardrobe.NOT_CLOTHING_MESSAGE
assert check_wardrobe_piece(None, ['Linen shirt', None, None]) is None  # no photo: can't judge clothing
stub('OK')
assert check_wardrobe_piece(b'jpg', [None, None, None]) is None
calls.clear()
assert check_wardrobe_piece(None, [None, None, None]) is None and calls == []

# Profile check: same model call, its own prompt; any photo is fine unless offensive (C4)
stub('OFFENSIVE')
assert moderation.check_profile(image=b'jpg') == moderation.OFFENSIVE_MESSAGE
assert moderation.check_profile(name='bad words', username='x') == moderation.OFFENSIVE_MESSAGE
assert 'name: bad words; username: x' in calls[-1]['contents'][0]['parts'][0].text
stub('OK')
assert moderation.check_profile(image=b'jpg', name='Mario') is None

print("wardrobe picks ok")
