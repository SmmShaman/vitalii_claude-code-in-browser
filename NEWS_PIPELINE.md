# 📰 Автоматична Система Новин - Повна Документація

## 🎯 Огляд Системи

Повністю автоматизована система збору, обробки та публікації новин з підтримкою 3 мов (EN, UA, NO).

---

## 🏗️ Архітектура

```
Telegram Канали
       ↓
┌─────────────────────────────────────────────────┐
│ SUPABASE EDGE FUNCTIONS (Backend)               │
│                                                  │
│ 1. telegram-scraper    → Парсинг каналів        │
│ 2. monitor-news        → Моніторинг джерел      │
│ 3. telegram-webhook    → Telegram Bot (approval)│
│ 4. pre-moderate-news   → AI фільтрація          │
│ 5. process-news        → AI рерайтинг (новини)  │
│ 6. process-blog-post   → AI рерайтинг (блог)    │
│ 7. fetch-news          → API для отримання      │
│ 8. test-youtube-auth   → YouTube інтеграція     │
└─────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────┐
│ SUPABASE POSTGRESQL DATABASE                    │
│                                                  │
│ Таблиці:                                        │
│ • news            → Новини (з перекладами)      │
│ • blog_posts      → Блог пости (з перекладами)  │
│ • news_sources    → Джерела новин               │
│ • ai_prompts      → AI промпти                  │
│ • contact_forms   → Форми зворотнього зв'язку   │
└─────────────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────────────┐
│ FRONTEND APPLICATIONS                            │
│                                                  │
│ 1. news-app/        → Next.js News Site (ISR)   │
│    • /en, /ua, /no  → Мультимовні новини        │
│    • /blog/*        → Блог                       │
│    • SEO оптимізація, динамічний sitemap        │
│                                                  │
│ 2. src/             → Portfolio Site (React)    │
│    • Портфоліо                                  │
│    • Контактна форма                            │
└─────────────────────────────────────────────────┘
```

---

## 📋 Процес Роботи (Крок за Кроком)

### Крок 1: Парсинг Новин

**Edge Functions:**
- `telegram-scraper` - головний парсер
- `monitor-news` - моніторинг джерел

**Що відбувається:**
1. Система читає список каналів з таблиці `news_sources`
2. Перевіряє нові пости (після `last_fetched_at`)
3. Парсить HTML контент через `https://t.me/[channel]/[post_id]?embed=1`
4. Витягує:
   - Текст новини
   - Зображення
   - Відео (якщо є)
   - Автора
   - Дату публікації

**Відео обробка:**
- Якщо є відео → завантажує на YouTube через YouTube Data API v3
- Використовує OAuth 2.0
- Генерує назву англійською (через Azure OpenAI)
- Зберігає `video_url` в БД

**Результат:**
- Новина зберігається в таблицю `news`
- Статус: `pending` (очікує модерації)

---

### Крок 2: Telegram Бот - Модерація

**Edge Function:** `telegram-webhook`

**URL:** `https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-webhook`

**Як працює:**
1. Telegram Bot API відправляє webhook на цей URL
2. Ви отримуєте повідомлення в Telegram:

```
📰 Нова новина:
[Заголовок]
[Короткий опис]
[Зображення якщо є]

[Кнопка: ✅ Approve (News)]
[Кнопка: ✅ Approve (Blog)]
[Кнопка: ❌ Reject]
```

3. Ви натискаєте кнопку:
   - **✅ Approve (News)** → викликає `process-news`
   - **✅ Approve (Blog)** → викликає `process-blog-post`
   - **❌ Reject** → видаляє з черги

---

### Крок 3: AI Рерайтинг та Переклад

**Edge Functions:**
- `process-news` - для новин (журналістський стиль)
- `process-blog-post` - для блогу (особистий стиль)

**AI Сервіс:**
- **Azure OpenAI**: `Jobbot-gpt-4.1-mini` deployment
- Промпти зберігаються в таблиці `ai_prompts`

**Процес:**

1. **Читання промпта з БД:**
```sql
SELECT prompt_text FROM ai_prompts
WHERE prompt_type = 'news_rewrite'
AND is_active = true
LIMIT 1
```

