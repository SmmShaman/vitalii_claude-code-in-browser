-- Add image_generation_prompt column to store AI-generated prompts for image generation
-- Users will copy this prompt to Google AI Studio (Gemini 3 Banana) to generate images

-- Add to news table
ALTER TABLE news
ADD COLUMN IF NOT EXISTS image_generation_prompt TEXT,
ADD COLUMN IF NOT EXISTS prompt_generated_at TIMESTAMPTZ;

-- Add to blog_posts table (for consistency)
ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS image_generation_prompt TEXT,
ADD COLUMN IF NOT EXISTS prompt_generated_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN news.image_generation_prompt IS 'AI-generated prompt for creating images in Google AI Studio (Gemini 3 Banana)';
COMMENT ON COLUMN news.prompt_generated_at IS 'Timestamp when image generation prompt was created';
COMMENT ON COLUMN blog_posts.image_generation_prompt IS 'AI-generated prompt for creating images in Google AI Studio (Gemini 3 Banana)';
COMMENT ON COLUMN blog_posts.prompt_generated_at IS 'Timestamp when image generation prompt was created';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_image_prompt ON news(image_generation_prompt) WHERE image_generation_prompt IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_image_prompt ON blog_posts(image_generation_prompt) WHERE image_generation_prompt IS NOT NULL;
