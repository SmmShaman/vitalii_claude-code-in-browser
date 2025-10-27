# Швидке налаштування системи новин

Все вже готово! Вам потрібно виконати тільки ці кроки **ПО ОДНОМУ**.

---

## Крок 1: Встановити Supabase CLI

Виберіть команду для вашої ОС:

### macOS:
```bash
brew install supabase/tap/supabase
```

### Linux/WSL:
```bash
npm install -g supabase
```

### Windows (через Scoop):
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Перевірте що встановилось:**
```bash
supabase --version
```

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ ПЕРЕД НАСТУПНИМ КРОКОМ**

---

## Крок 2: Авторизуватися в Supabase

```bash
supabase login
```

Це відкриє браузер. Увійдіть в свій Supabase акаунт.

Потім виконайте (замініть `YOUR_PROJECT_REF` на ваш project ID):

```bash
cd /home/user/vitalii_claude-code-in-browser
supabase link --project-ref YOUR_PROJECT_REF
```

**Як знайти Project ID:**
1. Відкрийте https://app.supabase.com/
2. Виберіть ваш проект
3. Settings → General → Reference ID

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ ПЕРЕД НАСТУПНИМ КРОКОМ**

---

## Крок 3: Додати змінні середовища в Supabase

1. Відкрийте: https://app.supabase.com/project/_/settings/functions
2. Натисніть **"Add new secret"** для кожної змінної:

### Telegram:
- Ім'я: `TELEGRAM_BOT_TOKEN`
- Значення: `[ВАШ_BOT_TOKEN - я надав вам його окремо]`

- Ім'я: `TELEGRAM_CHAT_ID`
- Значення: `[ВАШ_CHAT_ID - я надав вам його окремо]`

### Azure OpenAI:
- Ім'я: `AZURE_OPENAI_ENDPOINT`
- Значення: `https://elvarika.openai.azure.com/`

- Ім'я: `AZURE_OPENAI_API_KEY`
- Значення: `[ВАШ_AZURE_KEY - я надав вам його окремо]`

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ ПЕРЕД НАСТУПНИМ КРОКОМ**

---

## Крок 4: Задеплоїти функції

Запустіть один скрипт який задеплоїть всі 3 функції:

```bash
cd /home/user/vitalii_claude-code-in-browser
./supabase/deploy.sh
```

Це займе 1-2 хвилини. Ви побачите:
```
✅ monitor-news deployed successfully
✅ telegram-webhook deployed successfully
✅ process-news deployed successfully
```

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ ПЕРЕД НАСТУПНИМ КРОКОМ**

---

## Крок 5: Налаштувати Telegram Webhook

Скопіюйте цю команду ПОВНІСТЮ (замініть `YOUR_BOT_TOKEN` та `YOUR_PROJECT_REF`):

```bash
curl -X POST "https://api.telegram.org/bot[YOUR_BOT_TOKEN]/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR_PROJECT_REF.supabase.co/functions/v1/telegram-webhook"}'
```

Замініть `YOUR_PROJECT_REF` на ваш Project ID з Крок 2.

Має повернути:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ ПЕРЕД НАСТУПНИМ КРОКОМ**

---

## Крок 6: Налаштувати CRON (автоматичну перевірку)

1. Відкрийте: https://app.supabase.com/project/_/sql/new
2. Скопіюйте цей SQL (замініть `YOUR_PROJECT_REF` та `YOUR_ANON_KEY`):

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monitor-news to run every hour
SELECT cron.schedule(
  'monitor-news-sources',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/monitor-news',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY}"}'::jsonb
  ) AS request_id;
  $$
);
```

**Як знайти ANON_KEY:**
- Settings → API → Project API keys → `anon` `public`

3. Натисніть **Run**

✅ **ЗАЧЕКАЙТЕ МОЇ ВІДПОВІДІ - ТЕСТУВАННЯ**

---

## Крок 7: Тестування (я зроблю)

Я запущу тестовий запит щоб перевірити що все працює.

---

## Готово! 🎉

Після всіх кроків система працюватиме так:

1. **Кожну годину** CRON викликає `monitor-news`
2. Якщо знайдено нові статті → **відправляє в Telegram**
3. Ви натискаєте **"✅ Publish"** або **"❌ Reject"**
4. При Publish → **AI переписує і перекладає** → **публікує на сайт**

---

## Додати джерела новин:

1. Відкрийте: https://remarkable-monstera-e6ecfa.netlify.app/admin/dashboard
2. Settings → News Sources → Add Source
3. Додайте RSS фід (наприклад: https://techcrunch.com/feed/)
