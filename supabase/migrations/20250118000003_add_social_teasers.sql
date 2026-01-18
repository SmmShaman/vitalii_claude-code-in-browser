-- Migration: Add social media teaser fields for unique platform-specific content
-- Date: 2025-01-18
-- Purpose: Store AI-generated unique teasers for LinkedIn, Facebook, Instagram, Twitter

-- Teasers for news table (3 languages × 4 platforms = 12 fields)
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_linkedin_en TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_linkedin_no TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_linkedin_ua TEXT;

ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_facebook_en TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_facebook_no TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_facebook_ua TEXT;

ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_instagram_en TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_instagram_no TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_instagram_ua TEXT;

ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_twitter_en TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_twitter_no TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS social_teaser_twitter_ua TEXT;

ALTER TABLE news ADD COLUMN IF NOT EXISTS teasers_generated_at TIMESTAMPTZ;

-- Teasers for blog_posts table (same structure)
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_linkedin_en TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_linkedin_no TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_linkedin_ua TEXT;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_facebook_en TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_facebook_no TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_facebook_ua TEXT;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_instagram_en TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_instagram_no TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_instagram_ua TEXT;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_twitter_en TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_twitter_no TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS social_teaser_twitter_ua TEXT;

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS teasers_generated_at TIMESTAMPTZ;

-- Add indexes for faster queries when fetching teasers
CREATE INDEX IF NOT EXISTS idx_news_teasers_generated ON news(teasers_generated_at) WHERE teasers_generated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_blog_posts_teasers_generated ON blog_posts(teasers_generated_at) WHERE teasers_generated_at IS NOT NULL;

COMMENT ON COLUMN news.social_teaser_linkedin_en IS 'AI-generated professional teaser for LinkedIn (English)';
COMMENT ON COLUMN news.social_teaser_facebook_en IS 'AI-generated friendly teaser for Facebook (English)';
COMMENT ON COLUMN news.social_teaser_instagram_en IS 'AI-generated visual teaser with hashtags for Instagram (English)';
COMMENT ON COLUMN news.social_teaser_twitter_en IS 'AI-generated short provocative teaser for Twitter/X (English)';
COMMENT ON COLUMN news.teasers_generated_at IS 'Timestamp when social teasers were generated';
