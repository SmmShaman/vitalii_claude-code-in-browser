## Telegram Bot Workflow Improvements (December 22, 2024)

### Опис

Комплексне покращення Telegram бота для модерації новин: секвенційний workflow, автоматична детекція медіа, покращений контекст для AI промптів, та відображення посилань на джерела.

### Виправлені проблеми

#### 1. Sequential Workflow (Секвенційний робочий процес)

**Проблема:** Всі кнопки показувались одночасно, що було незрозуміло та заплутано.

**Рішення:** Покроковий workflow з автоматичною зміною кнопок:

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Image Selection (якщо немає відео)        │
│  ┌───────────────────────────────────────────────┐ │
│  │  ✅ Залишити зображення                       │ │
│  │  📸 Згенерувати своє                           │ │
│  │  ❌ Reject                                     │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 2: Publication (після підтвердження)         │
│  ┌───────────────────────────────────────────────┐ │
│  │  📰 В новини    │    📝 В блог                 │ │
│  │  ❌ Reject                                     │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 3: LinkedIn (після публікації)               │
│  ┌───────────────────────────────────────────────┐ │
│  │  🔗 LinkedIn EN │ LinkedIn NO │ LinkedIn UA    │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 4: Final Links (після LinkedIn поста)        │
│  ┌───────────────────────────────────────────────┐ │
│  │  ✅ LINKEDIN EN                                │ │
│  │  📰 «Article Title»                            │ │
│  │  📝 Читати статтю (website link)               │ │
│  │  🔗 Переглянути пост (LinkedIn link)           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Виконані зміни:**

| Файл | Зміни |
|------|-------|
| `telegram-scraper/index.ts` | Початкові кнопки: тільки image workflow або publish (якщо є відео) |
| `telegram-webhook/index.ts` | Нові callback handlers: `confirm_image`, `create_custom` |
| `telegram-webhook/index.ts` | Photo upload показує publish buttons після завантаження |
| `telegram-webhook/index.ts` | LinkedIn handler додає article URL + LinkedIn URL в кінці |

#### 2. Media Detection (Автоматична детекція медіа)

**Проблема:** Бот показував кнопки вибору зображення навіть коли пост містив відео.

**Рішення:** Автоматична детекція типу медіа:

```typescript
// telegram-scraper/index.ts
const hasVideo = videoUrl && videoType

if (hasVideo) {
  // 🎥 Video exists → Skip image workflow
  keyboard = {
    inline_keyboard: [
      [
        { text: '📰 В новини', callback_data: `publish_news_${newsId}` },
        { text: '📝 В блог', callback_data: `publish_blog_${newsId}` }
      ],
      [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
    ]
  }
} else {
  // 🖼️ No video → Show image workflow
  // ...
}
```

**Результат:**
- Якщо `video_url` існує → Одразу показуються кнопки публікації
- Якщо немає відео → Показується image workflow (Step 1)

**CRITICAL FIX (Dec 22):** Використання `uploadedPhotoUrl` замість `post.photoUrl`

**Проблема:** Бот використовував `post.photoUrl` (оригінальний URL з парсингу каналу), а не оновлений `photoUrl` після завантаження в Supabase Storage. Через це image workflow пропускався навіть коли зображення було успішно завантажено.

**Рішення:**
```typescript
// telegram-scraper/index.ts:471
sendToTelegramBot(..., photoUrl || null) // Pass uploaded photoUrl

// telegram-scraper/index.ts:875
const hasImage = uploadedPhotoUrl // Use uploaded, not original post.photoUrl
```

Тепер image workflow кнопки показуються **тільки** коли зображення реально завантажено в Supabase Storage.

#### 3. Longer Prompt Context (Більше контексту для AI)

**Проблема:** AI промпт для генерації опису зображення отримував тільки перші 1000 символів статті, що було недостатньо для розуміння контексту.

**Рішення:**

