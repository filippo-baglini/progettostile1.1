-- The outfit AI can use wardrobe pieces. Run once in the Supabase SQL editor (safe to re-run).
-- Needs 2026-10-13_wardrobe.sql first. Afterwards run `python embed_wardrobe.py` once for items uploaded before this.

-- Search data: the outfit-AI category of the section and a FashionCLIP embedding of the photo
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS main_category TEXT;
ALTER TABLE wardrobe_items ADD COLUMN IF NOT EXISTS img_embedding VECTOR(512);
UPDATE wardrobe_items SET main_category = CASE section
    WHEN 't-shirts' THEN 'top' WHEN 'shirts' THEN 'top' WHEN 'sweaters' THEN 'top'
    WHEN 'pants' THEN 'bottom' WHEN 'shorts' THEN 'bottom' WHEN 'skirts' THEN 'bottom'
    ELSE section END
WHERE main_category IS NULL;

-- Pieces the user picked for a message, shown again when the chat is reloaded
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS wardrobe_item_ids INTEGER[];

-- An outfit item is either a catalogue product or one of the user's wardrobe pieces
ALTER TABLE outfit_suggestion ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE outfit_suggestion ADD COLUMN IF NOT EXISTS wardrobe_item_id INTEGER REFERENCES wardrobe_items(id) ON DELETE CASCADE;
ALTER TABLE outfit_suggestion DROP CONSTRAINT IF EXISTS outfit_suggestion_one_source;
ALTER TABLE outfit_suggestion ADD CONSTRAINT outfit_suggestion_one_source
    CHECK ((product_id IS NULL) <> (wardrobe_item_id IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS outfit_suggestion_wardrobe_unique
    ON outfit_suggestion (ai_response_id, wardrobe_item_id, outfit_index);

-- Wardrobe version of search_outfits_batch: one row per (query, owned piece), query_index 1-based.
-- Colour/brand only filter pieces where the user filled them in; there is no material field.
CREATE OR REPLACE FUNCTION search_wardrobe_batch(queries jsonb, wardrobe_user_id int, match_count int)
RETURNS TABLE (
    query_index int, id int, section text, image_id text, name text, color text, brand text,
    main_category text, similarity float
)
LANGUAGE sql STABLE AS $$
    SELECT q.ord::int, w.id, w.section, w.image_id, w.name, w.color, w.brand, w.main_category, w.similarity
    FROM jsonb_array_elements(queries) WITH ORDINALITY AS q(val, ord)
    CROSS JOIN LATERAL (
        SELECT wi.id, wi.section::text, wi.image_id::text, wi.name::text, wi.color::text, wi.brand::text,
               wi.main_category, 1 - (wi.img_embedding <=> (q.val->'embedding')::text::vector) AS similarity
        FROM wardrobe_items wi
        WHERE wi.user_id = wardrobe_user_id
          AND wi.main_category = q.val->>'category'
          AND wi.img_embedding IS NOT NULL
          AND (q.val->>'color' IS NULL OR wi.color IS NULL OR wi.color ILIKE '%' || (q.val->>'color') || '%'
               OR (q.val->>'color') ILIKE '%' || wi.color || '%')
          AND (q.val->>'brand' IS NULL OR wi.brand IS NULL OR wi.brand ILIKE '%' || (q.val->>'brand') || '%')
        ORDER BY wi.img_embedding <=> (q.val->'embedding')::text::vector
        LIMIT match_count
    ) w;
$$;
