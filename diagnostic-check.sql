-- ============================================
-- ДІАГНОСТИКА СИСТЕМИ МОНІТОРИНГУ TELEGRAM
-- ============================================

-- 1. Перевірка Telegram джерел
SELECT '=== 1. TELEGRAM SOURCES ===' as section;
SELECT 
  id,
  name,
  url,
  is_active,
  last_fetched_at,
  fetch_interval,
  created_at
FROM news_sources
WHERE source_type = 'telegram'
ORDER BY created_at DESC;

-- 2. Перевірка cron jobs
SELECT '=== 2. CRON JOBS ===' as section;
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname LIKE '%telegram%' OR jobname LIKE '%scraper%'
ORDER BY jobname;

-- 3. Останні новини з Telegram
SELECT '=== 3. RECENT TELEGRAM NEWS ===' as section;
SELECT 
  n.id,
  n.original_title,
  n.pre_moderation_status,
  n.rejection_reason,
  ns.name as source_name,
  n.created_at
FROM news n
LEFT JOIN news_sources ns ON n.source_id = ns.id
WHERE ns.source_type = 'telegram'
ORDER BY n.created_at DESC
LIMIT 10;

-- 4. Перевірка відхилених новин
SELECT '=== 4. REJECTED NEWS TODAY ===' as section;
SELECT 
  n.id,
  n.original_title,
  n.rejection_reason,
  ns.name as source_name,
  n.created_at
FROM news n
LEFT JOIN news_sources ns ON n.source_id = ns.id
WHERE n.pre_moderation_status = 'rejected'
AND n.created_at > CURRENT_DATE
ORDER BY n.created_at DESC;

-- 5. Перевірка extensions
SELECT '=== 5. INSTALLED EXTENSIONS ===' as section;
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net', 'http');
