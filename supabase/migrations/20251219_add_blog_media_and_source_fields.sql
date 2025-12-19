-- Add video and source tracking fields to blog_posts table
-- This allows blog posts to inherit video and source link from original news

-- Add video support fields (matching news table structure)
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS video_type TEXT;

-- Add source tracking fields
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS original_url TEXT,
ADD COLUMN IF NOT EXISTS source_news_id UUID REFERENCES news(id) ON DELETE SET NULL;

-- Add source link field to news (for links extracted from Telegram post content)
ALTER TABLE news
ADD COLUMN IF NOT EXISTS source_link TEXT;

-- Add check constraint for video_type
ALTER TABLE blog_posts
ADD CONSTRAINT check_blog_video_type
CHECK (video_type IS NULL OR video_type IN ('telegram_embed', 'direct_url', 'iframe', 'youtube'));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_video_url ON blog_posts(video_url) WHERE video_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_source_news_id ON blog_posts(source_news_id) WHERE source_news_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_source_link ON news(source_link) WHERE source_link IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN blog_posts.video_url IS 'URL to embedded video (inherited from news or direct upload)';
COMMENT ON COLUMN blog_posts.video_type IS 'Type of video embed: telegram_embed, direct_url, iframe, youtube';
COMMENT ON COLUMN blog_posts.original_url IS 'URL to original source article';
COMMENT ON COLUMN blog_posts.source_news_id IS 'Reference to the original news item this blog post was created from';
COMMENT ON COLUMN news.source_link IS 'External source link extracted from Telegram post content (not the Telegram post URL itself)';
