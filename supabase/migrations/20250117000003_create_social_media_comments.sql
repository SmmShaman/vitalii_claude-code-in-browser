-- Social Media Comments table
-- Stores comments from all platforms for monitoring and response

CREATE TABLE IF NOT EXISTS social_media_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  social_post_id UUID REFERENCES social_media_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram')),
  platform_comment_id TEXT NOT NULL, -- Comment ID on the platform
  parent_comment_id UUID REFERENCES social_media_comments(id), -- For threaded replies
  author_name TEXT,
  author_username TEXT,
  author_profile_url TEXT,
  author_avatar_url TEXT,
  comment_text TEXT NOT NULL,
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'question', 'spam')),
  sentiment_score FLOAT, -- -1 to 1 score
  ai_summary TEXT, -- Brief AI summary of the comment
  suggested_reply TEXT, -- AI-generated reply suggestion
  suggested_reply_generated_at TIMESTAMPTZ,
  is_read BOOLEAN DEFAULT false,
  is_replied BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false, -- If we hide spam/inappropriate
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  language TEXT, -- Detected language
  comment_created_at TIMESTAMPTZ, -- When comment was created on platform
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, platform_comment_id)
);

-- Create indexes
CREATE INDEX idx_social_media_comments_post ON social_media_comments(social_post_id);
CREATE INDEX idx_social_media_comments_platform ON social_media_comments(platform);
CREATE INDEX idx_social_media_comments_unread ON social_media_comments(is_read) WHERE is_read = false;
CREATE INDEX idx_social_media_comments_unreplied ON social_media_comments(is_replied) WHERE is_replied = false;
CREATE INDEX idx_social_media_comments_sentiment ON social_media_comments(sentiment);
CREATE INDEX idx_social_media_comments_synced_at ON social_media_comments(synced_at DESC);
CREATE INDEX idx_social_media_comments_created_at ON social_media_comments(comment_created_at DESC);

-- Enable RLS
ALTER TABLE social_media_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read social_media_comments"
  ON social_media_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage social_media_comments"
  ON social_media_comments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE social_media_comments IS 'Stores comments from social media platforms with AI analysis for monitoring and response';
