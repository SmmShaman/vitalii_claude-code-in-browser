-- Add auto_analyze column to news_monitor_settings
ALTER TABLE news_monitor_settings
ADD COLUMN IF NOT EXISTS auto_analyze BOOLEAN DEFAULT false;

-- Comment for documentation
COMMENT ON COLUMN news_monitor_settings.auto_analyze IS 'When enabled, automatically triggers AI analysis for new RSS articles and sends to Telegram bot for moderation';
