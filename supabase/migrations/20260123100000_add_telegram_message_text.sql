-- Migration: Add telegram_message_text to news table
-- Purpose: Store message text for editing original message after video processing completes via GitHub Actions
-- (instead of creating new messages)

-- Add column to store the Telegram message text
ALTER TABLE news ADD COLUMN IF NOT EXISTS telegram_message_text TEXT;

-- Add comment for documentation
COMMENT ON COLUMN news.telegram_message_text IS 'Stored message text for editing after video processing completes';
