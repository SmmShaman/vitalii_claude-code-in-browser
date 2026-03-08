ALTER TABLE daily_video_drafts
ADD COLUMN IF NOT EXISTS excluded_article_ids UUID[] DEFAULT '{}';
