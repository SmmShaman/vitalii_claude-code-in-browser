-- Add RLS policy for authenticated users to read social_media_accounts
-- (tokens are stored in Supabase Secrets, not in this table)

-- Allow authenticated users to read accounts (for admin dashboard)
CREATE POLICY "Authenticated users can read social_media_accounts"
  ON social_media_accounts
  FOR SELECT
  TO authenticated
  USING (true);

-- Insert/update social media account records
-- These reference secrets stored in Supabase Edge Function Secrets

-- LinkedIn account
INSERT INTO social_media_accounts (platform, account_name, account_id, is_active, permissions, metadata)
VALUES (
  'linkedin',
  'Vitalii Berbeha',
  'urn:li:person:configured',
  true,
  ARRAY['w_member_social'],
  '{"note": "Access token stored in LINKEDIN_ACCESS_TOKEN secret", "person_urn": "stored in LINKEDIN_PERSON_URN secret"}'::jsonb
)
ON CONFLICT (platform, account_id) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  is_active = EXCLUDED.is_active,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Facebook Page account
INSERT INTO social_media_accounts (platform, account_name, account_id, is_active, permissions, metadata)
VALUES (
  'facebook',
  'Vitalii Berbeha Page',
  'page:configured',
  true,
  ARRAY['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
  '{"note": "Access token stored in FACEBOOK_PAGE_ACCESS_TOKEN secret", "page_id": "stored in FACEBOOK_PAGE_ID secret"}'::jsonb
)
ON CONFLICT (platform, account_id) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  is_active = EXCLUDED.is_active,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Instagram Business account (uses Facebook Page token)
INSERT INTO social_media_accounts (platform, account_name, account_id, is_active, permissions, metadata)
VALUES (
  'instagram',
  'Vitalii Berbeha',
  'ig:configured',
  true,
  ARRAY['instagram_basic', 'instagram_content_publish', 'instagram_manage_comments'],
  '{"note": "Uses FACEBOOK_PAGE_ACCESS_TOKEN secret", "account_id": "stored in INSTAGRAM_ACCOUNT_ID secret"}'::jsonb
)
ON CONFLICT (platform, account_id) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  is_active = EXCLUDED.is_active,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- TikTok (manual mode - no API keys needed)
INSERT INTO social_media_accounts (platform, account_name, account_id, is_active, permissions, metadata)
VALUES (
  'tiktok',
  'TikTok (Manual Mode)',
  'manual:configured',
  true,
  ARRAY[]::TEXT[],
  '{"note": "TikTok uses manual posting mode - content is generated but posted manually", "mode": "manual"}'::jsonb
)
ON CONFLICT (platform, account_id) DO UPDATE SET
  account_name = EXCLUDED.account_name,
  is_active = EXCLUDED.is_active,
  permissions = EXCLUDED.permissions,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

-- Remove old placeholder if exists
DELETE FROM social_media_accounts WHERE account_id = 'placeholder';
