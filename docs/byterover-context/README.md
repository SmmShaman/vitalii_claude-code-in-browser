# ByteRover Context - Повна історія проекту

Ця директорія містить **повну історію** проекту Vitalii Berbeha Portfolio (174k символів), розбиту на 42 структуровані markdown файли для збереження в ByteRover context service.

## 📊 Статистика

- **Оригінальний CLAUDE.md:** 174,001 символів, 4,444 рядки
- **Скорочений CLAUDE.md:** 15,553 символів, 509 рядків (**91% скорочення**)
- **Файлів в docs/byterover-context/:** 42 файли
- **Загальний розмір контексту:** ~130k символів

---

## 📁 Структура директорій

```
docs/byterover-context/
├── integrations/     (6 файлів)  - Соціальні мережі, відео, AI тизери
├── features/         (11 файлів) - Основні фічі проекту
├── bugfixes/         (6 файлів)  - Історія багів з датами
├── architecture/     (7 файлів)  - Архітектурні рішення
├── implementation/   (12 файлів) - Детальні імплементації
├── README.md         - Цей файл
└── curate-all.sh     - Bash скрипт для curation
```

---

## 🔗 Integrations (6 файлів)

### LinkedIn Integration
**Файл:** `integrations/linkedin-integration.md` (4,934 chars)
**Що містить:**
- OAuth 2.0 UGC Post API workflow
- Native image upload через Assets API
- Три мови (EN/NO/UA)
- Duplicate prevention через social_media_posts table
- Telegram bot keyboard структура
- Troubleshooting (token expires after 60 days)

**Файли коду:** `supabase/functions/post-to-linkedin/`, `telegram-webhook/`

**Curate команда:**
```bash
brv curate "$(cat integrations/linkedin-integration.md)" --files supabase/functions/post-to-linkedin/index.ts
```

---

