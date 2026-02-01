-- Add images_with_meta field for storing image metadata with copyright info
-- This stores an array of objects with url, alt, title, credit, caption, source

-- For news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS images_with_meta JSONB DEFAULT '[]';

-- For blog_posts table
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS images_with_meta JSONB DEFAULT '[]';

-- Comments for documentation
COMMENT ON COLUMN news.images_with_meta IS 'Array of image objects with metadata for copyright compliance: [{url, alt, title, credit, caption, source}]';
COMMENT ON COLUMN blog_posts.images_with_meta IS 'Array of image objects with metadata for copyright compliance: [{url, alt, title, credit, caption, source}]';

-- Create index for searching by image credit/author
CREATE INDEX IF NOT EXISTS idx_news_images_credit ON news USING GIN (images_with_meta);
CREATE INDEX IF NOT EXISTS idx_blog_posts_images_credit ON blog_posts USING GIN (images_with_meta);
