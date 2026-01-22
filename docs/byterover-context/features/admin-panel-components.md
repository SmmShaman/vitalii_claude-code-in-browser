## Admin Panel - New Components

### LinkedInPostsManager

**Файл:** `components/admin/LinkedInPostsManager.tsx`

Управління LinkedIn публікаціями.

**Функціонал:**
- Список всіх news/blog з LinkedIn post ID
- Metadata: тип, заголовок, мова, дата
- Статистика (загальна кількість, по мовах)
- Repost функціональність (перепублікація іншою мовою)
- Зовнішні посилання на статті та LinkedIn пости

### ImageProcessingSettings

**Файл:** `components/admin/ImageProcessingSettings.tsx`

Налаштування AI промптів для обробки зображень через Google Gemini.

**Сезонні теми:**

| ID | Назва | Іконка | Опис |
|-----|-------|--------|------|
| christmas | 🎄 Різдвяний | Snowflake | Warm holiday lighting, cozy winter |
| spring | 🌸 Весняний | Flower2 | Fresh, vibrant, optimistic |
| easter | 🐰 Пасхальний | Star | Warm, pastel tones |
| summer | ☀️ Літній | Sun | Bright, energetic |
| autumn | 🍂 Осінній | Leaf | Golden/orange, cozy |
| valentine | 💝 Валентина | Heart | Romantic, pink/red accents |

**База даних:** Промпти зберігаються в `ai_prompts` з типом `image_linkedin_optimize`

### APIKeysSettings

**Файл:** `components/admin/APIKeysSettings.tsx`

Управління зовнішніми API ключами.

**Підтримувані ключі:**

| Key Name | Опис | Документація |
|----------|------|--------------|
| `GOOGLE_API_KEY` | Gemini AI image processing | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `LINKEDIN_ACCESS_TOKEN` | OAuth2 token | [LinkedIn Developer Portal](https://linkedin.com/developers/apps) |
| `LINKEDIN_PERSON_URN` | User ID (urn:li:person:xxx) | LinkedIn API /v2/me |

**Функції:**
- Show/hide password fields
- Copy to clipboard
- Test API key
- Save to `api_settings` table

---

