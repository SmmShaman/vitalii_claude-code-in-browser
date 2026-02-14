-- Add auto-publish pipeline settings and tracking
-- Enables fully automated news publishing without moderator intervention

-- 1. Global toggle for auto-publish
INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES (
  'ENABLE_AUTO_PUBLISH',
  'false',
  'Global toggle for fully automated news publishing. When enabled, approved news is auto-published with AI-generated images and posted to all social media platforms without moderator review.',
  true
)
ON CONFLICT (key_name) DO UPDATE SET
  description = EXCLUDED.description;

-- 2. Platforms config (comma-separated)
INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES (
  'AUTO_PUBLISH_PLATFORMS',
  'linkedin,facebook,instagram',
  'Comma-separated list of social media platforms for auto-publishing. Options: linkedin, facebook, instagram',
  true
)
ON CONFLICT (key_name) DO UPDATE SET
  description = EXCLUDED.description;

-- 3. Languages config (comma-separated)
INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES (
  'AUTO_PUBLISH_LANGUAGES',
  'en,no,ua',
  'Comma-separated list of languages for auto-publishing images and social posts. Options: en, no, ua',
  true
)
ON CONFLICT (key_name) DO UPDATE SET
  description = EXCLUDED.description;

-- 4. Add pipeline tracking columns to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_publish_status TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_publish_started_at TIMESTAMPTZ;
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_publish_completed_at TIMESTAMPTZ;
ALTER TABLE news ADD COLUMN IF NOT EXISTS auto_publish_error TEXT;

-- 5. Seed AI prompt for automatic variant selection
INSERT INTO ai_prompts (name, prompt_type, prompt_text, is_active, usage_count)
VALUES (
  'Auto-select Best Image Variant',
  'image_variant_auto_select',
  'You are an expert visual editor for a professional news website (vitalii.no).

Given these image concept variants for a news article, select the BEST one for professional social media publishing.

ARTICLE TITLE: {title}
ARTICLE CONTENT (excerpt): {content}

IMAGE VARIANTS:
{variants}

SELECTION CRITERIA:
1. Visual impact - which concept would grab attention on LinkedIn/Instagram
2. Relevance - how well the visual represents the article topic
3. Professionalism - suitable for a tech/business news website
4. Uniqueness - avoids cliché or generic stock-photo concepts
5. Social media appeal - which would get the most engagement

Respond with ONLY valid JSON:
{
  "selected_index": <1-4>,
  "reason": "Brief explanation of why this variant is best"
}',
  true,
  0
)
ON CONFLICT DO NOTHING;

-- 6. Grant permissions
GRANT ALL ON api_settings TO authenticated;
GRANT ALL ON api_settings TO service_role;
