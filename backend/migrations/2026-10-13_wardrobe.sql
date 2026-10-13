-- Digital wardrobe: photos of the user's own clothes. Run once in the Supabase SQL editor (safe to re-run).
-- Needs a public storage bucket named `wardrobe`.

CREATE TABLE IF NOT EXISTS wardrobe_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section VARCHAR(30) NOT NULL,    -- key of WARDROBE_SECTIONS in app.py (t-shirts, pants, ...)
    image_id VARCHAR(64) NOT NULL,   -- storage: wardrobe/public/<image_id>.jpg
    name VARCHAR(255),
    color VARCHAR(100),
    brand VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS wardrobe_items_user_id_idx ON wardrobe_items(user_id);
