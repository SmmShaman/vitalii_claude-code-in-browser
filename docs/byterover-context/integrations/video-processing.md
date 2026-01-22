## Video Handling & YouTube Integration (December 2024)

### Опис

Автоматичне завантаження відео з Telegram каналів на YouTube для надійного вбудовування на сайті. Використовується MTKruto (MTProto для Deno) для обходу ліміту 20 MB в Telegram Bot API.

### Чому YouTube + MTKruto?

| Критерій | YouTube | Альтернативи |
|----------|---------|--------------|
| Вартість | ✅ Безкоштовно | Bunny.net ~$1-3/міс |
| Інфраструктура | ✅ Вже налаштовано | Нові сервіси |
| Зміни в коді | ✅ Мінімальні | Значні |

**Проблема була не в YouTube, а в Telegram Bot API (ліміт 20 MB).**

### Файли

```
├── supabase/functions/telegram-scraper/index.ts   # Video extraction + YouTube upload
├── supabase/functions/_shared/youtube-helpers.ts  # YouTube API helpers
├── components/sections/NewsSection.tsx            # Video player (YouTube/fallback)
├── components/sections/NewsModal.tsx              # Video player (YouTube/fallback)
├── app/news/[slug]/NewsArticle.tsx                # Standalone news page with video
```

### Video Types

| Type | Опис | Джерело |
|------|------|---------|
| `youtube` | YouTube embed URL | Завантажено на YouTube |
| `telegram_embed` | Telegram post URL | Fallback коли YouTube недоступний |
| `direct_url` | Пряме посилання на .mp4 | Рідко використовується |

### Workflow обробки відео

```
1. Scraper знаходить відео в Telegram пості
   ↓
2. MTKruto скачує відео в /tmp (до 512 MB на Pro)
   ↓
3. YouTube credentials налаштовані?
   ├─ ТАК → Перекласти заголовок (Azure OpenAI)
   │        → Завантажити на YouTube (unlisted)
   │        → video_type = 'youtube'
   │        → video_url = 'https://youtube.com/embed/...'
   │
   └─ НІ (або помилка) → Fallback на Telegram embed
                        → video_type = 'telegram_embed'
                        → video_url = 'https://t.me/channel/123?embed=1'
   ↓
4. Файл в /tmp автоматично видаляється
```

### MTKruto (MTProto для Deno)

Замінює Telegram Bot API для обходу ліміту 20 MB:

```typescript
import { Client } from "https://deno.land/x/mtkruto/mod.ts";

const client = new Client({
  apiId: Number(Deno.env.get("TELEGRAM_API_ID")),
  apiHash: Deno.env.get("TELEGRAM_API_HASH")!,
});

async function downloadVideo(chatId: number, messageId: number): Promise<string> {
  await client.start({ botToken: Deno.env.get("TELEGRAM_BOT_TOKEN")! });

  const message = await client.getMessage(chatId, messageId);

  // Скачати в /tmp (до 512 MB на Supabase Pro)
  const tempPath = `/tmp/video_${messageId}.mp4`;
  await client.downloadMedia(message, tempPath);

  return tempPath;
}
```

**Переваги MTKruto:**
- ✅ Нативна Deno бібліотека — працює в Supabase Edge Functions
- ✅ Ліміт 2 GB замість 20 MB
- ✅ Використовує Bot Token — не потрібен user session
- ✅ Активно підтримується

### Supabase Edge Function ліміти

| Ресурс | Free | Pro |
|--------|------|-----|
| Ephemeral storage (/tmp) | 256 MB | **512 MB** |
| Wall clock time | 150 сек | **400 сек** |
| Background tasks | ✅ | ✅ |

> Типові відео 5-10 хв = 100-400 MB — влазить в /tmp

### Fallback стратегія

```typescript
try {
  // Спробувати MTKruto
  videoPath = await downloadWithMTKruto(chatId, messageId);
  youtubeUrl = await uploadToYouTube(videoPath, title);
  return { video_type: 'youtube', video_url: youtubeUrl };
} catch (error) {
  console.error('Video processing failed:', error);
  // Fallback на telegram_embed
  return { video_type: 'telegram_embed', video_url: telegramPostUrl };
}
```

### YouTube OAuth Setup

**Credentials (вже налаштовані):**
```env
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_REFRESH_TOKEN=1//04...
```

**Отримання Refresh Token:**
1. Відкрити [Google OAuth Playground](https://developers.google.com/oauthplayground/)
2. ⚙️ → "Use your own OAuth credentials" → ввести Client ID та Secret
3. Вибрати scope: `https://www.googleapis.com/auth/youtube.upload`
4. Authorize APIs → Exchange authorization code for tokens
5. Скопіювати Refresh Token

### Environment Variables

```env
# Telegram MTProto (MTKruto)
TELEGRAM_API_ID=35388773
TELEGRAM_API_HASH=aa3d654a6327701da78c0f44e1a47993
TELEGRAM_BOT_TOKEN=existing_bot_token

# YouTube API
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_REFRESH_TOKEN=1//04...

# Azure OpenAI (для перекладу заголовків)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_key
```

### Telegram Video Fallback UI

Коли `video_type = 'telegram_embed'`, показується плейсхолдер:

```
┌─────────────────────────────────────────┐
│     [Gradient: #2AABEE → #229ED9]       │
│                                         │
│           [Telegram Logo]               │
│                                         │
│          @channelname                   │
│                                         │
│    ▶ Дивитись в Telegram                │
│                                         │
└─────────────────────────────────────────┘
```

### Документація

- [MTKruto GitHub](https://github.com/MTKruto/MTKruto)
- [MTKruto Deno](https://deno.land/x/mtkruto)
- [YouTube Data API](https://developers.google.com/youtube/v3)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---
