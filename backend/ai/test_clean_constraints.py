# Run with: venv/bin/python -m ai.test_clean_constraints
from ai.src.query_handler import clean_constraints, drop_preference_constraints

# Invented fields and empty values are dropped; categories left empty disappear
assert clean_constraints({'top': {'material': 'wool', 'brand': None},
                          'bottom': {'color': 'dark', 'material': 'denim', 'tag': 'jeans'},
                          'shoes': {'material': '', 'brand': ''}}) == {'top': {'material': 'wool'}, 'bottom': {'material': 'denim'}}
assert clean_constraints(None) == {}
assert clean_constraints({'top': 'wool'}) == {}

# Constraints copied from the saved preferences go, unless the user wrote the word themselves
prefs = {'favorite_color': 'white', 'favorite_brand': 'Nike, Zara', 'favorite_material': 'cotton'}
copied = {'top': {'material': 'cotton', 'brand': 'Zara'}, 'shoes': {'brand': 'Nike'}, 'bottom': {'material': 'denim'}}
assert drop_preference_constraints(copied, prefs, ['A smart casual outfit for dinner']) == {'bottom': {'material': 'denim'}}
assert drop_preference_constraints(copied, prefs, ['I want nike shoes', 'and a cotton shirt']) == \
    {'top': {'material': 'cotton'}, 'shoes': {'brand': 'Nike'}, 'bottom': {'material': 'denim'}}
assert drop_preference_constraints(copied, None, ['anything']) == copied   # guests: nothing saved
print("ok")
