-- Add source_links array column to store ALL external links from Telegram posts
-- This allows storing multiple resource links (e.g., GitHub, HuggingFace, API docs)

ALTER TABLE news ADD COLUMN IF NOT EXISTS source_links TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN news.source_links IS 'Array of all external source links extracted from the Telegram post';

-- Also add to blog_posts for consistency
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS source_links TEXT[];

COMMENT ON COLUMN blog_posts.source_links IS 'Array of all external source links from the original content';
