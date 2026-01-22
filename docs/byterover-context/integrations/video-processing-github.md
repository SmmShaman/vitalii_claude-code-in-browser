## Video Processing via GitHub Actions (January 2025)

### Опис

Обробка відео винесена в GitHub Actions для обходу лімітів Supabase Edge Functions. Це дозволяє:
- Обробляти великі відео (>512 MB)
- Уникати timeout Edge Functions (150-400 сек)
- Завантажувати native video в LinkedIn

### Архітектура

```
┌─────────────────────────────────────────────────────────────────┐
│                    GitHub Actions Runners                        │
│  ┌──────────────────┐       ┌──────────────────────────────┐    │
│  │  process-video   │       │     linkedin-video           │    │
│  │  (Telegram→YT)   │       │  (Telegram→LinkedIn native)  │    │
│  └────────┬─────────┘       └──────────────┬───────────────┘    │
│           │                                 │                    │
│           └───────────┬─────────────────────┘                    │
│                       ▼                                          │
│               MTKruto (MTProto)                                  │
│               Download from Telegram                             │
└─────────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External APIs                               │
│  ┌──────────────────┐       ┌──────────────────────────────┐    │
│  │   YouTube API    │       │      LinkedIn API             │    │
│  │  (unlisted upload)│       │  (native video upload)       │    │
│  └──────────────────┘       └──────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Скрипти

#### `scripts/video-processor/index.js`
- Завантажує відео з Telegram через MTKruto
- Завантажує на YouTube (unlisted)
- Оновлює `video_url` та `video_type` в Supabase
- Зберігає `original_video_url` для LinkedIn

#### `scripts/linkedin-video/index.js`
- Завантажує відео з Telegram (original_video_url)
- Реєструє upload в LinkedIn API
- Завантажує як native video
- Створює пост з відео

### Database Fields

```sql
-- Додано в таблицю news
original_video_url      TEXT    -- Оригінальний Telegram URL для LinkedIn
video_processing_error  TEXT    -- Помилка обробки (для debug)
video_processing_attempted_at TIMESTAMPTZ -- Час останньої спроби
```

### Тригери

**Автоматичний:**
- `process-video` запускається кожні 30 хвилин для batch processing

**Через Edge Function:**
```typescript
// telegram-webhook викликає при публікації новини з відео
if (news.original_video_url && news.is_published) {
  await triggerLinkedInVideo({ newsId: news.id, language: 'en' })
}
```

### Environment Variables (GitHub Secrets)

```env
# Telegram MTProto
TELEGRAM_API_ID=xxxxx
TELEGRAM_API_HASH=xxxxx
TELEGRAM_BOT_TOKEN=xxxxx

# YouTube
YOUTUBE_CLIENT_ID=xxxxx
YOUTUBE_CLIENT_SECRET=xxxxx
YOUTUBE_REFRESH_TOKEN=xxxxx

# LinkedIn
LINKEDIN_ACCESS_TOKEN=xxxxx
LINKEDIN_PERSON_URN=urn:li:person:xxxxx

# Supabase
SUPABASE_URL=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

---
