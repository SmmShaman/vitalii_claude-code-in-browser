# Telegram Bot Setup for News Moderation

Цей документ описує як налаштувати Telegram бота для модерації новин перед публікацією.

## Частина 1: Створення Telegram Бота

### 1.1 Створення бота через BotFather

1. Відкрийте Telegram і знайдіть **@BotFather**
2. Відправте команду `/newbot`
3. Введіть ім'я бота (наприклад: `Vitalii News Bot`)
4. Введіть username бота (має закінчуватися на `bot`, наприклад: `vitalii_news_moderation_bot`)
5. BotFather видасть вам **API Token** - збережіть його!

Приклад токена: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 1.2 Налаштування бота

```
/setdescription - Set bot description
/setabouttext - Set about text
/setuserpic - Set bot profile picture
```

### 1.3 Отримання Chat ID

Щоб отримати ваш особистий Chat ID:

1. Напишіть боту будь-яке повідомлення (наприклад: `/start`)
2. Відкрийте в браузері:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
   ```
3. Знайдіть `"chat":{"id": 123456789}` - це ваш Chat ID

АБО використайте бота **@userinfobot** - він покаже ваш ID

---

## Частина 2: Налаштування Supabase

### 2.1 Додати змінні середовища

У Supabase Dashboard → Settings → Edge Functions → Secrets, додайте:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 2.2 Встановити Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Linux
npm install -g supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### 2.3 Авторизуватися

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

---

## Частина 3: Створення Edge Functions

### 3.1 Структура проекту

```
supabase/
├── functions/
│   ├── monitor-news/
│   │   └── index.ts
│   ├── telegram-webhook/
│   │   └── index.ts
│   └── process-news/
│       └── index.ts
```

### 3.2 Function 1: Monitor News Sources

Файл: `supabase/functions/monitor-news/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active news sources
    const { data: sources, error } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true)

    if (error) throw error

    // For each source, fetch news
    for (const source of sources) {
      if (source.source_type === 'rss' && source.rss_url) {
        await fetchRSS(source)
      }
      // Add more source types as needed
    }

    return new Response(
      JSON.stringify({ success: true, sources: sources.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function fetchRSS(source: any) {
  // Parse RSS feed
  const response = await fetch(source.rss_url)
  const xml = await response.text()

  // Parse XML and extract articles
  // For each new article, send to Telegram for moderation

  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

  // Send message to Telegram with inline keyboard
  const message = `
🆕 New Article Found!

Title: ${articleTitle}
Source: ${source.name}
URL: ${articleUrl}

Description: ${articleDescription}
  `

  const keyboard = {
    inline_keyboard: [[
      { text: '✅ Publish', callback_data: `publish_${articleId}` },
      { text: '❌ Reject', callback_data: `reject_${articleId}` }
    ]]
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      reply_markup: keyboard,
      parse_mode: 'HTML'
    })
  })
}
```

### 3.3 Function 2: Telegram Webhook

Файл: `supabase/functions/telegram-webhook/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const update = await req.json()

    if (update.callback_query) {
      const callbackData = update.callback_query.data
      const [action, newsId] = callbackData.split('_')

      if (action === 'publish') {
        // Trigger AI rewriting and translation
        await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/process-news`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newsId })
          }
        )

        // Answer callback query
        await fetch(
          `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: update.callback_query.id,
              text: '✅ News sent for processing and publishing!'
            })
          }
        )
      } else if (action === 'reject') {
        // Just acknowledge - do nothing
        await fetch(
          `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}/answerCallbackQuery`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: update.callback_query.id,
              text: '❌ News rejected'
            })
          }
        )
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

### 3.4 Function 3: Process News (AI Rewrite & Translate)

Файл: `supabase/functions/process-news/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { newsId, title, content, url } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active AI prompt
    const { data: prompts } = await supabase
      .from('ai_prompts')
      .select('*')
      .eq('is_active', true)
      .eq('prompt_type', 'rewrite')
      .limit(1)

    if (!prompts || prompts.length === 0) {
      throw new Error('No active AI prompt found')
    }

    const prompt = prompts[0].prompt_text
      .replace('{title}', title)
      .replace('{content}', content)
      .replace('{url}', url)

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      })
    })

    const openaiData = await openaiResponse.json()
    const result = JSON.parse(openaiData.choices[0].message.content)

    // Save to database
    const { error: insertError } = await supabase
      .from('news')
      .insert({
        title_en: result.en.title,
        title_no: result.no.title,
        title_ua: result.ua.title,
        content_en: result.en.content,
        content_no: result.no.content,
        content_ua: result.ua.content,
        description_en: result.en.description,
        description_no: result.no.description,
        description_ua: result.ua.description,
        original_url: url,
        is_published: true,
        published_at: new Date().toISOString()
      })

    if (insertError) throw insertError

    // Update usage count
    await supabase
      .from('ai_prompts')
      .update({ usage_count: prompts[0].usage_count + 1 })
      .eq('id', prompts[0].id)

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

---

## Частина 4: Deployment

### 4.1 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy monitor-news
supabase functions deploy telegram-webhook
supabase functions deploy process-news
```

### 4.2 Налаштувати Telegram Webhook

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/telegram-webhook"
  }'
```

### 4.3 Налаштувати CRON для моніторингу

В Supabase Dashboard → Database → Extensions, enable `pg_cron`

Потім виконайте SQL:

```sql
-- Run monitor-news every hour
SELECT cron.schedule(
  'monitor-news-sources',
  '0 * * * *', -- every hour
  $$
  SELECT net.http_post(
    url:='https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/monitor-news',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer <YOUR_ANON_KEY>"}'::jsonb
  ) AS request_id;
  $$
);
```

---

## Частина 5: Тестування

### 5.1 Тест Telegram бота

1. Відправте `/start` боту
2. Бот має відповісти

### 5.2 Тест webhook

```bash
curl -X POST "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/telegram-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### 5.3 Тест monitor-news

```bash
curl -X POST "https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/monitor-news" \
  -H "Authorization: Bearer <YOUR_ANON_KEY>"
```

---

## Workflow

1. **CRON запускає** `monitor-news` кожну годину
2. **Function перевіряє** активні джерела новин
3. **Для нових статей** відправляє повідомлення в Telegram з кнопками
4. **Адмін натискає** "Publish" або "Reject"
5. **Якщо Publish:**
   - Telegram webhook отримує callback
   - Викликає `process-news` function
   - AI переписує та перекладає
   - Зберігає в базу даних
   - Автоматично публікується на сайті

---

## Додаткові ресурси

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
