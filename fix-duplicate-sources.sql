-- ============================================
-- FIX DUPLICATE NEWS SOURCES
-- ============================================
-- This script finds and removes duplicate sources
-- that were created with wrong source_type

-- STEP 1: Check for duplicates
-- Run this first to see what we have
SELECT
  id,
  name,
  source_type,
  url,
  rss_url,
  is_active,
  created_at
FROM news_sources
ORDER BY name, source_type;

-- STEP 2: Find RSS-type entries that have no RSS URL (these are wrong)
SELECT
  id,
  name,
  source_type,
  url,
  rss_url
FROM news_sources
WHERE source_type = 'rss'
  AND (rss_url IS NULL OR rss_url = '')
  AND url LIKE '%t.me%';

-- STEP 3: Delete the wrong RSS-type entries for Telegram channels
-- ⚠️ UNCOMMENT THE LINES BELOW TO EXECUTE THE FIX ⚠️

/*
DELETE FROM news_sources
WHERE source_type = 'rss'
  AND (rss_url IS NULL OR rss_url = '')
  AND url LIKE '%t.me%';
*/

-- STEP 4: Verify - should only have one entry per channel now
SELECT
  name,
  COUNT(*) as count,
  array_agg(source_type) as types
FROM news_sources
GROUP BY name
HAVING COUNT(*) > 1;

-- STEP 5: Final check - all sources should be clean
SELECT
  id,
  name,
  source_type,
  CASE
    WHEN source_type = 'rss' AND (rss_url IS NULL OR rss_url = '') THEN '❌ Missing RSS URL'
    WHEN source_type = 'telegram' AND url NOT LIKE '%t.me%' THEN '❌ Invalid Telegram URL'
    ELSE '✅ OK'
  END as status,
  url,
  rss_url
FROM news_sources
ORDER BY name;
