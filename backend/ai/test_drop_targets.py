# Run with: venv/bin/python -m ai.test_drop_targets  (from backend/)
from ai.src.app import drop_targets


def outfit():
    return {'12': {'id': 12, 'main_category': 'shoes'}, 'w3': {'id': 'w3', 'main_category': 'top'},
            '40': {'id': 40, 'main_category': 'accessory'}, '41': {'id': 41, 'main_category': 'accessory'}}


items = outfit()
drop_targets(items, [{'action': 'REMOVE', 'item_id': 'w3'}, {'action': 'REPLACE', 'item_id': 12, 'category': 'shoes'}])
assert set(items) == {'40', '41'}                     # exact IDs, wardrobe and catalogue

items = outfit()
drop_targets(items, [{'action': 'REPLACE', 'item_id': '8021af5d-9279', 'category': 'shoes'}])
assert set(items) == {'w3', '40', '41'}               # invented ID: the only shoes go

items = outfit()
drop_targets(items, [{'action': 'REPLACE', 'item_id': '99', 'category': 'accessory'},  # two accessories: can't tell which
                     {'action': 'REMOVE', 'item_id': '99'},
                     {'action': 'ADD', 'category': 'bottom'}])
assert set(items) == set(outfit())
print("ok")
