-- Social Media Posts table
-- Tracks all posts across platforms (centralizes LinkedIn data + adds new platforms)

CREATE TABLE IF NOT EXISTS social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('news', 'blog')),
  content_id UUID NOT NULL, -- FK to news.id or blog_posts.id
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok')),
  platform_post_id TEXT, -- Post ID on the platform
  platform_post_url TEXT, -- Direct URL to the post
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'no', 'ua')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'scheduled')),
  error_message TEXT, -- Store error if failed
  post_content TEXT, -- The actual content that was posted
  media_urls TEXT[], -- Array of media URLs used
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  engagement_rate FLOAT, -- Calculated engagement rate
  posted_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ, -- When stats were last updated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_social_media_posts_content ON social_media_posts(content_type, content_id);
CREATE INDEX idx_social_media_posts_platform ON social_media_posts(platform);
CREATE INDEX idx_social_media_posts_status ON social_media_posts(status);
CREATE INDEX idx_social_media_posts_posted_at ON social_media_posts(posted_at DESC);
CREATE INDEX idx_social_media_posts_platform_post_id ON social_media_posts(platform, platform_post_id);

-- Enable RLS
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read social_media_posts"
  ON social_media_posts
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage social_media_posts"
  ON social_media_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_social_media_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_social_media_posts_updated_at
  BEFORE UPDATE ON social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_social_media_posts_updated_at();

-- Migrate existing LinkedIn posts from news table
INSERT INTO social_media_posts (content_type, content_id, platform, platform_post_id, language, status, posted_at, created_at)
SELECT
  'news',
  id,
  'linkedin',
  linkedin_post_id,
  COALESCE(linkedin_language, 'en'),
  'posted',
  linkedin_posted_at,
  linkedin_posted_at
FROM news
WHERE linkedin_post_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Migrate existing LinkedIn posts from blog_posts table
INSERT INTO social_media_posts (content_type, content_id, platform, platform_post_id, language, status, posted_at, created_at)
SELECT
  'blog',
  id,
  'linkedin',
  linkedin_post_id,
  COALESCE(linkedin_language, 'en'),
  'posted',
  linkedin_posted_at,
  linkedin_posted_at
FROM blog_posts
WHERE linkedin_post_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON TABLE social_media_posts IS 'Tracks all social media posts across platforms with engagement metrics';
