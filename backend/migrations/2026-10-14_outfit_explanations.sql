-- Outfit explanations, saved the first time a user asks for one. Run once in the Supabase SQL editor (safe to re-run).

CREATE TABLE IF NOT EXISTS outfit_explanations (
    ai_response_id INTEGER NOT NULL REFERENCES ai_responses(id) ON DELETE CASCADE,
    outfit_index INTEGER NOT NULL,   -- as in outfit_suggestion
    explanation TEXT NOT NULL,
    PRIMARY KEY (ai_response_id, outfit_index)
);
-- Only the backend uses it: no policies, so Supabase's public API can't read it
ALTER TABLE outfit_explanations ENABLE ROW LEVEL SECURITY;
