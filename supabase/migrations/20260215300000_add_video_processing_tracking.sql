-- Add video processing tracking columns
-- The video-processor GitHub Action script (scripts/video-processor/index.js)
-- writes to these columns to track failed processing attempts,
-- but they were never created in the database.

ALTER TABLE news ADD COLUMN IF NOT EXISTS video_processing_error TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS video_processing_attempted_at TIMESTAMPTZ;
