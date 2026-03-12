-- Stream Mode Settings for Three-Stream Pipeline
-- STREAM_MODE: 'legacy' (auto-publish) or 'streams' (new 3-stream)

INSERT INTO api_settings (key_name, key_value, description, is_active) VALUES
  ('STREAM_MODE', 'legacy', 'Pipeline mode: legacy (full auto-publish) or streams (website + daily digest + top-3 social)', true),
  ('STREAM1_REWRITE_LANGUAGE', 'en', 'Rewrite language for Stream 1 website publish: en, no, smart (NO for Norway articles, EN for rest)', true),
  ('STREAM3_TOP_N', '3', 'Number of top articles to send for social media posting daily', true)
ON CONFLICT (key_name) DO NOTHING;
