-- Add telegram_message_text column to store the original bot message
-- This is needed for GitHub Actions scripts to preserve original content when editing messages

ALTER TABLE news ADD COLUMN IF NOT EXISTS telegram_message_text TEXT;

COMMENT ON COLUMN news.telegram_message_text IS 'Stores the original Telegram bot message text for editing';
