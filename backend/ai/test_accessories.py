# Run with: venv/bin/python -m ai.test_accessories
from ai.src.accessories import accessory_kinds, planned_kind, narrow_accessories

assert accessory_kinds("Men's Aviator Baseball Cap with Flip-Up Sunglasses") == {'headwear', 'eyewear'}
assert accessory_kinds("Casio Wave Ceptor Men's Watch") == {'watch'}
assert accessory_kinds("Women's Earring Set") == {'jewelry'}          # not a ring through 'earring'
assert planned_kind('standard glowing neon mixed LED-lit goggles') == 'eyewear'
assert planned_kind('silver chain watch') == 'watch'                   # the item is named last
assert planned_kind('fitted neon cyberpunk fingerless gloves') is None  # the catalogue has no gloves

sunglasses = [{'title': 'Versace Rectangular Sunglasses'}, {'title': 'Carrera Sunglasses'}]
mixed = [{'title': 'Ray-Ban Sunglasses'}, {'title': 'Invicta Watch'}, {'title': 'Wool Beanie Hat'}]
top = [{'title': 'White T-Shirt'}]
acc = lambda description: {'category': 'accessories', 'description': description}

# The replayed conversation: goggles, then a bracelet whose search found sunglasses first, then gloves
slots = narrow_accessories([top, sunglasses, mixed, mixed],
                           {0: {'category': 'top', 'description': 't-shirt'},
                            1: acc('LED goggles'), 2: acc('chunky watch'), 3: acc('fingerless gloves')})
assert slots == [top, sunglasses, [{'title': 'Invicta Watch'}], []]

# A second pair of glasses in the same outfit is dropped
assert narrow_accessories([sunglasses, mixed], {0: acc('sunglasses'), 1: acc('aviator sunglasses')})[1] == []

# Sunglasses kept from the previous outfit count too
kept = [{'title': 'Prada Sunglasses', 'main_category': 'accessories'}]
assert narrow_accessories([kept, mixed], {1: acc('round sunglasses')}) == [kept, []]
print("ok")
