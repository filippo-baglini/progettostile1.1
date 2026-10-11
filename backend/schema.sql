-- pgvector for product embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- NULL for Google-only accounts
    gender VARCHAR(50),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Prompts table (User messages)
CREATE TABLE IF NOT EXISTS prompts (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI Responses table
CREATE TABLE IF NOT EXISTS ai_responses (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    short_message TEXT,
    explanation TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Product Data table (Catalog)
CREATE TABLE IF NOT EXISTS product_data (
    id SERIAL PRIMARY KEY, -- Assuming integer ID, change to VARCHAR if needed
    title VARCHAR(255),
    url TEXT,
    price DECIMAL(10, 2),
    image_link TEXT,
    brand VARCHAR(255),
    material VARCHAR(255),
    description TEXT, -- Inferred from usage in embeddings
    schema_description TEXT,
    schema_color TEXT,
    main_category TEXT,
    audience TEXT,
    availability TEXT,
    embedding VECTOR(512), 
    img_embedding VECTOR(512),
    detail_embedding VECTOR(512)
);

-- Materials (listed in preferences UI)
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- Outfit Suggestions (Link between AI response and Products)
CREATE TABLE IF NOT EXISTS outfit_suggestion (
    id SERIAL PRIMARY KEY,
    ai_response_id INTEGER REFERENCES ai_responses(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES product_data(id) ON DELETE CASCADE,
    outfit_index INTEGER DEFAULT 0,
    budget DECIMAL(10, 2), -- Storing per-outfit budget
    UNIQUE(ai_response_id, product_id, outfit_index)
);

-- Preferences table (Master list of preferences)
CREATE TABLE IF NOT EXISTS preferences (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preference (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    preference_id INTEGER REFERENCES preferences(id) ON DELETE CASCADE,
    value VARCHAR(255),
    PRIMARY KEY (user_id, preference_id)
);

-- Preferences shown on the preferences page. The ids are fixed: DBManager.preferences()
-- fills the options for 2 (brands from product_data), 3 (materials table) and 4 (gender),
-- and the frontend treats 'Genere' as the single-select gender (stored in users.gender).
-- Re-running this also corrects rows inserted by older versions of this file.
INSERT INTO preferences (id, name) VALUES
(1, 'Color'),
(2, 'Brand'),
(3, 'Material'),
(4, 'Genere')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
SELECT setval(pg_get_serial_sequence('preferences', 'id'), (SELECT MAX(id) FROM preferences));

-- Vector search used by ai/src/outfit_retrieval_logic.py.
-- One row per (query, candidate); query_index is 1-based, matching the order of `queries`.
-- Brand/material are matched against the title since eBay search results don't carry them as fields.
CREATE OR REPLACE FUNCTION search_outfits_batch(
    queries jsonb, match_threshold float, match_count int, max_espense numeric, gender text
)
RETURNS TABLE (
    query_index int, id int, title text, url text, price numeric, image_link text, brand text,
    material text, schema_description text, schema_color text, main_category text, similarity float
)
LANGUAGE sql STABLE AS $$
    SELECT q.ord::int, p.id, p.title, p.url, p.price, p.image_link, p.brand, p.material,
           p.schema_description, p.schema_color, p.main_category, p.similarity
    FROM jsonb_array_elements(queries) WITH ORDINALITY AS q(val, ord)
    CROSS JOIN LATERAL (
        SELECT pd.id, pd.title::text, pd.url, pd.price, pd.image_link, pd.brand::text, pd.material::text,
               pd.schema_description, pd.schema_color, pd.main_category,
               1 - (pd.img_embedding <=> (q.val->'embedding')::text::vector) AS similarity
        FROM product_data pd
        WHERE pd.main_category = q.val->>'category'
          AND (search_outfits_batch.gender IS NULL OR search_outfits_batch.gender NOT IN ('male', 'female')
               OR pd.audience = search_outfits_batch.gender)
          AND (max_espense IS NULL OR max_espense <= 0 OR pd.price <= max_espense)
          AND (q.val->>'color' IS NULL OR pd.schema_color ILIKE '%' || (q.val->>'color') || '%'
               OR (q.val->>'color') ILIKE '%' || pd.schema_color || '%')
          AND (q.val->>'brand' IS NULL OR pd.title ILIKE '%' || (q.val->>'brand') || '%')
          AND (q.val->>'material' IS NULL OR pd.title ILIKE '%' || (q.val->>'material') || '%')
          AND 1 - (pd.img_embedding <=> (q.val->'embedding')::text::vector) > match_threshold
        ORDER BY pd.img_embedding <=> (q.val->'embedding')::text::vector
        LIMIT match_count
    ) p;
$$;
