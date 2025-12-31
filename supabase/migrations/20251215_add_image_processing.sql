-- Add columns for processed images
ALTER TABLE news
ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMPTZ;

ALTER TABLE blog_posts
ADD COLUMN IF NOT EXISTS processed_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_processed_at TIMESTAMPTZ;

-- Add image processing prompts to ai_prompts table (for Gemini Nano Banana)
INSERT INTO ai_prompts (name, prompt_type, prompt_text, description, is_active)
VALUES
  ('LinkedIn Image Optimizer',
   'image_linkedin_optimize',
   'Edit this image to make it perfect for LinkedIn:
- Enhance professional appearance with better lighting and contrast
- Make colors vibrant but professional (not oversaturated)
- Ensure the image looks great as a 1200x627 social media thumbnail
- Keep the original subject intact, just improve quality
- Add subtle professional polish without changing the content
Output a high-quality edited version of this image.',
   'Промпт для оптимізації зображень перед публікацією в LinkedIn (використовує Gemini)',
   true),
  ('Image Enhancer',
   'image_enhance',
   'Enhance this image:
- Improve clarity and sharpness
- Adjust brightness and contrast for better visibility
- Enhance colors while maintaining natural appearance
- Remove noise or artifacts if present
- Keep the original composition and subject
Output an enhanced high-quality version.',
   'Загальний промпт для покращення якості зображень',
   true)
ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description;
