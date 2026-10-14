-- B10: a NULL price crashes outfit assembly, and an empty colour matches every colour filter in
-- search_outfits_batch (ILIKE '%' || '' || '%'). import_ebay.py never writes either; this makes sure nothing does.
-- The catalogue had neither when this was written (0 NULL prices, 0 empty colours).
ALTER TABLE product_data ALTER COLUMN price SET NOT NULL;
ALTER TABLE product_data DROP CONSTRAINT IF EXISTS product_data_color_not_empty;
ALTER TABLE product_data ADD CONSTRAINT product_data_color_not_empty CHECK (schema_color <> '');