```typescript
// generate-image-prompt/index.ts (line 150)
// До
promptTemplate = promptTemplate.replace(/{content}/g, content.substring(0, 1000))

// Після
promptTemplate = promptTemplate.replace(/{content}/g, content.substring(0, 5000))
```

**Результат:** AI отримує в 5 разів більше контексту (5000 символів), що дозволяє краще зрозуміти суть статті та згенерувати релевантніший опис зображення.

#### 4. Display Source Links (Відображення посилань на джерела)

**Проблема:** Поле `source_link` (зовнішнє джерело статті, знайдене LLM) не відображалось у фінальній UI новин та блогу.

**Рішення:**

**NewsArticle.tsx (lines 226-238):**
```typescript
{(news.source_link || news.original_url) && (
  <div className="mb-8">
    <a
      href={news.source_link || news.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
    >
      <ExternalLink className="w-4 h-4" />
      Read Original Article
    </a>
  </div>
)}
```

**NewsModal.tsx (lines 445-448):**
```typescript
{((selectedNews as any).source_link || selectedNews.original_url) && (
  <a href={(selectedNews as any).source_link || selectedNews.original_url}>
    {t('news_read_more')}
  </a>
)}
```

**Результат:**
- `source_link` має пріоритет над `original_url`
- Показується як помітна кнопка "Read Original Article"
- Відкривається у новій вкладці з `noopener noreferrer`

### New Callback Handlers

| Callback | Опис | Наступний крок |
|----------|------|----------------|
| `confirm_image_${newsId}` | Підтверджує існуюче зображення або продовжує без зображення | Показує кнопки публікації |
| `create_custom_${newsId}` | Ініціює завантаження власного зображення | Чекає reply з фото |
| `publish_news_${newsId}` | Публікує як новину | Показує LinkedIn кнопки |
| `publish_blog_${newsId}` | Публікує як блог-пост | Показує LinkedIn кнопки |
| `linkedin_en/no/ua_${newsId}` | Публікує в LinkedIn | Показує фінальні посилання |

### Photo Upload Flow

```
1. Користувач натискає "📸 Створити своє"
   ↓
2. Бот оновлює повідомлення: "📸 Очікую фото..."
   ↓
3. Користувач відправляє фото як reply (Telegram Bot API)
   ↓
4. Бот завантажує фото через getFile API
   ↓
5. Зберігає в Supabase Storage (custom/ folder)
   ↓
6. Оновлює processed_image_url в базі даних
   ↓
7. Показує кнопки публікації [📰 В новини] [📝 В блог]
   ↓
8. При публікації: processed_image_url має ПРІОРИТЕТ над image_url
```

### Image Priority Logic

**Проблема:** Раніше завантажене зображення (`processed_image_url`) не використовувалось при публікації.

**Рішення:**
```typescript
// telegram-webhook/index.ts:611
imageUrl: news.processed_image_url || news.image_url || null
```

**Пріоритет:**
1. `processed_image_url` - власне завантажене зображення
2. `image_url` - оригінальне з Telegram каналу
3. `null` - немає зображення

Це гарантує що користувацькі зображення **реально використовуються** в опублікованих статтях.

### Deploy

```bash
cd supabase

# Deploy оновлені функції
supabase functions deploy telegram-scraper
supabase functions deploy telegram-webhook
supabase functions deploy generate-image-prompt
```

### Testing Checklist

- [ ] Posts з відео пропускають image workflow
- [ ] Posts без відео показують image workflow з правильними кнопками:
  - [ ] ✅ Залишити зображення
  - [ ] 📸 Згенерувати своє
- [ ] Підтвердження зображення показує publish buttons
- [ ] Custom image upload показує publish buttons після завантаження
- [ ] **Custom image реально використовується в публікації** (processed_image_url priority)
- [ ] **Image workflow показується тільки коли зображення завантажено** (uploadedPhotoUrl check)
- [ ] Публікація показує LinkedIn buttons
- [ ] LinkedIn post показує фінальні посилання (article + LinkedIn)
- [ ] Source links відображаються у NewsArticle та NewsModal
- [ ] AI промпт генерується з більшим контекстом (5000 chars)

