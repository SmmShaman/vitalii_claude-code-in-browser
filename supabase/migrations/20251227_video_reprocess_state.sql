-- Create a table to track reprocessing progress
CREATE TABLE IF NOT EXISTS video_reprocess_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Only one row allowed
  current_offset INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ,
  total_processed INTEGER DEFAULT 0,
  total_success INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial state if not exists
INSERT INTO video_reprocess_state (id, current_offset)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE video_reprocess_state ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage
CREATE POLICY "Service role can manage video_reprocess_state"
  ON video_reprocess_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read state
CREATE POLICY "Authenticated users can view video_reprocess_state"
  ON video_reprocess_state
  FOR SELECT
  TO authenticated
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE video_reprocess_state IS 'Tracks progress of bulk video reprocessing from Telegram to YouTube';
