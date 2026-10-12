# Run with: venv/bin/python -m ai.test_clean_constraints
from ai.src.query_handler import clean_constraints

# Invented fields and empty values are dropped; categories left empty disappear
assert clean_constraints({'top': {'material': 'wool', 'brand': None},
                          'bottom': {'color': 'dark', 'material': 'denim', 'tag': 'jeans'},
                          'shoes': {'material': '', 'brand': ''}}) == {'top': {'material': 'wool'}, 'bottom': {'material': 'denim'}}
assert clean_constraints(None) == {}
assert clean_constraints({'top': 'wool'}) == {}
print("ok")