### 5. Retry Logic для Pending News (December 22, 2024)

**Проблема:** Новини які пройшли AI модерацію (`approved`) але не були відправлені в Telegram бот (помилка/збій) застрягали в БД назавжди. При наступному скрапінгу вони пропускались як дублікати.

**Симптоми:**
- 200+ новин в Queue (admin panel)
- Новини не надходять в Telegram бот
- `pre_moderation_status = 'approved'` але `is_published = false`

**Рішення:**
```typescript
// telegram-scraper/index.ts:318-395
if (existingPost.pre_moderation_status === 'approved' &&
    !existingPost.is_published &&
    !existingPost.is_rewritten) {

  // 1. Generate image prompt
  // 2. Re-upload photo if needed
  // 3. Retry sending to Telegram bot
  console.log(`🔄 Retry sending approved but unpublished post to bot`)
}
```

**Що відбувається при retry:**
1. Генерується image prompt через Edge Function
2. Фото завантажується в Supabase Storage (якщо потрібно)
3. Повторна спроба відправки в Telegram бот
4. Логування результату (success/fail)

**Результат:** Всі approved новини які застрягли в черзі будуть автоматично відправлені в бот при наступному запуску scraper.

### 6. Debug Logging для Queue Diagnostics (December 22, 2024)

**Проблема:** 200+ новин в черзі, але жодні нові новини не надходять в Telegram бот. Логи показували що пости знайдені, але не оброблені.

**Симптоми:**
- Логи: "✅ Found 17 message elements"
- Але НЕ БУЛО логів: "🔄 Processing post ${messageId}"
- Всі пости відсіювалися, але невідомо чому

**Рішення:** Додано детальне логування для діагностики:

```typescript
// telegram-scraper/index.ts

// 1. Date range parsing
console.log(`📨 Found ${posts.length} posts`)
if (posts.length > 0) {
  const dates = posts.map(p => p.date).sort((a, b) => a.getTime() - b.getTime())
  const oldestDate = dates[0]
  const newestDate = dates[dates.length - 1]
  console.log(`📅 Parsed posts date range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`)
}

// 2. Date filtering with warnings
console.log(`📊 Filtering ${posts.length} parsed posts by date...`)
const newPosts = posts.filter(post => {
  const passesFilter = filterToDate
    ? (post.date >= filterFromDate && post.date <= filterToDate)
    : (post.date > filterFromDate)

  if (!passesFilter) {
    console.log(`⏭️ Skipping post ${post.messageId} (date ${post.date.toISOString()} outside filter range)`)
  }
  return passesFilter
})

// 3. Final count and warning
console.log(`✅ Found ${newPosts.length} post(s) matching date filter (out of ${posts.length} parsed)`)
if (newPosts.length === 0) {
  console.log(`⚠️ No posts passed date filter. Filter range: ${filterFromDate.toISOString()} to ${filterToDate ? filterToDate.toISOString() : 'now'}`)
}

// 4. Missing datetime warning
if (!datetime) {
  console.log(`⚠️ Post ${messageId} has no datetime attribute, using current time`)
}
```

**Що логується тепер:**

| Етап | Лог | Мета |
|------|-----|------|
| Parsing | `📅 Parsed posts date range: X to Y` | Показати діапазон спарсених дат |
| Filtering | `📊 Filtering N parsed posts by date...` | Скільки постів до фільтру |
| Skipped | `⏭️ Skipping post X (date Y outside filter range)` | Чому пост відсіяний |
| Result | `✅ Found N post(s) matching date filter (out of M parsed)` | Скільки пройшло фільтр |
| Warning | `⚠️ No posts passed date filter. Filter range: X to Y` | Якщо жоден не пройшов |
| Missing date | `⚠️ Post X has no datetime attribute` | Коли дата не спарсилась |

