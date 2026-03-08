-- Daily Video Drafts: 3-step Telegram approval flow for daily news videos
-- Step 1: Digest approval → Step 2: Script approval → Step 3: Visual scenario → Render

CREATE TABLE IF NOT EXISTS daily_video_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending_digest',
  -- Step 1: Article digest
  article_ids UUID[] DEFAULT '{}',
  article_headlines JSONB DEFAULT '[]',
  -- Step 2: Voiceover scripts (per-article)
  intro_script TEXT,
  segment_scripts JSONB DEFAULT '[]',
  outro_script TEXT,
  -- Step 3: Visual scenario (Remotion props)
  visual_scenario JSONB,
  visual_scenario_text TEXT,
  -- Result
  github_run_id TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  -- Telegram
  telegram_chat_id BIGINT,
  telegram_message_ids BIGINT[] DEFAULT '{}',
  -- Settings
  language TEXT DEFAULT 'no',
  format TEXT DEFAULT 'horizontal',
  -- Meta
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status values:
-- pending_digest    → waiting for digest approval
-- pending_script    → digest approved, generating/waiting for script approval
-- pending_scenario  → script approved, generating/waiting for scenario approval
-- rendering         → scenario approved, GitHub Actions rendering
-- completed         → video uploaded to YouTube
-- skipped           → user skipped this day
-- failed            → error occurred

COMMENT ON TABLE daily_video_drafts IS 'Daily video pipeline drafts with 3-step Telegram approval flow';

-- Enable RLS
ALTER TABLE daily_video_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage daily_video_drafts"
  ON daily_video_drafts FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can view daily_video_drafts"
  ON daily_video_drafts FOR SELECT TO authenticated USING (true);

-- Index for date lookup
CREATE INDEX IF NOT EXISTS idx_daily_video_drafts_date
  ON daily_video_drafts (target_date DESC);

-- Index for pending drafts
CREATE INDEX IF NOT EXISTS idx_daily_video_drafts_status
  ON daily_video_drafts (status)
  WHERE status NOT IN ('completed', 'skipped', 'failed');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_daily_video_drafts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_daily_video_drafts_updated ON daily_video_drafts;
CREATE TRIGGER trg_daily_video_drafts_updated
  BEFORE UPDATE ON daily_video_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_video_drafts_updated_at();
