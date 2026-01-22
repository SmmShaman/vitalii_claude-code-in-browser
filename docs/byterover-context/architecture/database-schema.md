## Database Schema (Supabase PostgreSQL)

### Main Tables

#### `news` - Новини
```sql
id                      UUID PRIMARY KEY
source_id               UUID (FK → news_sources)
original_title          TEXT
original_content        TEXT
original_url            TEXT
title_en, title_no, title_ua       TEXT (мультимовні заголовки)
content_en, content_no, content_ua TEXT (мультимовний контент)
description_en, description_no, description_ua TEXT
slug_en, slug_no, slug_ua          TEXT (SEO-friendly URLs)
image_url               TEXT (оригінальне зображення)
processed_image_url     TEXT (користувацьке зображення)
video_url               TEXT
video_type              TEXT ('youtube' | 'telegram_embed' | 'direct_url')
tags                    TEXT[] (масив тегів)
source_link             TEXT (зовнішнє джерело)
published_at            TIMESTAMPTZ
created_at, updated_at  TIMESTAMPTZ
is_rewritten            BOOLEAN (AI переписав)
is_published            BOOLEAN (опубліковано на сайті)
pre_moderation_status   TEXT ('pending' | 'approved' | 'rejected')
rejection_reason        TEXT
views_count             INTEGER
linkedin_post_id        TEXT
linkedin_language       TEXT
linkedin_posted_at      TIMESTAMPTZ
image_generation_prompt TEXT (AI prompt для зображення)
prompt_generated_at     TIMESTAMPTZ
```

#### `blog_posts` - Блог-пости
```sql
id                      UUID PRIMARY KEY
author_id               UUID (FK → users, nullable)
source_news_id          UUID (FK → news, якщо створено з новини)
title_en, title_no, title_ua       TEXT
content_en, content_no, content_ua TEXT
description_en, description_no, description_ua TEXT
slug_en, slug_no, slug_ua          TEXT
image_url, cover_image_url         TEXT
processed_image_url     TEXT
video_url, video_type   TEXT
tags                    TEXT[]
category                TEXT
reading_time            INTEGER (хвилини)
is_published            BOOLEAN
is_featured             BOOLEAN
views_count             INTEGER
published_at            TIMESTAMPTZ
linkedin_post_id, linkedin_language, linkedin_posted_at
```

#### `news_sources` - Джерела новин
```sql
id                      UUID PRIMARY KEY
name                    TEXT
url                     TEXT (base URL)
rss_url                 TEXT (RSS feed URL)
source_type             TEXT ('rss' | 'telegram' | 'web')
is_active               BOOLEAN
fetch_interval          INTEGER (секунди)
last_fetched_at         TIMESTAMPTZ
category                TEXT
```

#### `ai_prompts` - AI промпти
```sql
id                      UUID PRIMARY KEY
name                    TEXT (назва в UI)
description             TEXT
prompt_text             TEXT (повний текст промпту)
prompt_type             TEXT ('pre_moderation' | 'news_rewrite' | 'blog_rewrite' | 'image_generation')
is_active               BOOLEAN
usage_count             INTEGER
created_at, updated_at  TIMESTAMPTZ
```

#### `users` - Адміністратори
```sql
id                      UUID PRIMARY KEY
email                   TEXT UNIQUE
password_hash           TEXT
full_name               TEXT
role                    TEXT ('admin' | 'editor')
is_active               BOOLEAN
last_login_at           TIMESTAMPTZ
```

#### `tags` - Теги
```sql
id                      UUID PRIMARY KEY
name_en, name_no, name_ua TEXT
slug                    TEXT UNIQUE
usage_count             INTEGER
```

#### `contact_forms` - Контактні форми
```sql
id                      UUID PRIMARY KEY
name                    TEXT
email                   TEXT
message                 TEXT
created_at              TIMESTAMPTZ
```

### Database Views

```sql
-- latest_news: Останні опубліковані новини з джерелами
SELECT n.*, s.name as source_name
FROM news n
JOIN news_sources s ON n.source_id = s.id
WHERE n.is_published = true
ORDER BY n.published_at DESC

-- latest_blog_posts: Останні опубліковані блог-пости
SELECT * FROM blog_posts
WHERE is_published = true
ORDER BY published_at DESC
```

---