**Результат:** Тепер можемо точно діагностувати чому пости не обробляються:
- Чи всі пости старіші за last_fetched_at?
- Чи є проблеми з парсингом дат?
- Чи filter range налаштований правильно?

### 7. Deployment Troubleshooting & Version Logging (December 24, 2024)

**Проблема:** Supabase Edge Functions не оновлювались після GitHub Actions deployment, навіть коли workflow показував success. Функції продовжували виконувати старий код.

**Симптоми:**
- GitHub Actions workflow "Deploy Supabase Edge Functions" завершувався успішно
- Але Supabase function logs показували старий код (відсутні нові debug логи)
- Workflow output показував: "No change found in Function: telegram-scraper"
- Навіть після додавання dummy коментарів та merge PR

**Діагностика:**

1. **Перевірка версії в логах:**
```
# Старий код (до fix)
🕷️  Telegram Scraper started

# Новий код (після fix)
🕷️  Telegram Scraper v2024-12-24-01 started
📦 Features: Sequential workflow, media detection, debug logging, retry logic
```

2. **Перевірка GitHub Actions logs:**
- Відкрити https://github.com/SmmShaman/vitalii_claude-code-in-browser/actions
- Знайти workflow run "Deploy Supabase Edge Functions"
- Відкрити job "deploy"
- Розгорнути step "Deploy all functions"
- Шукати: `Deploying function: telegram-scraper`

**Очікуваний output при успішному deployment:**
```
Deploying function: telegram-scraper
Bundling Function: telegram-scraper
Deploying Function: telegram-scraper (script size: X.XXX MB)
Deployed Functions on project ***: telegram-scraper
```

**Очікуваний output коли Supabase пропускає deployment:**
```
No change found in Function: telegram-scraper
```

**Рішення:** Додано version logging для верифікації deployment:

```typescript
// supabase/functions/telegram-scraper/index.ts:89-91
// Version: 2024-12-24-01 - Sequential workflow + debug logging
console.log('🕷️  Telegram Scraper v2024-12-24-01 started')
console.log('📦 Features: Sequential workflow, media detection, debug logging, retry logic')

// supabase/functions/telegram-scraper/index.ts:636
console.log(`✅ Telegram Scraper v2024-12-24-01 finished successfully`)
```

**Як перевірити що deployment відбувся:**

1. Запустити функцію через Admin Panel або Edge Function endpoint
2. Перевірити Supabase Function Logs
3. Шукати рядок: `🕷️  Telegram Scraper v2024-12-24-01 started`
4. Якщо version присутній → deployment successful
5. Якщо version відсутній → функція все ще на старій версії

**Checksum Issue:**

Supabase CLI використовує checksums для визначення чи змінився код функції:
- Тільки зміни в коді викликають checksum change
- Зміни в коментарях можуть не змінити checksum (залежить від bundler)
- Найкращий спосіб force redeploy: змінити actual код (log statements, constants, тощо)

**Deployment через GitHub Actions:**

GitHub Actions workflow (`/.github/workflows/deploy-supabase.yml`) автоматично деплоїть при:
- Push до `main` branch
- Зміни в `supabase/functions/**` або `supabase/migrations/**`
- Manual workflow dispatch

**Manual deployment (альтернатива):**

Якщо GitHub Actions не спрацьовує:
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login --token YOUR_ACCESS_TOKEN

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy specific function
supabase functions deploy telegram-scraper --no-verify-jwt

# Deploy all functions
for dir in supabase/functions/*/; do
  if [ -d "$dir" ] && [ "$(basename $dir)" != "_shared" ]; then
    func_name=$(basename $dir)
    supabase functions deploy $func_name --no-verify-jwt
  fi
done
```

---
