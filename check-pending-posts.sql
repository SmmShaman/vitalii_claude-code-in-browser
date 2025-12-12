-- Check all pending posts that might be blocking new content
SELECT
  id,
  original_title,
  title_en,
  created_at,
  pre_moderation_status
FROM news
WHERE pre_moderation_status = 'pending'
ORDER BY created_at DESC;
