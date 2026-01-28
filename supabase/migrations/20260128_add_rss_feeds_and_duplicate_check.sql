-- Migration: Add new RSS feeds and duplicate check function
-- Date: 2026-01-28
-- Description: Adds 11 new validated RSS feeds and database function for duplicate checking

-- ============================================
-- Part 1: Database function for duplicate check
-- ============================================

-- Function to check if RSS article already exists
CREATE OR REPLACE FUNCTION check_rss_article_exists(article_url TEXT)
RETURNS TABLE (
  article_exists BOOLEAN,
  news_id UUID,
  telegram_message_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE as article_exists,
    n.id as news_id,
    n.telegram_message_id
  FROM news n
  WHERE n.rss_source_url = article_url
     OR n.original_url = article_url
  LIMIT 1;

  -- If nothing found, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Part 2: Insert new RSS feeds into news_monitor_sources
-- ============================================

-- Tier 1 - Norwegian Government (+8 new feeds)
INSERT INTO news_monitor_sources (name, url, rss_url, tier, is_active, is_default)
VALUES
  ('Skatteetaten Uttalelser', 'https://www.skatteetaten.no/rettskilder/uttalelser/', 'https://www.skatteetaten.no/rss/rettskilder/uttalelser/', 1, true, true),
  ('Skatteetaten A-meldingen (endringer)', 'https://www.skatteetaten.no/bedrift/arbeidsgiver/a-meldingen/endringer-i-veiledningen/', 'https://www.skatteetaten.no/rss/bedrift/arbeidsgiver/a-meldingen/endringer-i-veiledningen/', 1, true, true),
  ('Skatteetaten A-meldingen (nyheter)', 'https://www.skatteetaten.no/bedrift/arbeidsgiver/a-meldingen/', 'https://www.skatteetaten.no/rss/bedrift/arbeidsgiver/a-meldingen/siste-fra-a-ordningen/', 1, true, true),
  ('Skatteetaten Skattekalender (bedrift)', 'https://www.skatteetaten.no/skattekalender-for-bedrift/', 'https://www.skatteetaten.no/rss/skattekalender-for-bedrift/', 1, true, true),
  ('Skatteetaten Skattekalender (person)', 'https://www.skatteetaten.no/skattekalender-for-person/', 'https://www.skatteetaten.no/rss/skattekalender-for-person/', 1, true, true),
  ('Finanstilsynet', 'https://www.finanstilsynet.no/', 'https://www.finanstilsynet.no/rss/', 1, true, true),
  ('Sodir (Offshore)', 'https://www.sodir.no/en/whats-new/news/', 'https://www.sodir.no/en/whats-new/news/rss/', 1, true, true),
  ('Regjeringen.no', 'https://www.regjeringen.no/', 'https://www.regjeringen.no/no/rss/id2000900/', 1, true, true)
ON CONFLICT DO NOTHING;

-- Tier 2 - Norwegian Business (+2 new feeds)
INSERT INTO news_monitor_sources (name, url, rss_url, tier, is_active, is_default)
VALUES
  ('Life in Norway Business', 'https://www.lifeinnorway.net/business/', 'https://www.lifeinnorway.net/business/feed/', 2, true, true),
  ('Miniforetak.no', 'https://miniforetak.no/', 'https://miniforetak.no/feed', 2, true, true)
ON CONFLICT DO NOTHING;

-- Tier 4 - Aggregators (+1 new feed)
INSERT INTO news_monitor_sources (name, url, rss_url, tier, is_active, is_default)
VALUES
  ('EU-Startups', 'https://www.eu-startups.com/', 'https://www.eu-startups.com/feed/', 4, true, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- Part 3: Add index for faster duplicate checks
-- ============================================

-- Index on rss_source_url for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_news_rss_source_url ON news(rss_source_url) WHERE rss_source_url IS NOT NULL;

-- Index on original_url for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_news_original_url ON news(original_url) WHERE original_url IS NOT NULL;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION check_rss_article_exists(TEXT) TO anon, authenticated, service_role;
