ALTER TABLE news_sources
ADD COLUMN skip_pre_moderation boolean NOT NULL DEFAULT false;