2. **Виклик Azure OpenAI:**
```typescript
const response = await fetch(AZURE_OPENAI_ENDPOINT, {
  method: 'POST',
  headers: {
    'api-key': AZURE_OPENAI_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: promptText },
      { role: 'user', content: originalContent }
    ],
    response_format: { type: 'json_object' }
  })
})
```

3. **Відповідь AI (JSON формат):**
```json
{
  "en": {
    "title": "English Title",
    "content": "Full English content...",
    "description": "Short description...",
    "slug": "english-title"
  },
  "ua": {
    "title": "Українська Назва",
    "content": "Повний український контент...",
    "description": "Короткий опис...",
    "slug": "ukrainska-nazva"
  },
  "no": {
    "title": "Norsk Tittel",
    "content": "Fullt norsk innhold...",
    "description": "Kort beskrivelse...",
    "slug": "norsk-tittel"
  }
}
```

4. **Оновлення запису в БД:**
```sql
UPDATE news SET
  title_en = $1,
  content_en = $2,
  description_en = $3,
  slug_en = $4,
  title_ua = $5,
  content_ua = $6,
  description_ua = $7,
  slug_ua = $8,
  title_no = $9,
  content_no = $10,
  description_no = $11,
  slug_no = $12,
  is_published = true,
  published_at = NOW()
WHERE id = $13
```

**Стилі рерайтингу:**

**Новини (process-news):**
- Об'єктивний тон
- Факти без емоцій
- Журналістський стиль
- Третя особа

**Блог (process-blog-post):**
- Від першої особи ("I discovered...", "In my experience...")
- Розмовний стиль
- Особисті інсайти
- Емоційні описи

---

### Крок 4: Публікація та Відображення

**Таблиця `news`:**
```sql
id: UUID
original_title: TEXT
original_content: TEXT
original_url: TEXT
image_url: TEXT

-- Переклади EN
title_en: TEXT
content_en: TEXT
description_en: TEXT
slug_en: TEXT

-- Переклади UA
title_ua: TEXT
content_ua: TEXT
description_ua: TEXT
slug_ua: TEXT

-- Переклади NO
title_no: TEXT
content_no: TEXT
description_no: TEXT
slug_no: TEXT

-- Meta
tags: TEXT[]
is_published: BOOLEAN
published_at: TIMESTAMP
created_at: TIMESTAMP
updated_at: TIMESTAMP
views_count: INTEGER
video_url: TEXT
```

**News-App (Next.js):**

1. **ISR (Incremental Static Regeneration):**
```typescript
export const revalidate = 60 // Кожні 60 секунд
```

2. **Автоматичне оновлення:**
   - Кожні 60 секунд Next.js перевіряє БД
   - Якщо є нові новини → регенерує сторінки
   - Відвідувачі бачать свіжі новини

3. **URL структура:**
```
Новини:
/                    → Головна (показує останні 3 новини + 3 блоги)
/en                  → Всі новини англійською
/ua                  → Всі новини українською
/no                  → Всі новини норвезькою
/en/[slug]           → Окрема новина англійською

Блог:
/blog/en             → Всі блог пости англійською
/blog/ua             → Всі блог пости українською
/blog/no             → Всі блог пости норвезькою
/blog/en/[slug]      → Окремий блог пост англійською
```

4. **SEO Оптимізація:**
   - Dynamic sitemap: `/sitemap.xml`
   - Meta tags (Open Graph, Twitter Cards)
   - Structured data (Schema.org NewsArticle/BlogPosting)
   - Canonical URLs
   - Language alternates

---

## 🔐 Секрети та Налаштування

**Потрібні Environment Variables:**

### Supabase Edge Functions
```bash
# Supabase
SUPABASE_URL=https://uchmopqiylywnemvjttl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=secret_key_here

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=Jobbot-gpt-4.1-mini

# YouTube (для відео)
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
```

### News-App (Next.js)
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://uchmopqiylywnemvjttl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 📊 Статистика та Моніторинг

**Активні Edge Functions:**

