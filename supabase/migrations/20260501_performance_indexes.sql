-- Performance indexes for commonly filtered/sorted columns
CREATE INDEX IF NOT EXISTS idx_news_moderation_status
  ON news(pre_moderation_status)
  WHERE pre_moderation_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_news_created_at
  ON news(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_source_type
  ON news(source_type);

CREATE INDEX IF NOT EXISTS idx_social_posts_status
  ON social_media_posts(status);

CREATE INDEX IF NOT EXISTS idx_social_posts_platform
  ON social_media_posts(platform);

CREATE INDEX IF NOT EXISTS idx_social_posts_content
  ON social_media_posts(content_type, content_id);
