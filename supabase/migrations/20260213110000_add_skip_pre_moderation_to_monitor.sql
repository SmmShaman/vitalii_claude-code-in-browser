ALTER TABLE news_monitor_sources
ADD COLUMN IF NOT EXISTS skip_pre_moderation BOOLEAN NOT NULL DEFAULT false;
