-- ============================================
-- SMART AUTOMATION CRON JOBS
-- ============================================
-- This SQL creates cron jobs that respect individual source fetch_interval settings
--
-- HOW IT WORKS:
-- 1. Cron jobs run frequently (every 5 minutes)
-- 2. Edge Functions check each source's fetch_interval
-- 3. Only sources where (last_fetched_at + fetch_interval <= NOW) are processed
-- 4. This allows different schedules per source:
--    - Some sources checked every 15 minutes
--    - Some checked once per day
--    - Some checked once per month
--
-- USAGE:
-- 1. Copy this entire file
-- 2. Go to Supabase SQL Editor: https://app.supabase.com/project/uchmopqiylywnemvjttl/sql
-- 3. Paste and run
-- ============================================

-- First, enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Also enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing jobs if they exist (to avoid duplicates)
SELECT cron.unschedule('smart-telegram-scraper-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-telegram-scraper-job'
);

SELECT cron.unschedule('smart-rss-fetcher-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'smart-rss-fetcher-job'
);

-- ============================================
-- SMART TELEGRAM SCRAPER JOB
-- ============================================
-- Runs every 5 minutes
-- The Edge Function will filter sources based on their individual fetch_interval
SELECT cron.schedule(
  'smart-telegram-scraper-job',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:='{}'::jsonb
  );
  $$
);

-- ============================================
-- SMART RSS FETCHER JOB
-- ============================================
-- Runs every 5 minutes
-- The Edge Function will filter sources based on their individual fetch_interval
SELECT cron.schedule(
  'smart-rss-fetcher-job',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body:='{}'::jsonb
  );
  $$
);

-- ============================================
-- VERIFY CRON JOBS
-- ============================================
-- Check that cron jobs are created and scheduled correctly
SELECT
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname IN ('smart-telegram-scraper-job', 'smart-rss-fetcher-job')
ORDER BY jobname;

-- ============================================
-- HOW TO MONITOR
-- ============================================
-- View job run history:
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname IN ('smart-telegram-scraper-job', 'smart-rss-fetcher-job')
-- ) ORDER BY start_time DESC LIMIT 20;

-- ============================================
-- HOW TO STOP AUTOMATION
-- ============================================
-- To pause automation without deleting jobs:
-- UPDATE cron.job SET active = false WHERE jobname IN ('smart-telegram-scraper-job', 'smart-rss-fetcher-job');

-- To resume:
-- UPDATE cron.job SET active = true WHERE jobname IN ('smart-telegram-scraper-job', 'smart-rss-fetcher-job');

-- To completely remove jobs:
-- SELECT cron.unschedule('smart-telegram-scraper-job');
-- SELECT cron.unschedule('smart-rss-fetcher-job');

-- ============================================
-- IMPORTANT NOTES
-- ============================================
-- 1. Each source has its own fetch_interval (configured in dashboard AutoPublish settings)
-- 2. The cron runs every 5 minutes, but sources are only processed when their interval has elapsed
-- 3. Example: If source A has 15-min interval and source B has 1-day interval:
--    - Source A: processed every 15 minutes (3 times per hour)
--    - Source B: processed once every 24 hours
-- 4. AI pre-moderation runs automatically for all new posts
-- 5. Only AI-approved posts are sent to Telegram bot
-- 6. Manual "Почати роботу" in dashboard still works and processes all sources immediately
