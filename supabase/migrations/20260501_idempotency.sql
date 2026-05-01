-- Table to track processed Telegram messages and prevent duplicate posts
CREATE TABLE IF NOT EXISTS processed_telegram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text UNIQUE NOT NULL,
  processed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_cleanup
  ON processed_telegram_messages(processed_at);

-- Auto-cleanup function for messages older than 7 days
CREATE OR REPLACE FUNCTION cleanup_processed_messages()
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM processed_telegram_messages
  WHERE processed_at < NOW() - INTERVAL '7 days';
END;
$$;
