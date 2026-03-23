-- Feature social media posts tracking table
-- Tracks which portfolio features have been published to which platform/language

CREATE TABLE IF NOT EXISTS feature_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram')),
  language TEXT NOT NULL CHECK (language IN ('en', 'no')),
  post_content TEXT,
  platform_post_id TEXT,
  platform_post_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed')),
  error_message TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate posts: one feature per platform per language
CREATE UNIQUE INDEX idx_feature_social_unique_active
  ON feature_social_posts (feature_id, platform, language)
  WHERE status IN ('pending', 'posted');

-- Fast lookup for next unpublished feature
CREATE INDEX idx_feature_social_status ON feature_social_posts (status, language);

-- RLS
ALTER TABLE feature_social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON feature_social_posts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Authenticated read" ON feature_social_posts
  FOR SELECT USING (auth.role() = 'authenticated');