### Instagram Integration
**Файл:** `integrations/instagram-integration.md` (3,761 chars)
**Що містить:**
- Facebook Graph API для Business accounts
- Required scopes: instagram_basic + instagram_content_publish
- Error handling (#10, #190, #100, #24)
- Debug mode для токена
- Token generation step-by-step
- Instagram account ID отримання

**Файли коду:** `supabase/functions/post-to-instagram/`, `_shared/facebook-helpers.ts`

**Curate команда:**
```bash
brv curate "$(cat integrations/instagram-integration.md)" --files supabase/functions/post-to-instagram/index.ts
```

---

### Instagram Video/Reels
**Файл:** `integrations/instagram-video-reels.md` (4,691 chars)
**Що містить:**
- Instagram Reels API flow через GitHub Actions
- MTKruto для завантаження з Telegram
- Media container polling (max 5 min)
- Video requirements (3-90 sec, MP4, 9:16 aspect)
- Troubleshooting

**Файли коду:** `scripts/instagram-video/`, `.github/workflows/instagram-video.yml`

**Curate команда:**
```bash
brv curate "$(cat integrations/instagram-video-reels.md)" --files scripts/instagram-video/index.js
```

---

### Video Processing & YouTube
**Файл:** `integrations/video-processing.md` (5,240 chars)
**Що містить:**
- Чому YouTube (vs Bunny.net - $$ savings)
- MTKruto bypass 20MB Telegram limit (supports 2GB)
- YouTube OAuth setup
- Fallback strategies (telegram_embed)
- Edge Function limits (512MB /tmp)

**Файли коду:** `supabase/functions/telegram-scraper/`, `_shared/youtube-helpers.ts`

**Curate команда:**
```bash
brv curate "$(cat integrations/video-processing.md)" --files supabase/functions/telegram-scraper/index.ts
```

---

### Video Processing via GitHub Actions
**Файл:** `integrations/video-processing-github.md` (3,035 chars)
**Що містить:**
- Чому GitHub Actions (bypasses Edge Function limits)
- MTKruto integration
- Batch processing (every 30 min)
- Database fields

**Файли коду:** `scripts/video-processor/`, `.github/workflows/process-video.yml`

**Curate команда:**
```bash
brv curate "$(cat integrations/video-processing-github.md)" --files scripts/video-processor/index.js
```

---

### AI Social Media Teasers
**Файл:** `integrations/ai-social-teasers.md` (2,869 chars)
**Що містить:**
- Platform-specific AI content generation
- Caching strategy (social_teaser_* fields)
- Prompt types per platform
- Example outputs

**Файли коду:** `supabase/functions/generate-social-teasers/`

**Curate команда:**
```bash
brv curate "$(cat integrations/ai-social-teasers.md)" --files supabase/functions/generate-social-teasers/index.ts
```

---

## ⚙️ Features (11 файлів)

### AI Image Generation & Upload
**Файл:** `features/ai-image-generation.md` (8,156 chars)
**Що містить:**
- Azure OpenAI prompt generation
- Human-centered approach (людино-орієнтований промпт)
- Telegram bot upload workflow
- Supabase Storage structure
- Image selection flow

**Файли коду:** `supabase/functions/generate-image-prompt/`, `telegram-webhook/`

**Curate команда:**
```bash
brv curate "$(cat features/ai-image-generation.md)" --files supabase/functions/generate-image-prompt/index.ts
```

---

### Professional Image Prompts
**Файл:** `features/professional-image-prompts.md` (8,796 chars)
**Що містить:**
- Two-stage system (Classifier → Template)
- awesome-nanobanana-pro methodology
- Categories: tech_product, marketing_campaign, ai_research, etc.
- Color schemes per category
- Placeholders system
- Example: Icelandair campaign

**Файли коду:** `supabase/functions/generate-image-prompt/`

**Curate команда:**
```bash
brv curate "$(cat features/professional-image-prompts.md)" --files supabase/functions/generate-image-prompt/index.ts
```

---

### SEO Optimization
**Файл:** `features/seo-optimization.md` (3,794 chars)
**Що містить:**
- JSON-LD schemas (BlogPosting, NewsArticle, BreadcrumbList)
- Open Graph, Twitter Cards
- Hreflang tags, canonical URLs
- BlogModal SEO navigation
- Testing checklist

**Файли коду:** `utils/seo.ts`, `app/sitemap.ts`, `app/robots.ts`

**Curate команда:**
```bash
brv curate "$(cat features/seo-optimization.md)" --files utils/seo.ts
```

---

### Telegram Bot Workflow
**Файл:** `features/telegram-bot-workflow.md` (15,015 chars) **[НАЙБІЛЬШИЙ ФАЙЛ]**
**Що містить:**
- Sequential workflow (image → publish → LinkedIn → final links)
- Media detection bypass
- Longer prompt context (5000 chars)
- Source links display
- Retry logic для pending news
- Debug logging для queue diagnostics
- Version logging pattern

**Файли коду:** `supabase/functions/telegram-scraper/`, `telegram-webhook/`

**Curate команда:**
```bash
brv curate "$(cat features/telegram-bot-workflow.md)" --files supabase/functions/telegram-scraper/index.ts
```

---

### Analytics via GTM
**Файл:** `features/analytics-gtm.md` (5,383 chars)
**Що містить:**
- Google Tag Manager setup (GTM-5XBL8L8S)
- dataLayer events (page_view, article_view, etc.)
- TrackingContext auto tracking
- Meta Pixel + GA4 + LinkedIn Insight Tag

**Файли коду:** `utils/gtm.ts`, `contexts/TrackingContext.tsx`

**Curate команда:**
```bash
brv curate "$(cat features/analytics-gtm.md)" --files utils/gtm.ts
```

---

### Translation System
**Файл:** `features/translation-system.md` (844 chars)
**Що містить:**
- TranslationContext workflow
- 3000+ strings in translations.ts
- Database multilingual fields

**Файли коду:** `contexts/TranslationContext.tsx`, `utils/translations.ts`

**Curate команда:**
```bash
brv curate "$(cat features/translation-system.md)" --files contexts/TranslationContext.tsx
```

---

### Admin Panel
**Файл:** `features/admin-panel.md` (923 chars)
**Що містить:**
- Dashboard tabs overview
- Access control

**Curate команда:**
```bash
brv curate "$(cat features/admin-panel.md)" --files app/admin/dashboard/page.tsx
```

---

### Admin Panel Components
**Файл:** `features/admin-panel-components.md`
**Що містить:**
- LinkedInPostsManager
- ImageProcessingSettings (seasonal themes)
- APIKeysSettings

**Curate команда:**
```bash
brv curate "$(cat features/admin-panel-components.md)" --files components/admin/
```

---

### Mobile Layout System
**Файл:** `features/mobile-layout-system.md` (5,959 chars)
**Що містить:**
- BentoGridMobile architecture
- Bottom navigation app-style
- Портовані ефекти з desktop (typewriter, swipe, rotation)
- Desktop vs Mobile comparison table

**Файли коду:** `components/sections/BentoGridMobile.tsx`

**Curate команда:**
```bash
brv curate "$(cat features/mobile-layout-system.md)" --files components/sections/BentoGridMobile.tsx
```

---

### Contact Form Email
**Файл:** `features/contact-form-email.md` (4,072 chars)
**Що містить:**
- Resend API integration
- 3-layer spam protection (honeypot, timestamp, rate limiting)
- Email template

**Файли коду:** `supabase/functions/send-contact-email/`

**Curate команда:**
```bash
brv curate "$(cat features/contact-form-email.md)" --files supabase/functions/send-contact-email/index.ts
```

---

### Debug Mode
**Файл:** `features/debug-mode.md` (1,409 chars)
**Що містить:**
- localStorage storage
- Admin panel toggle
- What gets logged (GSAP, mouse events)

**Файли коду:** `utils/debug.ts`, `components/admin/DebugSettings.tsx`

**Curate команда:**
```bash
brv curate "$(cat features/debug-mode.md)" --files utils/debug.ts
```

---

### Gemini Image Processing
**Файл:** `features/gemini-image-processing.md`
**Що містить:**
- Google Gemini 2.5 Flash processing
- Prompt types (enhance, linkedin_optimize, generate, custom)
- API key sources

**Файли коду:** `supabase/functions/process-image/`

**Curate команда:**
```bash
brv curate "$(cat features/gemini-image-processing.md)" --files supabase/functions/process-image/index.ts
```

---

## 🐛 Bugfixes (6 файлів) - ІСТОРІЯ БАГІВ

### Bug Fixes Session 2 (December 2024)
**Файл:** `bugfixes/2024-12-session2-fixes.md` (2,305 chars)
**Баги вирішені:**
1. Azure OpenAI deployment name (gpt-4 → Jobbot-gpt-4.1-mini)
2. LinkedIn URL format (видалено language prefixes)
3. Blog post video data saving

**Файли коду:** `pre-moderate-news/`, `post-to-linkedin/`, `process-blog-post/`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2024-12-session2-fixes.md)" --files supabase/functions/pre-moderate-news/index.ts
```

---

### AI Prompts Selection Fix (December 2024)
**Файл:** `bugfixes/2024-12-ai-prompts-fix.md` (1,770 chars)
**Баг:** Multiple prompts з однаковим type → вибирався випадковий
**Рішення:** .order('updated_at', { ascending: false }) перед .limit(1)

**Файли коду:** `process-blog-post/`, `pre-moderate-news/`, `process-news/`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2024-12-ai-prompts-fix.md)" --files supabase/functions/process-blog-post/index.ts
```

