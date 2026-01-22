## Bug Fixes & Improvements (December 2024 - Session 2)

### Опис

Виправлення критичних помилок у Supabase Edge Functions для коректної роботи пре-модерації та публікації контенту.

### Файли

```
├── supabase/functions/pre-moderate-news/index.ts   # Azure OpenAI deployment fix
├── supabase/functions/post-to-linkedin/index.ts    # URL format fix
├── supabase/functions/process-blog-post/index.ts   # Video data saving fix
```

### 1. Azure OpenAI Deployment Fix (`pre-moderate-news`)

**Проблема:** Функція пре-модерації використовувала неіснуючий deployment `gpt-4`, що призводило до помилки `DeploymentNotFound` і тихого провалу пре-модерації.

**Симптоми:**
- `usage_count` не інкрементувався
- Пре-модерація не працювала
- Помилка в логах: `DeploymentNotFound`

**Рішення:**
```typescript
// До
const deploymentName = 'gpt-4';

// Після
const deploymentName = 'Jobbot-gpt-4.1-mini';
```

Тепер використовується той самий deployment, що й в інших функціях проекту.

### 2. LinkedIn URL Format Fix (`post-to-linkedin`)

**Проблема:** Функція додавала мовні префікси (`/no/`, `/uk/`) до URL, але Next.js роути не мають таких префіксів - мова обробляється client-side через контекст.

**Симптоми:**
- Посилання в LinkedIn постах вели на 404
- URL виглядав як: `https://vitalii.no/no/news/slug`

**Рішення:**
```typescript
// До
const articleUrl = `https://vitalii.no/${language === 'en' ? '' : language + '/'}news/${slug}`;

// Після
const articleUrl = `https://vitalii.no/news/${slug}`;
```

Тепер URL коректний: `https://vitalii.no/news/slug`

### 3. Blog Post Video Data Fix (`process-blog-post`)

**Проблема:** При створенні блог-постів `video_url` та `video_type` передавались з `telegram-webhook`, але не зберігались в базу даних.

**Симптоми:**
- Блог-пости без відео, навіть якщо оригінальна новина мала відео
- `video_url` та `video_type` завжди `null` в `blog_posts`

**Рішення:**
```typescript
// Додано до INSERT запиту
const { data, error } = await supabaseClient
  .from('blog_posts')
  .insert({
    // ... інші поля
    video_url: videoUrl,      // Додано
    video_type: videoType,    // Додано
  })
```

### Deploy команди

```bash
cd supabase
supabase functions deploy pre-moderate-news
supabase functions deploy post-to-linkedin
supabase functions deploy process-blog-post
```

---
