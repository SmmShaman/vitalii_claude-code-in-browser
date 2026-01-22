## CI/CD Pipelines (GitHub Actions)

### `.github/workflows/deploy.yml` - Netlify Deployment

**Тригери:**
- Push до `main` branch
- Pull Requests
- Manual dispatch

**Кроки:**
1. Checkout коду
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Build Next.js (`netlify build`)
5. Deploy (preview для PR, production для push)

### `.github/workflows/deploy-supabase.yml` - Edge Functions

**Тригери:**
- Push до `main` з змінами в `supabase/functions/**` або `supabase/migrations/**`
- Manual dispatch

**Кроки:**
1. Checkout коду
2. Setup Supabase CLI
3. Login з access token
4. Link project
5. Deploy всі functions (loop через директорії)
6. Run migrations

**Environment Secrets (GitHub):**
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

### `.github/workflows/realtime-scraper.yml` - Real-time News Scraper

**Тригери:**
- Cron: `*/10 * * * *` (кожні 10 хвилин)
- Manual dispatch

**Логіка:**
- Round-robin вибір каналу на основі хвилини годин
- 6 каналів × 10 хв = 60 хв повний цикл
- Уникає Edge Function timeout обробляючи по одному каналу

| Хвилина | Індекс | Канал |
|---------|--------|-------|
| 00-09 | 0 | HOT DIGITAL |
| 10-19 | 1 | tips_ai |
| 20-29 | 2 | geekneural |
| 30-39 | 3 | TheOpen_Ai |
| 40-49 | 4 | dailyprompts |
| 50-59 | 5 | Нейронавт |

### `.github/workflows/process-video.yml` - Video Processing

**Тригери:**
- Cron: `*/30 * * * *` (кожні 30 хвилин)
- Repository dispatch: `process-video`
- Manual dispatch

**Процес:**
1. Завантаження відео з Telegram через MTKruto (MTProto)
2. Завантаження на YouTube (unlisted)
3. Оновлення `video_url` та `video_type` в БД

**Environment Variables:**
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH`, `TELEGRAM_BOT_TOKEN`
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

### `.github/workflows/linkedin-video.yml` - LinkedIn Native Video

**Тригери:**
- Repository dispatch: `linkedin-video`
- Manual dispatch

**Процес:**
1. Завантаження відео з Telegram (original_video_url)
2. Реєстрація upload в LinkedIn API
3. Завантаження відео на LinkedIn
4. Створення поста з native video

### Netlify Configuration

**ВАЖЛИВО:** Netlify auto-builds вимкнено (`stop_builds: true`).

Deployment відбувається тільки через GitHub Actions:
```
git push → GitHub Actions → netlify build → netlify deploy --prod → vitalii.no
```

Це запобігає дублюванню білдів та помилкам через відсутність env vars в Netlify auto-build.

---
