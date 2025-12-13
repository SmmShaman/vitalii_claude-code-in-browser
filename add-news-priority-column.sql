-- ============================================
-- Add priority and scheduled_publish_at columns to news table
-- ============================================
-- This migration adds queue management columns to the news table:
-- - priority: for managing publication order (high, medium, low)
-- - scheduled_publish_at: for scheduling future publication
-- ============================================

-- Add priority column
ALTER TABLE news
ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low'));

-- Add scheduled_publish_at column
ALTER TABLE news
ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITH TIME ZONE;

-- Create index on priority for faster sorting
CREATE INDEX IF NOT EXISTS idx_news_priority ON news(priority) WHERE is_published = false;

-- Create index on scheduled_publish_at for scheduled publishing
CREATE INDEX IF NOT EXISTS idx_news_scheduled ON news(scheduled_publish_at) WHERE is_published = false;

-- Comment columns
COMMENT ON COLUMN news.priority IS 'Publication priority: high, medium, or low';
COMMENT ON COLUMN news.scheduled_publish_at IS 'Scheduled publication timestamp';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'news'
AND column_name IN ('priority', 'scheduled_publish_at');
