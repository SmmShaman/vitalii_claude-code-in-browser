-- Add columns for processed images
ALTER TABLE news
ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMPTZ;

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMPTZ;

-- Add image processing prompts to ai_prompts table
INSERT INTO ai_prompts (prompt_type, prompt_text, description, is_active)
VALUES
  ('image_linkedin_optimize',
   'Optimize this image for LinkedIn professional network: ensure sharp focus, professional color grading, good contrast ratio. Make it visually appealing as a social media thumbnail. Maintain the original subject but enhance overall quality.',
   'Prompt for optimizing images before LinkedIn posting',
   true),
  ('image_enhance',
   'Enhance this image: improve clarity and sharpness, adjust brightness and contrast for better visibility, enhance colors while maintaining natural appearance. Remove noise if present.',
   'General image enhancement prompt',
   true)
ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description;
