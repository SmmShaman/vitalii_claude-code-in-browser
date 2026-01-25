-- Fix race condition duplicates in social_media_posts table
-- Problem: Telegram webhook retries can create duplicate posts because there's no unique constraint

-- Step 1: Delete duplicate "posted" records, keeping only the oldest one per (content_id, content_type, platform, language)
-- This cleans up existing duplicates before adding the constraint
DELETE FROM social_media_posts
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY content_id, content_type, platform, language
                   ORDER BY created_at ASC
               ) as rn
        FROM social_media_posts
        WHERE status IN ('posted', 'pending')
    ) t
    WHERE t.rn > 1
);

-- Step 2: Create partial unique index to prevent future duplicates
-- Only applies to 'pending' and 'posted' statuses (allows multiple 'failed' records for retry tracking)
CREATE UNIQUE INDEX IF NOT EXISTS idx_social_media_posts_unique_active
ON social_media_posts (content_id, content_type, platform, language)
WHERE status IN ('pending', 'posted');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_social_media_posts_unique_active IS 'Prevents duplicate social media posts for the same content/platform/language combination. Allows multiple failed attempts for debugging.';
