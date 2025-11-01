-- ============================================
-- ВИДАЛИТИ ДУБЛІКАТИ ДЖЕРЕЛ (НЕГАЙНО!)
-- ============================================
-- Запустіть цей SQL в Supabase SQL Editor:
-- https://app.supabase.com/project/uchmopqiylywnemvjttl/sql/new

-- ============================================
-- КРОК 1: Перевірити які дублікати є зараз
-- ============================================
SELECT
  id,
  name,
  source_type,
  url,
  rss_url,
  is_active,
  CASE
    WHEN source_type = 'rss' AND (rss_url IS NULL OR rss_url = '') AND url LIKE '%t.me%'
      THEN '❌ ВИДАЛИТИ (неправильний RSS для Telegram)'
    WHEN source_type = 'rss' AND (rss_url IS NULL OR rss_url = '') AND url LIKE '%rsshub%'
      THEN '❌ ВИДАЛИТИ (RSSHub дублікат)'
    ELSE '✅ ЗАЛИШИТИ'
  END as action
FROM news_sources
ORDER BY name, source_type;

-- ============================================
-- КРОК 2: ВИДАЛИТИ неправильні RSS записи
-- ============================================
-- Видаляємо RSS записи БЕЗ rss_url, які насправді є Telegram каналами

DELETE FROM news_sources
WHERE source_type = 'rss'
  AND (rss_url IS NULL OR rss_url = '')
  AND (
    url LIKE '%t.me%'           -- Прямі Telegram лінки
    OR url LIKE '%rsshub.app%'  -- RSSHub дублікати
  );

-- ============================================
-- КРОК 3: Перевірити результат
-- ============================================
-- Має показати ТІЛЬКИ унікальні джерела без дублікатів

SELECT
  name,
  source_type,
  url,
  rss_url,
  is_active
FROM news_sources
ORDER BY name, source_type;

-- ============================================
-- КРОК 4: Перевірити чи залишились дублікати
-- ============================================
-- Якщо цей запит повертає рядки - у вас ще є дублікати!

SELECT
  name,
  COUNT(*) as count,
  array_agg(source_type) as types
FROM news_sources
GROUP BY name
HAVING COUNT(*) > 1;

-- ============================================
-- ОЧІКУВАНИЙ РЕЗУЛЬТАТ:
-- ============================================
-- Після виконання у вас має бути:
--
-- ✅ dailyprompts        (telegram)
-- ✅ digital_gpt4_neyroseti (telegram)
-- ✅ geekneural          (telegram)
-- ✅ TechCrunch          (rss) - з rss_url
-- ✅ Perplexity AI       (web)
--
-- ❌ БЕЗ дублікатів "geekneural (Telegram RSS)"
-- ❌ БЕЗ дублікатів "digital_gpt4_neyroseti (Telegram RSS)"
