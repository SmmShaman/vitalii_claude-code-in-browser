## Instagram Video/Reels via GitHub Actions (January 2025)

### Опис

Завантаження відео в Instagram Reels через GitHub Actions. Необхідно тому що Instagram API вимагає **прямий URL на MP4 файл**, а не Telegram post URL (`https://t.me/channel/123`).

### Архітектура

```
Telegram канал (оригінальне відео)
         │
         ├──► process-video.yml ──► YouTube (для сайту)
         │
         ├──► linkedin-video.yml ──► LinkedIn (native upload)
         │
         ├──► facebook-video.yml ──► Facebook (native upload)
         │
         └──► instagram-video.yml ──► Instagram Reels (native upload)
```

### Файли

```
├── .github/workflows/instagram-video.yml      # GitHub Actions workflow
├── scripts/instagram-video/
│   ├── index.js                               # Main uploader script
│   └── package.json                           # Dependencies (@mtkruto/node)
├── supabase/functions/_shared/github-actions.ts  # triggerInstagramVideo()
├── supabase/functions/telegram-webhook/index.ts  # Тригер при кліку на кнопку
└── supabase/functions/post-to-instagram/index.ts # Fallback до зображення
```

### Workflow

```
User clicks "📸 Instagram EN" in Telegram bot
    │
    ├─► Has Telegram video URL + GH_PAT configured?
    │       │
    │       ├─► YES → Trigger instagram-video GitHub Action
    │       │         → Download video from Telegram (MTKruto)
    │       │         → Upload to Supabase Storage (public URL)
    │       │         → Create Instagram Reel via Graph API
    │       │         → Update DB with instagram_post_id
    │       │
    │       └─► NO → Continue to fallback
    │
    ├─► Has valid image?
    │       │
    │       └─► YES → Post image via post-to-instagram Edge Function
    │
    └─► NO image, NO valid video
            │
            └─► Prompt user to upload image
```

### Instagram Reels API Flow (в scripts/instagram-video/index.js)

```javascript
// 1. Upload video to Supabase Storage for public URL
const publicUrl = await uploadToSupabaseStorage(videoBuffer, newsId)

// 2. Create media container (REELS type)
POST /{ig-user-id}/media
{
  media_type: 'REELS',
  video_url: publicUrl,
  caption: '...',
  share_to_feed: true
}

// 3. Poll container status until FINISHED (max 5 min)
GET /{container-id}?fields=status_code
// status_code: IN_PROGRESS → FINISHED | ERROR

// 4. Publish the Reel
POST /{ig-user-id}/media_publish
{ creation_id: container_id }
```

### Вимоги до відео для Instagram Reels

| Параметр | Вимога |
|----------|--------|
| Формат | MP4 (H.264, AAC) |
| Тривалість | 3-90 секунд |
| Розмір | до 1 GB |
| Aspect ratio | 9:16 (вертикальне) або 1:1 |
| URL | Публічний HTTPS |

### Database Fields

Після успішної публікації оновлюються поля в таблиці `news`:

```sql
instagram_post_id      TEXT      -- ID поста в Instagram
instagram_posted_at    TIMESTAMPTZ -- Час публікації
instagram_language     TEXT      -- Мова публікації (en/no/ua)
```

### Environment Variables (GitHub Secrets)

```env
# Telegram MTProto (MTKruto)
TELEGRAM_API_ID=xxxxx
TELEGRAM_API_HASH=xxxxx
TELEGRAM_BOT_TOKEN=xxxxx

# Instagram (via Facebook Graph API)
FACEBOOK_PAGE_ACCESS_TOKEN=xxxxx
INSTAGRAM_ACCOUNT_ID=xxxxx

# Supabase
SUPABASE_URL=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# GitHub (для тригеру з Edge Function)
GH_PAT=xxxxx  # Personal Access Token з repo scope
```

### Telegram Bot UI

При натисканні на Instagram кнопку з відео:

```
⏳ Instagram Reel (EN) обробляється...
Відео завантажується з Telegram → Instagram. Це займе 2-5 хвилин.
```

### Fallback логіка

1. **Є Telegram відео + GH_PAT** → GitHub Actions завантажує як Reel
2. **GH Actions не налаштований або помилка + є зображення** → Постить зображення
3. **Немає ні відео ні зображення** → Просить завантажити фото

### Manual Trigger

```bash
# Через GitHub Actions UI
# Settings → Secrets → Add repository secrets

# Або через API
curl -X POST \
  -H "Authorization: token ${GH_PAT}" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/SmmShaman/vitalii_claude-code-in-browser/dispatches \
  -d '{"event_type":"instagram-video","client_payload":{"news_id":"uuid-here","language":"en"}}'
```

### Troubleshooting

| Проблема | Причина | Рішення |
|----------|---------|---------|
| "Video processing timeout" | Відео занадто велике або формат не підтримується | Перевірте розмір (<1GB) та формат (MP4) |
| "Error #100: Invalid parameter" | URL не публічний або не HTTPS | Перевірте Supabase Storage bucket публічний |
| "Error #10: Permission denied" | Токен без `instagram_content_publish` | Перегенеруйте токен з потрібними scopes |
| GitHub Action не тригериться | GH_PAT не налаштований | Додайте GH_PAT в Supabase Secrets |

---
