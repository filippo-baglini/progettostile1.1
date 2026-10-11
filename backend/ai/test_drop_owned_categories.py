# Run with: venv/bin/python -m ai.test_drop_owned_categories
from ai.src.query_handler import drop_owned_categories

# Outfit to go with the user's sweater: the model's extra sweater is removed
plan = {'owned_categories': ['top'], 'outfits': [
    {'top': {'items': [{'tag': 'sweater'}]}, 'bottom': {'items': [{'tag': 'jeans'}]}, 'budget': 150}]}
drop_owned_categories(plan)
assert plan['outfits'] == [{'bottom': {'items': [{'tag': 'jeans'}]}, 'budget': 150}]

# The owned piece is all the outfit has: the user wants that piece itself, so it stays
plan = {'owned_categories': ['top'], 'outfits': [{'top': {'items': [{'tag': 'sweater'}]}, 'budget': 150}]}
drop_owned_categories(plan)
assert 'top' in plan['outfits'][0]

# Stray non-category keys don't count as other items
plan = {'owned_categories': ['top'], 'outfits': [{'top': {'items': [{'tag': 'sweater'}]}, 'hard_constraints': {}, 'budget': 150}]}
drop_owned_categories(plan)
assert 'top' in plan['outfits'][0]

# Nothing owned: unchanged
plan = {'outfits': [{'top': {'items': []}, 'bottom': None}]}
drop_owned_categories(plan)
assert plan['outfits'] == [{'top': {'items': []}, 'bottom': None}]

print("ok")
