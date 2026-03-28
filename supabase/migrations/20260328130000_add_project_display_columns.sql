-- Add display columns for dynamic project rendering
ALTER TABLE feature_projects
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS color_bg TEXT DEFAULT 'bg-gray-500/20',
  ADD COLUMN IF NOT EXISTS color_text TEXT DEFAULT 'text-gray-400';

-- Backfill existing projects with their display values
UPDATE feature_projects SET badge = 'P', color_bg = 'bg-emerald-500/20', color_text = 'text-emerald-400' WHERE id = 'portfolio';
UPDATE feature_projects SET badge = 'J', color_bg = 'bg-amber-500/20', color_text = 'text-amber-400' WHERE id = 'jobbot';
UPDATE feature_projects SET badge = 'C', color_bg = 'bg-blue-500/20', color_text = 'text-blue-400' WHERE id = 'calendar_bot';
UPDATE feature_projects SET badge = 'E', color_bg = 'bg-cyan-500/20', color_text = 'text-cyan-400' WHERE id = 'eyeplus';
UPDATE feature_projects SET badge = 'L', color_bg = 'bg-purple-500/20', color_text = 'text-purple-400' WHERE id = 'lingleverika';
UPDATE feature_projects SET badge = 'G', color_bg = 'bg-rose-500/20', color_text = 'text-rose-400' WHERE id = 'ghost_interviewer';
UPDATE feature_projects SET badge = 'Y', color_bg = 'bg-red-500/20', color_text = 'text-red-400' WHERE id = 'youtube_manager';
UPDATE feature_projects SET badge = 'E', color_bg = 'bg-yellow-500/20', color_text = 'text-yellow-400' WHERE id = 'elvarika';
