-- News Monitor Settings table
CREATE TABLE IF NOT EXISTS news_monitor_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_interval INTEGER DEFAULT 300,
  articles_per_source INTEGER DEFAULT 5,
  auto_refresh BOOLEAN DEFAULT true,
  expanded_sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- News Monitor Sources table (RSS feeds for monitoring)
CREATE TABLE IF NOT EXISTS news_monitor_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT,
  rss_url TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for news_monitor_settings
ALTER TABLE news_monitor_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON news_monitor_settings;
CREATE POLICY "Users can view own settings" ON news_monitor_settings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own settings" ON news_monitor_settings;
CREATE POLICY "Users can insert own settings" ON news_monitor_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own settings" ON news_monitor_settings;
CREATE POLICY "Users can update own settings" ON news_monitor_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for news_monitor_sources
ALTER TABLE news_monitor_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sources" ON news_monitor_sources;
CREATE POLICY "Anyone can view sources" ON news_monitor_sources
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage sources" ON news_monitor_sources;
CREATE POLICY "Authenticated users can manage sources" ON news_monitor_sources
  FOR ALL USING (auth.role() = 'authenticated');

-- Updated_at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_news_monitor_settings_updated_at ON news_monitor_settings;
CREATE TRIGGER update_news_monitor_settings_updated_at
  BEFORE UPDATE ON news_monitor_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_monitor_sources_updated_at ON news_monitor_sources;
CREATE TRIGGER update_news_monitor_sources_updated_at
  BEFORE UPDATE ON news_monitor_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default sources (12 validated RSS feeds)
INSERT INTO news_monitor_sources (name, url, rss_url, tier, is_default) VALUES
  -- Tier 1 - Norwegian Government/Tax
  ('Skatteetaten', 'https://skatteetaten.no', 'https://www.skatteetaten.no/rss/presse/pressemeldinger/', 1, true),

  -- Tier 2 - Norwegian Tech Media
  ('Digi.no', 'https://digi.no', 'https://www.digi.no/rss', 2, true),
  ('E24', 'https://e24.no', 'https://e24.no/rss', 2, true),
  ('Kode24', 'https://kode24.no', 'https://rss.kode24.no/', 2, true),

  -- Tier 3 - Global Tech
  ('OpenAI Blog', 'https://openai.com/blog', 'https://openai.com/news/rss.xml', 3, true),
  ('n8n Blog', 'https://blog.n8n.io', 'https://blog.n8n.io/rss', 3, true),
  ('Supabase', 'https://supabase.com/blog', 'https://supabase.com/rss.xml', 3, true),
  ('Azure Blog', 'https://azure.microsoft.com/blog', 'https://azure.microsoft.com/en-us/blog/feed/', 3, true),
  ('Stripe Blog', 'https://stripe.com/blog', 'https://stripe.com/blog/feed.rss', 3, true),

  -- Tier 4 - Aggregators
  ('TechCrunch', 'https://techcrunch.com', 'https://www.techcrunch.com/feed/', 4, true),
  ('Hacker News', 'https://news.ycombinator.com', 'https://hnrss.org/frontpage?points=50', 4, true),
  ('TC Startups', 'https://techcrunch.com/startups', 'https://www.techcrunch.com/category/startups/feed/', 4, true)
ON CONFLICT DO NOTHING;
