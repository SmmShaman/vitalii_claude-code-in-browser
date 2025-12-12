-- ============================================
-- SETUP AUTOMATION: Cron Jobs для автоматичного моніторингу
-- ============================================
-- Цей скрипт налаштує автоматичне виконання Edge Functions
-- для моніторингу новин з RSS та Telegram джерел

-- ВАЖЛИВО: Запустіть цей SQL в Supabase SQL Editor:
-- https://app.supabase.com/project/uchmopqiylywnemvjttl/sql/new

-- ============================================
-- КРОК 1: Включити розширення pg_cron
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================
-- КРОК 2: Видалити старі cron jobs (якщо існують)
-- ============================================
SELECT cron.unschedule('telegram-scraper-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'telegram-scraper-job'
);

SELECT cron.unschedule('fetch-news-job') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'fetch-news-job'
);

-- ============================================
-- КРОК 3: Створити cron job для Telegram моніторингу
-- ============================================
-- Виконується кожні 10 хвилин
-- Перевіряє всі активні Telegram канали
-- Запускає AI премодерацію
-- Відправляє схвалені пости в Telegram бот

SELECT cron.schedule(
  'telegram-scraper-job',           -- Назва job
  '*/10 * * * *',                   -- Кожні 10 хвилин
  $$
  SELECT
    net.http_post(
      url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-scraper',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- КРОК 4: Створити cron job для RSS моніторингу
-- ============================================
-- Виконується кожну годину
-- Перевіряє всі активні RSS джерела
-- Запускає AI премодерацію
-- Відправляє схвалені пости в Telegram бот

SELECT cron.schedule(
  'fetch-news-job',                 -- Назва job
  '0 * * * *',                      -- Кожну годину (на початку години)
  $$
  SELECT
    net.http_post(
      url:='https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news',
      headers:=jsonb_build_object(
        'Content-Type','application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- ============================================
-- КРОК 5: Перевірити що cron jobs створені
-- ============================================
SELECT
  jobid,
  jobname,
  schedule,
  active,
  nodename
FROM cron.job
WHERE jobname IN ('telegram-scraper-job', 'fetch-news-job')
ORDER BY jobname;

-- ============================================
-- ІНСТРУКЦІЇ ПО ЗМІНІ РОЗКЛАДУ
-- ============================================

-- Щоб змінити частоту виконання Telegram scraper (наприклад, кожні 5 хвилин):
/*
SELECT cron.unschedule('telegram-scraper-job');
SELECT cron.schedule(
  'telegram-scraper-job',
  '*/5 * * * *',  -- Кожні 5 хвилин
  $$[...той самий код...]$$
);
*/

-- Щоб змінити частоту виконання RSS fetch (наприклад, кожні 2 години):
/*
SELECT cron.unschedule('fetch-news-job');
SELECT cron.schedule(
  'fetch-news-job',
  '0 */2 * * *',  -- Кожні 2 години
  $$[...той самий код...]$$
);
*/

-- ============================================
-- КОРИСНІ CRON ВИРАЗИ
-- ============================================
-- */5 * * * *     → Кожні 5 хвилин
-- */10 * * * *    → Кожні 10 хвилин
-- */15 * * * *    → Кожні 15 хвилин
-- */30 * * * *    → Кожні 30 хвилин
-- 0 * * * *       → Кожну годину
-- 0 */2 * * *     → Кожні 2 години
-- 0 */6 * * *     → Кожні 6 годин
-- 0 9,17 * * *    → О 9:00 та 17:00 щодня
-- 0 0 * * *       → Опівночі щодня

-- ============================================
-- МОНІТОРИНГ РОБОТИ CRON JOBS
-- ============================================

-- Переглянути всі активні cron jobs:
-- SELECT * FROM cron.job ORDER BY jobname;

-- Переглянути історію виконання (останні 10 запусків):
-- SELECT * FROM cron.job_run_details
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('telegram-scraper-job', 'fetch-news-job'))
-- ORDER BY start_time DESC
-- LIMIT 10;

-- ============================================
-- ✅ ГОТОВО!
-- ============================================
-- Після виконання цього SQL скрипту:
-- 1. Telegram канали перевірятимуться автоматично кожні 10 хвилин
-- 2. RSS джерела перевірятимуться автоматично кожну годину
-- 3. AI автоматично фільтруватиме спам та рекламу
-- 4. Схвалені пости автоматично відправлятимуться в ваш Telegram бот
-- 5. Ви більше НЕ ПОТРІБНО нажимати "Почати роботу" вручну!
