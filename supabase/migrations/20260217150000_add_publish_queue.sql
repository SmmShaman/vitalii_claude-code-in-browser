-- Add queued_at timestamp for sequential publish queue
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_publish_queued_at TIMESTAMPTZ;

-- Partial index for efficient queue lookups
CREATE INDEX IF NOT EXISTS idx_news_auto_publish_queue
  ON news (auto_publish_queued_at ASC)
  WHERE auto_publish_status = 'queued';
