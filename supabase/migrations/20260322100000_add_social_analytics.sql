-- Add missing engagement columns to social_media_posts
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS impressions_count INTEGER DEFAULT 0;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS reach_count INTEGER DEFAULT 0;
ALTER TABLE social_media_posts ADD COLUMN IF NOT EXISTS saves_count INTEGER DEFAULT 0;

-- Create index for analytics queries on engagement metrics
CREATE INDEX IF NOT EXISTS idx_social_media_posts_impressions
  ON social_media_posts(impressions_count DESC) WHERE status = 'posted';

-- ============================================================
-- Follower history — one snapshot per platform per day
-- ============================================================
CREATE TABLE IF NOT EXISTS follower_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok')),
  follower_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, recorded_date)
);

CREATE INDEX IF NOT EXISTS idx_follower_history_platform_date
  ON follower_history(platform, recorded_date DESC);

ALTER TABLE follower_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view follower history"
  ON follower_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role has full access to follower history"
  ON follower_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Analytics snapshots — daily aggregated metrics per platform
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram', 'tiktok', 'all')),
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_posts INTEGER DEFAULT 0,
  total_impressions BIGINT DEFAULT 0,
  total_reach BIGINT DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  total_shares INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  avg_engagement_rate FLOAT DEFAULT 0,
  top_post_id UUID REFERENCES social_media_posts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_platform_date
  ON analytics_snapshots(platform, snapshot_date DESC);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view analytics snapshots"
  ON analytics_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role has full access to analytics snapshots"
  ON analytics_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);
