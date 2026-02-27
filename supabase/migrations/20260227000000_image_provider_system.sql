-- Image Provider System: tracking and mode switching
-- Enables cascading free providers with paid Gemini fallback

-- 1. Usage tracking per provider per day
CREATE TABLE IF NOT EXISTS image_provider_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL,
  model_name TEXT NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_name, usage_date)
);

-- 2. Track which provider/model generated each news image
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_model_used TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS image_provider_used TEXT;

-- 3. Default mode: gemini_only (preserves current behavior)
INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES ('IMAGE_GENERATION_MODE', 'gemini_only', 'Image generation mode: gemini_only or cascading', true)
ON CONFLICT (key_name) DO NOTHING;
