-- Social Media Accounts table
-- Stores OAuth credentials for each platform

CREATE TABLE IF NOT EXISTS social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok')),
  account_name TEXT,
  account_id TEXT, -- Platform-specific account/page ID
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  permissions TEXT[], -- Array of granted permissions
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}', -- Platform-specific metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, account_id)
);

-- Create indexes
CREATE INDEX idx_social_media_accounts_platform ON social_media_accounts(platform);
CREATE INDEX idx_social_media_accounts_active ON social_media_accounts(is_active);

-- Enable RLS
ALTER TABLE social_media_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only service role can access (contains sensitive tokens)
CREATE POLICY "Service role can manage social_media_accounts"
  ON social_media_accounts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_social_media_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_social_media_accounts_updated_at
  BEFORE UPDATE ON social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_accounts_updated_at();

-- Insert default LinkedIn account (placeholder - update with real values)
INSERT INTO social_media_accounts (platform, account_name, account_id, is_active)
VALUES ('linkedin', 'Vitalii Berbeha', 'placeholder', true)
ON CONFLICT (platform, account_id) DO NOTHING;

COMMENT ON TABLE social_media_accounts IS 'Stores OAuth credentials and account info for social media platforms';