| Функція | URL | Останнє оновлення |
|---------|-----|-------------------|
| monitor-news | `/functions/v1/monitor-news` | 13 днів тому |
| telegram-webhook | `/functions/v1/telegram-webhook` | 4 дні тому |
| process-news | `/functions/v1/process-news` | 4 дні тому |
| telegram-scraper | `/functions/v1/telegram-scraper` | 4 дні тому |
| fetch-news | `/functions/v1/fetch-news` | 11 днів тому |
| pre-moderate-news | `/functions/v1/pre-moderate-news` | 10 днів тому |
| test-youtube-auth | `/functions/v1/test-youtube-auth` | 5 днів тому |
| process-blog-post | `/functions/v1/process-blog-post` | 4 дні тому |

**База даних:**
- ✅ 114 новин (38 опубліковано)
- ✅ 8 блог постів (опубліковано)

---

## 🚀 Розгортання News-App

### 1. Netlify (Рекомендовано)

**netlify.toml:**
```toml
[build]
  command = "cd news-app && npm run build"
  publish = "news-app/.next"

[build.environment]
  NODE_VERSION = "18"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

**Кроки:**
1. Push код на GitHub
2. Підключити репозиторій до Netlify
3. Додати environment variables в Netlify Dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy автоматично

### 2. Vercel (Альтернатива)

```bash
cd news-app
vercel --prod
```

---

## 🔧 Налаштування Джерел Новин

**Таблиця `news_sources`:**

```sql
CREATE TABLE news_sources (
  id UUID PRIMARY KEY,
  name TEXT,
  url TEXT,
  source_type TEXT, -- 'telegram', 'rss', 'web'
  is_active BOOLEAN,
  fetch_interval INTEGER, -- хвилини
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP
);
```

**Приклад додавання джерела:**

```sql
INSERT INTO news_sources (id, name, url, source_type, is_active, fetch_interval)
VALUES (
  gen_random_uuid(),
  'TechCrunch Telegram',
  'https://t.me/techcrunch',
  'telegram',
  true,
  30 -- кожні 30 хвилин
);
```

---

## 📝 Управління AI Промптами

**Таблиця `ai_prompts`:**

```sql
CREATE TABLE ai_prompts (
  id UUID PRIMARY KEY,
  name TEXT,
  prompt_type TEXT, -- 'news_rewrite', 'blog_rewrite', 'pre_moderation'
  prompt_text TEXT,
  description TEXT,
  is_active BOOLEAN,
  usage_count INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Типи промптів:**

1. **news_rewrite** - Журналістський стиль
   - Об'єктивний тон
   - Факти без емоцій

2. **blog_rewrite** - Особистий стиль
   - Від першої особи
   - Розмовний тон

3. **pre_moderation** - Фільтрація
   - Спам детекція
   - NSFW перевірка

---

## ✅ Як Перевірити що Все Працює

### 1. Перевірити Edge Functions
```bash
curl https://uchmopqiylywnemvjttl.supabase.co/functions/v1/fetch-news
```

### 2. Перевірити новини в БД
```sql
SELECT id, original_title, is_published, created_at
FROM news
WHERE is_published = true
ORDER BY created_at DESC
LIMIT 10;
```

### 3. Запустити news-app локально
```bash
cd news-app
npm install
npm run dev
```

Відкрити: http://localhost:3000

### 4. Перевірити production
Відкрити розгорнутий сайт та побачити новини!

---

## 🎉 Підсумок

**Система ПОВНІСТЮ АВТОМАТИЧНА:**

✅ Парсинг з Telegram → автоматично
✅ Модерація через Telegram бота → ви вибираєте
✅ AI рерайтинг + переклад → автоматично
✅ Публікація в БД → автоматично
✅ Відображення на сайті → автоматично (ISR)
✅ SEO оптимізація → автоматично
✅ Мультимовність (EN, UA, NO) → автоматично

**Ваша участь:**
- Тільки натискання кнопки в Telegram (Новина/Блог/Відхилити)
- Все інше система робить сама!

---

## 📞 Підтримка

**Supabase Dashboard:**
https://supabase.com/dashboard/project/uchmopqiylywnemvjttl

**GitHub Repository:**
https://github.com/SmmShaman/vitalii_claude-code-in-browser

**Документація:**
- README.md - Загальний огляд
- DEPLOYMENT.md - Інструкції з розгортання
- SEO_IMPROVEMENTS.md - SEO оптимізація
- NEWS_PIPELINE.md - Ця документація
