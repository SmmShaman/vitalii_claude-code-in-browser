-- Create settings table for API keys and configuration
CREATE TABLE IF NOT EXISTS api_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name TEXT UNIQUE NOT NULL,
  key_value TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE api_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read (admin check should be done in application)
CREATE POLICY "Authenticated users can read settings"
  ON api_settings FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update (from edge functions)
CREATE POLICY "Service role can manage settings"
  ON api_settings FOR ALL
  TO service_role
  USING (true);

-- Insert default settings
INSERT INTO api_settings (key_name, key_value, description, is_active)
VALUES
  ('GOOGLE_API_KEY', NULL, 'Google API Key for Gemini image processing (Nano Banana)', true),
  ('LINKEDIN_ACCESS_TOKEN', NULL, 'LinkedIn OAuth2 Access Token for posting', true),
  ('LINKEDIN_PERSON_URN', NULL, 'LinkedIn Person URN (format: urn:li:person:xxxxx)', true)
ON CONFLICT (key_name) DO NOTHING;

-- Add comment
COMMENT ON TABLE api_settings IS 'Stores API keys and configuration for external services';
