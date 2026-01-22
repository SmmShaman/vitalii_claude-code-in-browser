## LinkedIn Integration (December 2024, Updated December 2024)

### Опис

Публікація новин та блог-постів у LinkedIn через Telegram бота. Підтримка трьох мов: English, Norwegian, Ukrainian. Нативне завантаження зображень.

### Файли

```
├── supabase/functions/post-to-linkedin/index.ts  # LinkedIn API + native image upload
├── supabase/functions/telegram-webhook/index.ts  # Callback handlers + bot messages
├── supabase/functions/telegram-scraper/index.ts  # Кнопки модерації
```

### Workflow

1. Новина проходить модерацію в Telegram боті
2. Модератор натискає "📰 В новини" або "📝 В блог" для публікації
3. Після публікації модератор може натиснути одну з кнопок LinkedIn:
   - `🔗 LinkedIn EN` - публікація англійською
   - `🔗 LinkedIn NO` - публікація норвезькою
   - `🔗 LinkedIn UA` - публікація українською
4. Контент публікується в LinkedIn з посиланням на статтю

### Telegram Bot Keyboard

```
┌─────────────────────┬─────────────────────┐
│    📰 В новини      │     📝 В блог       │
├─────────────────────┼──────────┬──────────┤
│   🔗 LinkedIn EN    │ LinkedIn │ LinkedIn │
│                     │    NO    │    UA    │
├─────────────────────┴──────────┴──────────┤
│               ❌ Reject                    │
└───────────────────────────────────────────┘
```

### 📨 Сповіщення в боті (не popup!)

Всі сповіщення про LinkedIn публікацію відправляються як **повідомлення в боті**, а не як popup alert:

**При успішній публікації:**
```
✅ Опубліковано в LinkedIn (UA)!

📰 «Заголовок статті»
🔗 Переглянути пост
```

**При спробі повторної публікації:**
```
⚠️ Вже опубліковано в LinkedIn (UA)!

🔗 Переглянути пост
```

### 🛡️ Захист від дублікатів (Duplicate Safeguards)

Система запобігає повторній публікації:

**Для News/Blog:**
```typescript
if (news.is_published || news.is_rewritten) {
  // Показує: "⚠️ Ця новина вже опублікована!"
  // Прибирає кнопки публікації, залишає тільки LinkedIn
}
```

**Для LinkedIn:**
```typescript
if (news.linkedin_post_id) {
  // Відправляє повідомлення в бот (не popup!)
  // Прибирає LinkedIn кнопки, показує посилання на пост
}
```

### 🖼️ Нативне завантаження зображень (Native Image Upload)

LinkedIn тепер отримує зображення через **нативний upload** замість thumbnail URL:

```typescript
// Workflow завантаження зображення
async function uploadImageToLinkedIn(imageUrl: string): Promise<string | null> {
  // 1. Реєстрація завантаження
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: LINKEDIN_PERSON_URN,
        // ...
      }
    })
  })

  // 2. Завантаження зображення з джерела
  const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())

  // 3. Завантаження на LinkedIn
  await fetch(uploadUrl, {
    method: 'PUT',
    body: imageBuffer
  })

  return asset // urn:li:digitalmediaAsset:xxxxx
}
```

**Дві категорії постів:**
- **IMAGE** - коли зображення успішно завантажено (з asset URN)
- **ARTICLE** - fallback коли зображення немає або upload не вдався

> **Примітка:** Native video upload реалізовано через GitHub Actions. Див. секцію "Video Processing via GitHub Actions" нижче.

### LinkedIn API

Використовується **UGC Post API** (User Generated Content):
- Endpoint: `https://api.linkedin.com/v2/ugcPosts`
- Assets API: `https://api.linkedin.com/v2/assets?action=registerUpload`
- Метод: POST
- Формат: IMAGE (з завантаженим зображенням) або ARTICLE (link preview)
- URL: `https://vitalii.no/news/{slug}` (реальний домен)

### Що публікується

```
{Заголовок статті}

{Повний опис статті - до 2500 символів}

🔗 Read more: https://vitalii.no/news/{slug}
```

### Database Fields

Після публікації в LinkedIn додаються поля:
- `linkedin_post_id` - ID поста в LinkedIn
- `linkedin_posted_at` - Дата публікації
- `linkedin_language` - Мова публікації (en/no/ua)

### Environment Variables (LinkedIn)

```env
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:your_person_id
```

### Отримання LinkedIn Access Token

1. Створити додаток на [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Додати продукт "Share on LinkedIn" та "Sign In with LinkedIn using OpenID Connect"
3. Отримати OAuth 2.0 токен через authorization flow
4. Scope: `w_member_social` (для публікації постів)

### Важливо

- LinkedIn Access Token має обмежений термін дії (60 днів)
- Для оновлення токена потрібен refresh flow
- `LINKEDIN_PERSON_URN` - це ваш унікальний ID в форматі `urn:li:person:xxxxx`
- Можна знайти через LinkedIn API: `GET /v2/me`

### Deploy

```bash
# Deploy LinkedIn function
cd supabase
supabase functions deploy post-to-linkedin
supabase functions deploy telegram-webhook

# Set secrets
supabase secrets set LINKEDIN_ACCESS_TOKEN="your_token"
supabase secrets set LINKEDIN_PERSON_URN="urn:li:person:xxxxx"
```

---
