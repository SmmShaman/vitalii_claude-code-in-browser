-- Add AI pre-moderation fields to news table
-- These fields control whether posts pass AI screening before being sent to Telegram bot

ALTER TABLE news
ADD COLUMN IF NOT EXISTS pre_moderation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS moderation_checked_at TIMESTAMPTZ;

-- Add video fields for embedded video support
ALTER TABLE news
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_type TEXT;
-- video_type values: 'telegram_embed', 'direct_url', 'iframe', 'youtube'

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_pre_moderation_status ON news(pre_moderation_status);
CREATE INDEX IF NOT EXISTS idx_news_video_url ON news(video_url) WHERE video_url IS NOT NULL;

-- Add check constraint for pre_moderation_status
ALTER TABLE news
ADD CONSTRAINT check_pre_moderation_status
CHECK (pre_moderation_status IN ('pending', 'approved', 'rejected'));

-- Add check constraint for video_type
ALTER TABLE news
ADD CONSTRAINT check_video_type
CHECK (video_type IS NULL OR video_type IN ('telegram_embed', 'direct_url', 'iframe', 'youtube'));

-- Add comments for documentation
COMMENT ON COLUMN news.pre_moderation_status IS 'AI pre-moderation status: pending (not checked), approved (passes AI screening), rejected (spam/duplicate/low quality)';
COMMENT ON COLUMN news.rejection_reason IS 'Reason why AI rejected this post (e.g., "advertisement", "duplicate", "low quality")';
COMMENT ON COLUMN news.moderation_checked_at IS 'Timestamp when AI pre-moderation was performed';
COMMENT ON COLUMN news.video_url IS 'URL to embedded video (can be Telegram embed URL, direct video file, or YouTube URL)';
COMMENT ON COLUMN news.video_type IS 'Type of video embed: telegram_embed, direct_url, iframe, youtube';

-- Update existing rows to have default status
UPDATE news
SET pre_moderation_status = 'approved'
WHERE pre_moderation_status IS NULL AND is_published = true;

UPDATE news
SET pre_moderation_status = 'pending'
WHERE pre_moderation_status IS NULL AND is_published = false;
