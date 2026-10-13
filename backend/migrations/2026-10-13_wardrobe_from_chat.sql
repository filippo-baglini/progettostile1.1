-- "Add to your wardrobe?" card on AI replies to a photo of a piece the user owns.
-- Run once in the Supabase SQL editor (safe to re-run). Needs 2026-10-13_wardrobe_outfits.sql first.

-- {section, name, color, brand} detected by the AI; cleared once the user adds or dismisses it
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS wardrobe_suggestion JSONB;
