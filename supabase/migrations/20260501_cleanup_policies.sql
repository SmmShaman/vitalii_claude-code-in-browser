-- Set default value for news.pre_moderation_status if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'pre_moderation_status'
  ) THEN
    ALTER TABLE news
      ALTER COLUMN pre_moderation_status SET DEFAULT 'pending';
  END IF;
END $$;

-- Cleanup function for old social media comments
CREATE OR REPLACE FUNCTION cleanup_old_social_comments()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'social_media_comments'
  ) THEN
    DELETE FROM social_media_comments
    WHERE last_synced_at < NOW() - INTERVAL '90 days';
  END IF;
END;
$$;
