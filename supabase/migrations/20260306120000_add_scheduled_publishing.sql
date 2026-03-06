-- Scheduled Publishing Queue: new columns on news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;
ALTER TABLE news ADD COLUMN IF NOT EXISTS content_weight TEXT DEFAULT 'light';
ALTER TABLE news ADD COLUMN IF NOT EXISTS preset_config JSONB;
ALTER TABLE news ADD COLUMN IF NOT EXISTS schedule_window TEXT;

-- Index for scheduler queries (scheduled articles ordered by time)
CREATE INDEX IF NOT EXISTS idx_news_scheduled_publish
  ON news (scheduled_publish_at ASC)
  WHERE auto_publish_status = 'scheduled';

-- Schedule config in api_settings
INSERT INTO api_settings (key_name, key_value, description, is_active) VALUES
  ('PUBLISH_SCHEDULE_ENABLED', 'true', 'Enable scheduled publishing queue', true),
  ('PUBLISH_SCHEDULE_WINDOWS', '{"windows":[{"id":"morning","start":"08:00","end":"10:00","types":["heavy","light"],"label":"Ранок"},{"id":"afternoon","start":"17:00","end":"18:00","types":["light"],"label":"День"},{"id":"evening","start":"20:00","end":"22:00","types":["light"],"label":"Вечір"}]}', 'Publishing windows config (Oslo time)', true),
  ('PUBLISH_SCHEDULE_SLOT_MINUTES', '7', 'Minutes between scheduled articles', true),
  ('PUBLISH_SCHEDULE_MAX_PER_DAY', '20', 'Max articles per day via scheduler', true)
ON CONFLICT (key_name) DO UPDATE SET key_value = EXCLUDED.key_value, description = EXCLUDED.description;
