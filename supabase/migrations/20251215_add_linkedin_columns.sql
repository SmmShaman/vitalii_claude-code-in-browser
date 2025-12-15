-- Add LinkedIn integration columns to news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_language TEXT;

-- Add LinkedIn integration columns to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS linkedin_post_id TEXT,
ADD COLUMN IF NOT EXISTS linkedin_posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linkedin_language TEXT;

-- Add index for faster queries on LinkedIn posts
CREATE INDEX IF NOT EXISTS idx_news_linkedin_post_id ON news(linkedin_post_id) WHERE linkedin_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_linkedin_post_id ON blog_posts(linkedin_post_id) WHERE linkedin_post_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN news.linkedin_post_id IS 'LinkedIn post ID after publishing';
COMMENT ON COLUMN news.linkedin_posted_at IS 'Timestamp when posted to LinkedIn';
COMMENT ON COLUMN news.linkedin_language IS 'Language used for LinkedIn post (en/no/ua)';

COMMENT ON COLUMN blog_posts.linkedin_post_id IS 'LinkedIn post ID after publishing';
COMMENT ON COLUMN blog_posts.linkedin_posted_at IS 'Timestamp when posted to LinkedIn';
COMMENT ON COLUMN blog_posts.linkedin_language IS 'Language used for LinkedIn post (en/no/ua)';
