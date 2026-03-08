-- Add roundup and overflow script fields for Headlines Roundup feature
ALTER TABLE daily_video_drafts
ADD COLUMN IF NOT EXISTS roundup_script TEXT,
ADD COLUMN IF NOT EXISTS overflow_script TEXT;
