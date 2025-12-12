-- Check for duplicate sources
SELECT 
  id,
  name,
  source_type,
  url,
  rss_url,
  is_active
FROM news_sources
WHERE name IN ('geekneural', 'digital_gpt4_neyroseti')
ORDER BY name, source_type;
