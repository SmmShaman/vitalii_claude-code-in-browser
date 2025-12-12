-- ============================================
-- Telegram Scraper Cron Job Setup
-- ============================================
-- This SQL creates a cron job that automatically runs telegram-scraper
-- every 10 minutes to fetch new posts from Telegram channels
-- ============================================

-- Create cron job
SELECT cron.schedule(
  'telegram-scraper-job',          -- Job name
  '*/10 * * * *',                  -- Every 10 minutes
  $$
  SELECT
    net.http_post(
      url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization','Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Verify cron job was created
SELECT
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
WHERE jobname = 'telegram-scraper-job';
