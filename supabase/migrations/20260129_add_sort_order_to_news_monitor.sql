-- Add sort_order column to news_monitor_sources for drag & drop ordering
ALTER TABLE news_monitor_sources
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort order based on existing name order within each tier
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tier ORDER BY name) as rn
  FROM news_monitor_sources
)
UPDATE news_monitor_sources
SET sort_order = numbered.rn
FROM numbered
WHERE news_monitor_sources.id = numbered.id;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_news_monitor_sources_tier_sort
ON news_monitor_sources(tier, sort_order);
