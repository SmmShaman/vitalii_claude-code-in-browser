-- Add global pre-moderation toggle setting
-- This allows enabling/disabling AI pre-moderation via Admin Dashboard

INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES (
  'ENABLE_PRE_MODERATION',
  'true',
  'Global toggle for enabling/disabling AI pre-moderation of news. When disabled, all scraped posts are auto-approved.',
  true
)
ON CONFLICT (key_name) DO UPDATE SET
  description = EXCLUDED.description;