---

### Mobile Responsiveness (December 2024)
**Файл:** `bugfixes/2024-12-mobile-responsiveness.md` (5,425 chars)
**Фікси:**
1. 100vh Safari fix (dvh)
2. Responsive gaps
3. Safe area insets
4. Touch/swipe support
5. Prefers reduced motion

**Файли коду:** `app/globals.css`, `components/sections/BentoGrid.tsx`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2024-12-mobile-responsiveness.md)" --files app/globals.css
```

---

### News Article Page (December 2024)
**Файл:** `bugfixes/2024-12-news-article-page.md` (1,983 chars)
**Що додано:** Окрема сторінка для SEO, білий фон, video support

**Файли коду:** `app/news/[slug]/NewsArticle.tsx`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2024-12-news-article-page.md)" --files app/news/[slug]/NewsArticle.tsx
```

---

### Social Media Duplicates (January 2025)
**Файл:** `bugfixes/2025-01-social-media-duplicates.md` (2,624 chars)
**Фікси:**
1. Race condition (pending status check)
2. Instagram non-clickable links
3. Media validation в combo handlers

**Файли коду:** `_shared/social-media-helpers.ts`, `telegram-webhook/`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2025-01-social-media-duplicates.md)" --files supabase/functions/_shared/social-media-helpers.ts
```

---

### Supabase Integration Fix (December 2025)
**Файл:** `bugfixes/2024-12-supabase-integration-fix.md` (496 chars)
**Фікс:** Graceful degradation для missing credentials

**Файли коду:** `integrations/supabase/client.ts`

**Curate команда:**
```bash
brv curate "$(cat bugfixes/2024-12-supabase-integration-fix.md)" --files integrations/supabase/client.ts
```

---

## 🏗️ Architecture (7 файлів)

### Database Schema
**Файл:** `architecture/database-schema.md` (3,925 chars)
**Що містить:**
- Main tables (news, blog_posts, news_sources, ai_prompts, social_media_posts, users, tags)
- Fields опис з коментарями
- Views (latest_news, latest_blog_posts)

**Curate команда:**
```bash
brv curate "$(cat architecture/database-schema.md)" --files supabase/migrations/
```

---

### New Database Tables
**Файл:** `architecture/new-database-tables.md`
**Що містить:**
- api_settings table
- daily_images table
- images array column

**Curate команда:**
```bash
brv curate "$(cat architecture/new-database-tables.md)" --files supabase/migrations/
```

---

### Edge Functions
**Файл:** `architecture/edge-functions.md` (3,227 chars)
**Що містить:**
- 17 Deno functions опис
- Shared helpers (_shared/)
- Deploy команди

**Curate команда:**
```bash
brv curate "$(cat architecture/edge-functions.md)" --files supabase/functions/
```

---

### Component Architecture
**Файл:** `architecture/component-architecture.md` (2,762 chars)
**Що містить:**
- BentoGrid layout
- Modal system (parallel routes)
- Admin panel structure

**Curate команда:**
```bash
brv curate "$(cat architecture/component-architecture.md)" --files components/
```

---

### Animation Libraries
**Файл:** `architecture/animation-libraries.md` (1,017 chars)
**Що містить:**
- GSAP use cases
- Framer Motion use cases
- Three.js particles

**Curate команда:**
```bash
brv curate "$(cat architecture/animation-libraries.md)" --files components/ui/
```

---

### CI/CD Pipelines
**Файл:** `architecture/ci-cd-pipelines.md` (2,501 chars)
**Що містить:**
- 8 GitHub Actions workflows
- Netlify configuration (auto-builds disabled)
- Triggers та schedules

**Curate команда:**
```bash
brv curate "$(cat architecture/ci-cd-pipelines.md)" --files .github/workflows/
```

---

### Content Management
**Файл:** `architecture/content-management.md` (616 chars)
**Що містить:**
- Blog posts structure
- News structure
- Moderation workflow

**Curate команда:**
```bash
brv curate "$(cat architecture/content-management.md)"
```

---

## 🛠️ Implementation (12 файлів)

### Background & Hero Animation
**Файл:** `implementation/background-hero-animation.md` (5,191 chars)
**Що містить:**
- Comfortaa font rationale
- Complementary color theory
- Liquid fill algorithm
- Debounce timing (150ms/300ms)

**Файли коду:** `components/layout/Header.tsx`, `components/ui/HeroTextAnimation.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/background-hero-animation.md)" --files components/layout/Header.tsx
```

---

### Projects Hover Explosion
**Файл:** `implementation/projects-hover-explosion.md` (3,236 chars)
**Що містить:**
- 3-second hover timer rationale
- Explosion grid algorithm
- Gradient generation
- Transparent background technique

**Файли коду:** `components/ui/ProjectsCarousel.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/projects-hover-explosion.md)" --files components/ui/ProjectsCarousel.tsx
```

---

### Skills Management
**Файл:** `implementation/skills-management.md` (2,886 chars)
**Що містить:**
- localStorage structure
- Categories та color mapping
- Drag & drop (Framer Motion Reorder)
- SimpleIcons CDN usage

**Файли коду:** `components/admin/SkillsManager.tsx`, `utils/skillsStorage.ts`

**Curate команда:**
```bash
brv curate "$(cat implementation/skills-management.md)" --files components/admin/SkillsManager.tsx
```

---

### Article Layout System
**Файл:** `implementation/article-layout-system.md`
**Що містить:**
- ArticleLayout wrapper
- ArticleHeader compact design
- Props interface

**Файли коду:** `components/ArticleLayout.tsx`, `components/layout/ArticleHeader.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/article-layout-system.md)" --files components/ArticleLayout.tsx
```

---

### Toast Notification System
**Файл:** `implementation/toast-system.md` (994 chars)
**Що містить:**
- Toast types (success, error, warning, info)
- Auto-dismiss timing
- Usage examples

**Файли коду:** `components/ui/Toast.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/toast-system.md)" --files components/ui/Toast.tsx
```

---

### Social Sharing Buttons
**Файл:** `implementation/share-buttons.md` (769 chars)
**Що містить:**
- Platforms (LinkedIn, X/Twitter, Copy Link)
- Props interface

**Файли коду:** `components/ui/ShareButtons.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/share-buttons.md)" --files components/ui/ShareButtons.tsx
```

---

### Loading Skeleton Components
**Файл:** `implementation/skeleton-components.md` (532 chars)
**Що містить:**
- Skeleton base
- ArticleSkeleton, NewsCardSkeleton

**Файли коду:** `components/ui/Skeleton.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/skeleton-components.md)" --files components/ui/Skeleton.tsx
```

---

### Scroll Reveal Animations
**Файл:** `implementation/scroll-reveal.md` (817 chars)
**Що містить:**
- ScrollReveal component
- StaggerReveal component
- Intersection Observer usage

**Файли коду:** `components/ui/ScrollReveal.tsx`

**Curate команда:**
```bash
brv curate "$(cat implementation/scroll-reveal.md)" --files components/ui/ScrollReveal.tsx
```

---

### Skill Logos Utility
**Файл:** `implementation/skill-logos.md` (810 chars)
**Що містить:**
- SimpleIcons CDN
- getSkillLogo() function
- Fallback initials generation

**Файли коду:** `utils/skillLogos.ts`

**Curate команда:**
```bash
brv curate "$(cat implementation/skill-logos.md)" --files utils/skillLogos.ts
```

---

### Mobile Detection Hooks
**Файл:** `implementation/mobile-detection-hooks.md` (1,069 chars)
**Що містить:**
- useIsMobile() hook
- useIsTablet() hook
- SSR safety

**Файли коду:** `hooks/useIsMobile.ts`

**Curate команда:**
```bash
brv curate "$(cat implementation/mobile-detection-hooks.md)" --files hooks/useIsMobile.ts
```

---

### Utility Functions
**Файл:** `implementation/utility-functions.md` (410 chars)
**Що містить:**
- cn() function (Tailwind merge)
- Usage example

**Файли коду:** `lib/utils.ts`

**Curate команда:**
```bash
brv curate "$(cat implementation/utility-functions.md)" --files lib/utils.ts
```

---

## 🚀 Як curate всі файли до ByteRover

### Автоматично (Рекомендовано)

```bash
cd /home/stuard/vitalii_claude-code-in-browser/docs/byterover-context
./curate-all.sh
```

Скрипт виконає всі 42 команди `brv curate` по черзі. Це займе ~5-10 хвилин.

### Вручну (Вибірково)

Curate тільки найважливіші секції:

```bash
# 1. Integrations (найважливіше)
brv curate "$(cat integrations/linkedin-integration.md)" --files supabase/functions/post-to-linkedin/index.ts
brv curate "$(cat integrations/instagram-integration.md)" --files supabase/functions/post-to-instagram/index.ts
brv curate "$(cat integrations/video-processing.md)" --files supabase/functions/telegram-scraper/index.ts

