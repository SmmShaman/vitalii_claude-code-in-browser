-- Add images array field to news table for multiple images support
ALTER TABLE news
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Add images array field to blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN news.images IS 'Array of image URLs from Telegram post (multiple images support)';
COMMENT ON COLUMN blog_posts.images IS 'Array of image URLs (copied from source news)';
