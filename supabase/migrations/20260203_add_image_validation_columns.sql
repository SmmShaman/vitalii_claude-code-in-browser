-- Add columns for image validation (Critic Agent)
-- These track image quality scores and validation issues for auto-retry

-- Add image_quality_score column (1-10 scale from Critic Agent)
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_quality_score INTEGER;

-- Add image_validation_issues column (array of issues found)
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_validation_issues TEXT[];

-- Add image_retry_count column (tracks retry attempts, max 3)
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_retry_count INTEGER DEFAULT 0;

-- Add critic prompt for image validation
INSERT INTO ai_prompts (name, prompt_type, prompt_text, description, is_active, created_at, updated_at)
VALUES (
  'Image Critic',
  'image_critic',
  'You are an expert image quality critic for a professional news website.
Analyze the generated image and evaluate it against the original requirements.

Evaluate the following criteria:

1. RELEVANCE (1-10): How well does the image match the news topic and original prompt?
   - Does it visually represent the key concepts?
   - Is the subject matter appropriate for the news category?

2. QUALITY (1-10): Overall visual quality assessment
   - Sharpness and clarity
   - Color vibrancy and contrast
   - Professional appearance
   - No visual artifacts or distortions

3. BRANDING (true/false): Is "vitalii.no" watermark visible?
   - Should appear subtly at the bottom corner

4. ARTIFACTS: List any visual problems
   - Distorted elements
   - Unnatural textures
   - Blurry areas
   - Color banding

5. TEXT_ISSUES: Problems with text rendering (if applicable)
   - Wrong language
   - Incorrect date
   - Illegible text
   - Misspellings

Respond with ONLY valid JSON (no markdown, no explanations):
{
  "relevance": <1-10>,
  "quality": <1-10>,
  "branding": <true/false>,
  "artifacts": ["list of issues"],
  "text_issues": ["list of issues"],
  "overall_score": <1-10>,
  "should_retry": <true/false>,
  "improvement_suggestions": ["list of suggestions"]
}',
  'Critic Agent prompt for validating generated images - checks relevance, quality, branding, and artifacts',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (prompt_type) WHERE is_active = true
DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Comment on columns for documentation
COMMENT ON COLUMN news.image_quality_score IS 'Quality score (1-10) from Critic Agent validation';
COMMENT ON COLUMN news.image_validation_issues IS 'Array of issues found during image validation';
COMMENT ON COLUMN news.image_retry_count IS 'Number of image generation retry attempts (max 3)';
