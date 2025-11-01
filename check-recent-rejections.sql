-- Check rejection reasons for recently rejected posts
SELECT
  id,
  original_title,
  title_en,
  rejection_reason,
  created_at,
  moderation_checked_at
FROM news
WHERE created_at >= NOW() - INTERVAL '15 minutes'
AND pre_moderation_status = 'rejected'
ORDER BY created_at DESC;
