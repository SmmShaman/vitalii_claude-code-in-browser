-- Comment Replies table
-- Tracks our replies to comments across platforms

CREATE TABLE IF NOT EXISTS comment_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES social_media_comments(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL, -- The actual reply that was sent
  ai_generated_text TEXT, -- Original AI suggestion (before editing)
  was_edited BOOLEAN DEFAULT false, -- If user edited the AI suggestion
  edit_distance INTEGER, -- Levenshtein distance from AI to final (optional metric)
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'instagram')),
  platform_reply_id TEXT, -- Reply ID on the platform
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error_message TEXT, -- Store error if failed
  sent_via TEXT DEFAULT 'bot' CHECK (sent_via IN ('bot', 'manual', 'admin')), -- How was it sent
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_comment_replies_comment ON comment_replies(comment_id);
CREATE INDEX idx_comment_replies_status ON comment_replies(status);
CREATE INDEX idx_comment_replies_platform ON comment_replies(platform);
CREATE INDEX idx_comment_replies_sent_at ON comment_replies(sent_at DESC);

-- Enable RLS
ALTER TABLE comment_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can read comment_replies"
  ON comment_replies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage comment_replies"
  ON comment_replies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE comment_replies IS 'Tracks our replies to social media comments with AI suggestion tracking';
