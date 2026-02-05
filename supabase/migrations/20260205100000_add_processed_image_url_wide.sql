-- Add processed_image_url_wide column for 16:9 format images
-- Used for LinkedIn and Facebook where 16:9 aspect ratio is optimal

-- Add to news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS processed_image_url_wide TEXT;

-- Add to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS processed_image_url_wide TEXT;

-- Add comments for documentation
COMMENT ON COLUMN news.processed_image_url_wide IS 'URL of AI-processed/generated image in 16:9 format for LinkedIn/Facebook';
COMMENT ON COLUMN blog_posts.processed_image_url_wide IS 'URL of AI-processed/generated image in 16:9 format for LinkedIn/Facebook';

-- Create index for faster queries on wide processed images
CREATE INDEX IF NOT EXISTS idx_news_processed_image_wide ON news(processed_image_url_wide) WHERE processed_image_url_wide IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_processed_image_wide ON blog_posts(processed_image_url_wide) WHERE processed_image_url_wide IS NOT NULL;
