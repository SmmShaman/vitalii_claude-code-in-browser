-- Migration: Add cross-source duplicate detection
-- Date: 2026-02-15
-- Description: pg_trgm-based title similarity + AI-enriched duplicate detection

-- ============================================
-- Part 1: Enable pg_trgm extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- Part 2: Add duplicate detection columns to news
-- ============================================
ALTER TABLE news ADD COLUMN IF NOT EXISTS title_fingerprint TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS duplicate_of_id UUID REFERENCES news(id) ON DELETE SET NULL;
ALTER TABLE news ADD COLUMN IF NOT EXISTS duplicate_score NUMERIC(4,3);

-- ============================================
-- Part 3: GIN index for trigram similarity search
-- ============================================
CREATE INDEX IF NOT EXISTS idx_news_title_fingerprint_trgm
ON news USING gin (title_fingerprint gin_trgm_ops)
WHERE title_fingerprint IS NOT NULL;

-- Index for duplicate_of_id lookups
CREATE INDEX IF NOT EXISTS idx_news_duplicate_of_id
ON news(duplicate_of_id)
WHERE duplicate_of_id IS NOT NULL;

-- ============================================
-- Part 4: Title normalization function
-- ============================================
CREATE OR REPLACE FUNCTION normalize_title(title TEXT)
RETURNS TEXT AS $$
BEGIN
  IF title IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN TRIM(
    regexp_replace(
      regexp_replace(
        lower(title),
        -- Remove punctuation and special characters
        '[^\w\s]', ' ', 'g'
      ),
      -- Collapse multiple spaces
      '\s+', ' ', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Part 5: Find similar news by title
-- ============================================
CREATE OR REPLACE FUNCTION find_similar_news(
  search_title TEXT,
  days_back INT DEFAULT 7,
  sim_threshold FLOAT DEFAULT 0.4,
  max_results INT DEFAULT 3
)
RETURNS TABLE (
  news_id UUID,
  news_title TEXT,
  similarity_score FLOAT,
  created_at TIMESTAMPTZ,
  source_name TEXT
) AS $$
DECLARE
  normalized TEXT;
BEGIN
  normalized := normalize_title(search_title);

  IF normalized IS NULL OR length(normalized) < 10 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.id AS news_id,
    n.original_title AS news_title,
    similarity(n.title_fingerprint, normalized)::FLOAT AS similarity_score,
    n.created_at,
    COALESCE(ns.name, 'Unknown') AS source_name
  FROM news n
  LEFT JOIN news_sources ns ON n.source_id = ns.id
  WHERE n.title_fingerprint IS NOT NULL
    AND n.created_at > NOW() - (days_back || ' days')::INTERVAL
    AND n.pre_moderation_status != 'rejected'
    AND similarity(n.title_fingerprint, normalized) > sim_threshold
  ORDER BY similarity(n.title_fingerprint, normalized) DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Part 6: Trigger to auto-populate title_fingerprint
-- ============================================
CREATE OR REPLACE FUNCTION trigger_set_title_fingerprint()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.original_title IS NOT NULL THEN
    NEW.title_fingerprint := normalize_title(NEW.original_title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_title_fingerprint ON news;

CREATE TRIGGER set_title_fingerprint
  BEFORE INSERT OR UPDATE OF original_title ON news
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_title_fingerprint();

-- ============================================
-- Part 7: Backfill existing records
-- ============================================
UPDATE news
SET title_fingerprint = normalize_title(original_title)
WHERE original_title IS NOT NULL AND title_fingerprint IS NULL;

-- ============================================
-- Part 8: AI prompt for duplicate detection
-- ============================================
INSERT INTO ai_prompts (name, prompt_type, prompt_text, is_active, usage_count)
VALUES (
  'Cross-Source Duplicate Detection',
  'duplicate_detection',
  'You are a news duplicate detector. Compare the NEW article with RECENT articles and determine if they cover the SAME event or story.

NEW ARTICLE:
Title: {new_title}
Summary: {new_summary}

RECENT ARTICLES (last 7 days):
{recent_titles}

Respond ONLY with valid JSON:
{
  "is_duplicate": true/false,
  "duplicate_of_index": number or null,
  "confidence": number 0-1,
  "reason": "brief explanation in English"
}

Rules:
- Same event reported by different outlets = DUPLICATE
- Related but different aspects of a topic = NOT duplicate
- Same topic but different time period or new data = NOT duplicate
- Translation of the same article = DUPLICATE
- General industry trends appearing in multiple articles = NOT duplicate',
  true,
  0
)
ON CONFLICT DO NOTHING;

-- ============================================
-- Part 9: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION normalize_title(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_similar_news(TEXT, INT, FLOAT, INT) TO anon, authenticated, service_role;