# 2. Bug fixes (історія)
brv curate "$(cat bugfixes/2024-12-session2-fixes.md)" --files supabase/functions/pre-moderate-news/index.ts
brv curate "$(cat bugfixes/2025-01-social-media-duplicates.md)" --files supabase/functions/_shared/social-media-helpers.ts

# 3. Core features
brv curate "$(cat features/telegram-bot-workflow.md)" --files supabase/functions/telegram-scraper/index.ts
brv curate "$(cat features/professional-image-prompts.md)" --files supabase/functions/generate-image-prompt/index.ts
```

---

## 📖 Як користуватися ByteRover після curation

### Query Examples

```bash
# Troubleshooting
brv query "How to fix Instagram Error #10?"
brv query "Why is LinkedIn token expiring?"
brv query "How to debug Edge Functions deployment?"

# Architecture decisions
brv query "Why was YouTube chosen over Bunny.net?"
brv query "Why use MTKruto instead of Telegram Bot API?"
brv query "How does video processing workflow work?"

# Bug history
brv query "What bugs were fixed in December 2024?"
brv query "How was the duplicate social media posts issue resolved?"

# Implementation details
brv query "How does the two-stage AI image prompt system work?"
brv query "What is the Telegram bot sequential workflow?"
brv query "How are skills stored in localStorage?"
```

---

## 📚 Додаткові ресурси

- **Короткий референс:** `/CLAUDE.md` (15k chars) - швидкий старт
- **Повна історія:** `/docs/byterover-context/` (42 файли, 130k chars)
- **Код:** `supabase/functions/`, `components/` - source of truth
- **Git історія:** `git log -- CLAUDE.md` - еволюція проекту

---

## ✅ Переваги цієї структури

1. **Повна історія збережена** - жоден баг fix не втрачено
2. **Організовано за темами** - легко знайти потрібне
3. **Queryable через ByteRover** - `brv query` замість grep
4. **Легко підтримувати** - один файл = одна тема
5. **Git-friendly** - можна track changes per файл
6. **Масштабується** - легко додавати нові секції

---

**Створено:** January 22, 2025
**Автор:** Vitalii Berbeha (@SmmShaman)
**ByteRover CLI:** v1.2.0
