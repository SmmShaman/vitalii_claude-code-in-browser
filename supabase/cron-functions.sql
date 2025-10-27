-- SQL functions for managing CRON schedules from Admin Panel

-- Function to get current CRON schedule
CREATE OR REPLACE FUNCTION get_cron_schedule()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  WHERE j.jobname = 'monitor-news-sources';
END;
$$;

-- Function to unschedule a CRON job
CREATE OR REPLACE FUNCTION unschedule_cron_job(job_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM cron.unschedule(job_name);
END;
$$;

-- Function to schedule a CRON job
CREATE OR REPLACE FUNCTION schedule_cron_job(
  job_name text,
  schedule text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url text;
  anon_key text;
  job_id bigint;
BEGIN
  -- Get Supabase configuration
  -- You need to replace these with your actual values
  supabase_url := 'https://uchmopqiylywnemvjttl.supabase.co';

  -- Get anon key from vault or use environment variable
  -- For security, store in Supabase Vault: https://supabase.com/docs/guides/database/vault
  SELECT decrypted_secret INTO anon_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_ANON_KEY'
  LIMIT 1;

  -- If not in vault, you'll need to pass it or store it securely
  -- For now, we'll construct the command without the key (needs manual update)

  SELECT cron.schedule(
    job_name,
    schedule,
    format(
      $sql$
      SELECT net.http_post(
        url:='%s/functions/v1/monitor-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb
      ) AS request_id;
      $sql$,
      supabase_url,
      anon_key
    )
  ) INTO job_id;

  RETURN job_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_cron_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION unschedule_cron_job(text) TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_cron_job(text, text) TO authenticated;

-- Store SUPABASE_ANON_KEY in Vault for security
-- Run this command and replace YOUR_ANON_KEY with your actual anon key from Project Settings > API
-- INSERT INTO vault.secrets (name, secret)
-- VALUES ('SUPABASE_ANON_KEY', 'YOUR_ANON_KEY')
-- ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Alternative: Simple version without vault (less secure but works)
-- If the above doesn't work, you can use this simpler version:

/*
CREATE OR REPLACE FUNCTION schedule_cron_job_simple(
  job_name text,
  schedule text,
  anon_key text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  job_id bigint;
BEGIN
  SELECT cron.schedule(
    job_name,
    schedule,
    format(
      $sql$
      SELECT net.http_post(
        url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/monitor-news',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb
      ) AS request_id;
      $sql$,
      anon_key
    )
  ) INTO job_id;

  RETURN job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION schedule_cron_job_simple(text, text, text) TO authenticated;
*/
