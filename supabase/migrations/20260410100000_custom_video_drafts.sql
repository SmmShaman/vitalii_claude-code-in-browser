-- Custom Video Drafts table
-- Stores state for on-demand video generation triggered via Telegram /video command

CREATE TABLE IF NOT EXISTS custom_video_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User request
  user_prompt TEXT NOT NULL,
  user_chat_id BIGINT NOT NULL,
  language TEXT DEFAULT 'en',
  video_style TEXT DEFAULT 'showcase',
  content_type TEXT DEFAULT 'portfolio',
  target_duration_seconds INT DEFAULT 90,
  format TEXT DEFAULT 'horizontal',

  -- Pipeline state
  -- Flow: analyzing → pending_script → pending_scenario → pending_images → rendering → completed / failed
  status TEXT NOT NULL DEFAULT 'analyzing',

  -- Content planning
  relevant_features JSONB DEFAULT '[]'::jsonb,
  relevant_articles JSONB DEFAULT '[]'::jsonb,
  web_research JSONB DEFAULT '[]'::jsonb,
  content_brief JSONB,

  -- Script
  intro_script TEXT,
  segment_scripts JSONB DEFAULT '[]'::jsonb,
  outro_script TEXT,

  -- Visual scenario
  visual_scenario JSONB,

  -- Media
  image_sources JSONB DEFAULT '{}'::jsonb,
  bgm_url TEXT,
  bgm_mood TEXT,
  bgm_local_file TEXT,

  -- Result
  github_run_id TEXT,
  youtube_video_id TEXT,
  youtube_url TEXT,
  youtube_title TEXT,
  youtube_description TEXT,
  youtube_tags TEXT[],

  -- Telegram
  telegram_message_ids BIGINT[] DEFAULT '{}',

  -- Settings
  llm_provider TEXT DEFAULT 'gemini',
  youtube_privacy TEXT DEFAULT 'unlisted',

  -- Error
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by status and chat
CREATE INDEX IF NOT EXISTS idx_custom_video_drafts_status ON custom_video_drafts (status);
CREATE INDEX IF NOT EXISTS idx_custom_video_drafts_chat ON custom_video_drafts (user_chat_id);
