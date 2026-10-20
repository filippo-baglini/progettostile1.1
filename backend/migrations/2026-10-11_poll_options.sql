-- The option boxes shown with an AI reply (budget ranges, outfit styles), saved so they survive a reload.
-- Run once in the Supabase SQL editor (safe to re-run). New databases get both columns from schema.sql.
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS budget_options JSONB;
ALTER TABLE ai_responses ADD COLUMN IF NOT EXISTS outfit_generation_options JSONB;
