-- Community Subscriptions table
-- Stores monitored professional communities (LinkedIn Groups, Facebook Groups, etc.)

CREATE TABLE IF NOT EXISTS community_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook')),
  community_id TEXT NOT NULL, -- Group/Community ID on the platform
  community_name TEXT NOT NULL,
  community_url TEXT,
  community_description TEXT,
  member_count INTEGER,
  keywords TEXT[], -- Filter keywords for relevant posts
  exclude_keywords TEXT[], -- Keywords to exclude
  min_relevance_score FLOAT DEFAULT 0.5, -- Minimum score to notify (0-1)
  notification_frequency TEXT DEFAULT 'realtime' CHECK (notification_frequency IN ('realtime', 'daily', 'weekly')),
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_post_at TIMESTAMPTZ, -- Most recent post we've seen
  posts_checked_count INTEGER DEFAULT 0,
  posts_matched_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, community_id)
);

-- Create indexes
CREATE INDEX idx_community_subscriptions_platform ON community_subscriptions(platform);
CREATE INDEX idx_community_subscriptions_active ON community_subscriptions(is_active);
CREATE INDEX idx_community_subscriptions_last_checked ON community_subscriptions(last_checked_at);

-- Enable RLS
ALTER TABLE community_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read community_subscriptions"
  ON community_subscriptions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage community_subscriptions"
  ON community_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_community_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_community_subscriptions_updated_at
  BEFORE UPDATE ON community_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_community_subscriptions_updated_at();

-- Insert example subscriptions (commented out - add real ones later)
-- INSERT INTO community_subscriptions (platform, community_id, community_name, community_url, keywords)
-- VALUES
--   ('linkedin', 'ai-professionals', 'AI & Machine Learning Professionals', 'https://linkedin.com/groups/...', ARRAY['AI', 'machine learning', 'ChatGPT', 'automation']),
--   ('linkedin', 'digital-marketing', 'Digital Marketing Experts', 'https://linkedin.com/groups/...', ARRAY['marketing', 'e-commerce', 'SEO', 'analytics']);

COMMENT ON TABLE community_subscriptions IS 'Stores monitored professional communities for engagement opportunities';
