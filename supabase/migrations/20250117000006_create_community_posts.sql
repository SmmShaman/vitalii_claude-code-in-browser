-- Community Posts table
-- Stores posts from monitored communities that match our keywords

CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES community_subscriptions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook')),
  platform_post_id TEXT NOT NULL, -- Post ID on the platform
  post_url TEXT,
  author_name TEXT,
  author_username TEXT,
  author_profile_url TEXT,
  author_headline TEXT, -- For LinkedIn
  post_text TEXT NOT NULL,
  post_type TEXT, -- 'text', 'image', 'video', 'article', 'poll'
  media_urls TEXT[],
  matched_keywords TEXT[], -- Which keywords triggered the match
  relevance_score FLOAT, -- 0-1 relevance score
  ai_analysis TEXT, -- AI analysis of why this is relevant
  suggested_comment TEXT, -- AI-generated engagement comment
  suggested_comment_generated_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_engaged BOOLEAN DEFAULT false, -- If we commented/liked
  engagement_type TEXT, -- 'comment', 'like', 'share', null
  engagement_platform_id TEXT, -- ID of our comment/reaction
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  post_created_at TIMESTAMPTZ, -- When post was created on platform
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_post_id)
);

-- Create indexes
CREATE INDEX idx_community_posts_subscription ON community_posts(subscription_id);
CREATE INDEX idx_community_posts_platform ON community_posts(platform);
CREATE INDEX idx_community_posts_unread ON community_posts(is_read) WHERE is_read = false;
CREATE INDEX idx_community_posts_unengaged ON community_posts(is_engaged) WHERE is_engaged = false;
CREATE INDEX idx_community_posts_relevance ON community_posts(relevance_score DESC);
CREATE INDEX idx_community_posts_created_at ON community_posts(post_created_at DESC);

-- Enable RLS
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read community_posts"
  ON community_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage community_posts"
  ON community_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE community_posts IS 'Stores relevant posts from monitored communities for professional engagement';
