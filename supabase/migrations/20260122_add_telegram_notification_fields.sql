-- Migration: Add telegram_chat_id and telegram_message_id to news table
-- Purpose: Store Telegram bot message info for sending notifications after GitHub Actions complete

-- Add columns to store Telegram message context
ALTER TABLE news ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT;

-- Add comment for documentation
COMMENT ON COLUMN news.telegram_chat_id IS 'Telegram chat ID where the moderation message was sent';
COMMENT ON COLUMN news.telegram_message_id IS 'Telegram message ID of the moderation message for replies/edits';

-- Create index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_news_telegram_message ON news(telegram_chat_id, telegram_message_id) WHERE telegram_chat_id IS NOT NULL;
