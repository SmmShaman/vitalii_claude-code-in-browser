-- Add image_prompt_variants column to news table
-- Stores array of 4 visual concept variants for moderator to choose from
-- Format: [{"label": "...", "description": "..."}, ...]
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_prompt_variants JSONB;
