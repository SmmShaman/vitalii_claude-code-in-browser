# CLAUDE.md - Project Documentation

## Project Overview

**Vitalii Berbeha Portfolio** - Professional portfolio with blog and news section. Built on Next.js 15 with Supabase backend.

**Production URL:** https://vitalii.no
**Admin Panel:** /admin/login → /admin/dashboard

---

## Quick Start

```bash
# Development
npm install
npm run dev              # http://localhost:3000

# Production
npm run build
npm start

# Quality checks
npx tsc --noEmit        # TypeScript validation
npm run lint            # ESLint
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js | 15.1.0 |
| **UI** | React | 19.1.0 |
| **Language** | TypeScript | 5.9.3 |
| **Styling** | Tailwind CSS | 3.4.18 |
| **Animations** | GSAP, Framer Motion, Three.js | - |
| **Backend** | Supabase (PostgreSQL) | 2.76.1 |
| **Edge Functions** | Deno | - |
| **AI** | Azure OpenAI (GPT-4.1-mini), Google Gemini (2.5 Flash) | - |
| **Deployment** | Netlify | - |
| **CI/CD** | GitHub Actions | - |
| **Languages** | Multilingual support | EN, NO, UA |

---

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── @modal/                   # Parallel routes (intercepted modals)
│   ├── admin/                    # Admin dashboard
│   ├── blog/[slug]/              # Dynamic blog pages
│   ├── news/[slug]/              # Dynamic news pages
│   ├── page.tsx                  # Home (BentoGrid)
│   ├── layout.tsx                # Root layout
│   └── sitemap.ts, robots.ts     # SEO
│
├── components/
│   ├── layout/                   # Header, Footer, Sidebar
│   ├── sections/                 # BentoGrid, NewsSection, BlogSection
│   ├── ui/                       # Reusable UI components
│   ├── admin/                    # Admin panel components
│   └── background/               # ParticleBackground
│
├── supabase/
│   ├── functions/                # 17 Edge Functions (Deno)
│   │   ├── _shared/              # Shared helpers
│   │   ├── telegram-scraper/     # RSS/Telegram scraping
│   │   ├── pre-moderate-news/    # AI spam filtering
│   │   ├── post-to-linkedin/     # LinkedIn publishing
│   │   ├── post-to-instagram/    # Instagram publishing
│   │   └── ...                   # 12 more functions
│   └── migrations/               # SQL migrations
│
├── .github/workflows/            # CI/CD
│   ├── deploy.yml                # Netlify deployment
│   ├── deploy-supabase.yml       # Edge Functions
│   ├── realtime-scraper.yml      # News scraping (every 10 min)
│   └── process-video.yml         # Video processing
│
└── scripts/                      # GitHub Actions scripts
    ├── video-processor/          # Telegram → YouTube
    └── linkedin-video/           # LinkedIn native video
```

---

## Core Architecture

### Database Schema

**Main Tables:**

#### `news` - News articles
- Multilingual fields: `title_en/no/ua`, `content_en/no/ua`, `slug_en/no/ua`
- Media: `image_url`, `processed_image_url`, `video_url`, `video_type`
- Moderation: `pre_moderation_status` (pending/approved/rejected)
- Social: `linkedin_post_id`, `instagram_post_id`, `facebook_post_id`
- AI: `image_generation_prompt`, `is_rewritten`

#### `blog_posts` - Blog articles
- Similar structure to news
- Additional: `author_id`, `category`, `reading_time`, `is_featured`
- `source_news_id` (FK → news, if converted from news)

#### `news_sources` - Content sources
- Fields: `name`, `url`, `rss_url`, `source_type` (rss/telegram/web)
- Scraping: `fetch_interval`, `last_fetched_at`, `is_active`

#### `ai_prompts` - AI prompt templates
- Types: `pre_moderation`, `news_rewrite`, `blog_rewrite`, `image_generation`, `image_template_*`, `social_teaser_*`
- Editable via admin panel
- Used by: pre-moderate-news, process-news, generate-image-prompt, generate-social-teasers

#### `social_media_posts` - Social media tracking
- Fields: `platform`, `post_id`, `post_url`, `language`, `status`
- Duplicate prevention: checks for existing posted/pending entries

#### `users` - Admin users
- Authentication for admin panel
- Fields: `email`, `password_hash`, `role`, `is_active`

### Supabase Edge Functions

17 Deno-based serverless functions:

| Function | Purpose | Trigger |
|----------|---------|---------|
| `telegram-scraper` | RSS/Telegram channel scraping (MTKruto) | Scheduled (every 10 min) |
| `pre-moderate-news` | AI spam/ad filtering | After scraper |
| `generate-image-prompt` | AI image description generation | After moderation |
| `process-news` | AI translation to EN/NO/UA | Telegram bot |
| `process-blog-post` | News → Blog conversion | Telegram bot |
| `post-to-linkedin` | LinkedIn publishing (native upload) | Telegram bot |
| `post-to-instagram` | Instagram publishing | Telegram bot |
| `post-to-facebook` | Facebook publishing | Telegram bot |
| `generate-social-teasers` | Platform-specific AI content | Social publishing |
| `telegram-webhook` | Bot callback handling | Telegram |
| `process-image` | Gemini AI image processing | Manual/Telegram |
| `send-contact-email` | Contact form emails (Resend API) | Contact form |
| `manage-sources` | Source management | Manual |
| `resend-to-bot` | Retry failed posts | Scheduled |
| `reprocess-videos` | Batch video reprocessing | Manual |
| `test-youtube-auth` | YouTube OAuth testing | Manual |
| `telegram-monitor` | Bot health checks | Scheduled |

**Shared Helpers** (`_shared/`):
- `youtube-helpers.ts` - YouTube OAuth & upload
- `github-actions.ts` - Trigger workflows
- `facebook-helpers.ts` - Instagram/Facebook API
- `social-media-helpers.ts` - Duplicate prevention

**Deploy:**
```bash
cd supabase
supabase functions deploy <function-name> --no-verify-jwt
```

### Component Architecture

**Desktop Layout:**
- `BentoGrid` - 6-section grid with hover effects (About, Services, Projects, Skills, News, Blog)
- Hover interactions: background color change, hero text fill animation
- Section-specific animations: ProjectsCarousel (explosion grid), SkillsAnimation (particle effect)

**Mobile Layout:**
- `BentoGridMobile` - Bottom navigation app-style
- Swipe gestures for carousels
- Compact animations (typewriter, rotation, horizontal scroll)

**Modal System:**
- Next.js parallel routes (`@modal`)
- Intercepts `/blog/[slug]` and `/news/[slug]` routes
- Shows modal overlay on homepage, full page on direct navigation

**Admin Panel:**
- Skills Manager - CRUD for tech skills (drag & drop)
- AI Prompts Manager - Edit AI templates
- LinkedIn Posts Manager - Social media tracking
- Image Processing Settings - Seasonal themes
- API Keys Settings - External API management

---

## Key Features

### Content Management

**Multilingual Content (EN/NO/UA):**
- TranslationContext manages language state
- 3000+ translation strings in `utils/translations.ts`
- Database: separate fields per language (`title_en`, `title_no`, `title_ua`)

**Content Workflow:**
1. Telegram scraper collects content from RSS/Telegram channels
2. AI pre-moderation filters spam (Azure OpenAI)
3. AI generates image description prompt
4. Moderator reviews in Telegram bot
5. Publish to News or Blog
6. Post to social media (LinkedIn/Instagram/Facebook)

**Video Handling:**
- Types: `youtube` (embedded), `telegram_embed` (fallback), `direct_url`
- MTKruto bypasses Telegram Bot API 20MB limit (supports up to 2GB)
- GitHub Actions workflows for heavy processing
- YouTube upload for site embeds (unlisted videos)

### Social Media Integration

**LinkedIn:**
- OAuth 2.0 UGC Post API
- Native image upload via Assets API
- Three languages support
- Duplicate prevention via `social_media_posts` table

**Instagram:**
- Facebook Graph API (Business accounts only)
- Required scopes: `instagram_basic`, `instagram_content_publish`
- IMAGE posts (native upload) or ARTICLE posts
- Video/Reels via GitHub Actions (scripts/instagram-video/)

**Facebook:**
- Similar to Instagram (shares codebase)
- Facebook Page API

**AI Social Teasers:**
- Platform-specific content generation
- Optimized for each platform's style and character limits
- Cached in database (`social_teaser_linkedin_en`, etc.)

### AI Systems

**Image Prompt Generation:**
- Two-stage system: Classifier (extracts JSON) → Template (fills placeholders)
- Categories: tech_product, marketing_campaign, ai_research, business_news, science, lifestyle
- Based on awesome-nanobanana-pro methodology
- Editable templates in admin panel

**Content Moderation:**
- Azure OpenAI pre-moderation for spam detection
- Custom prompts via `ai_prompts` table
- Status: pending → approved/rejected

**Content Rewriting:**
- AI translation to multiple languages
- Style adaptation for blog posts
- Maintains source attribution

### SEO Optimization

**Implemented:**
- JSON-LD schemas (BlogPosting, NewsArticle, BreadcrumbList)
- Open Graph metadata (full support)
- Twitter Cards
- Multilingual sitemap with alternates
- Hreflang tags
- Canonical URLs
- Semantic HTML markup
- Image optimization (next/image)

**Files:**
- `utils/seo.ts` - SEO utility functions
- `app/sitemap.ts` - Dynamic sitemap
- `app/robots.ts` - Robots.txt configuration

### Analytics

**Google Tag Manager (GTM-5XBL8L8S):**
- Centralized tracking hub
- Events: page_view, article_view, form_submit, share, language_change, section_click
- Integrations: GA4, Meta Pixel, LinkedIn Insight Tag
- Context: `TrackingContext` with auto page view tracking

---

## CI/CD Pipelines

**GitHub Actions Workflows:**

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `deploy.yml` | Push to main | Netlify deployment |
| `deploy-supabase.yml` | Changes in `supabase/**` | Edge Functions + migrations |
| `realtime-scraper.yml` | Every 10 min | Round-robin channel scraping |
| `process-video.yml` | Every 30 min | Batch video upload to YouTube |
| `linkedin-video.yml` | Repository dispatch | LinkedIn native video upload |
| `instagram-video.yml` | Repository dispatch | Instagram Reels upload |
| `facebook-video.yml` | Repository dispatch | Facebook video upload |
| `reprocess-videos.yml` | Manual | Batch video cleanup |

**Netlify Configuration:**
- Auto-builds DISABLED (`stop_builds: true`)
- Deployment only via GitHub Actions
- Prevents env var issues

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=https://vitalii.no

# Telegram (Bot API + MTProto)
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_API_ID=...
TELEGRAM_API_HASH=...

# YouTube API
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...

# LinkedIn
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=urn:li:person:...

# Instagram/Facebook
FACEBOOK_PAGE_ACCESS_TOKEN=...
INSTAGRAM_ACCOUNT_ID=...
FACEBOOK_PAGE_ID=...

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_API_KEY=...

# Google AI (Gemini)
GOOGLE_API_KEY=...

# Analytics
NEXT_PUBLIC_GTM_ID=GTM-5XBL8L8S

# Email (Contact form)
RESEND_API_KEY=re_...
ADMIN_EMAIL=berbeha@vitalii.no

# GitHub Actions
GH_PAT=ghp_... (for triggering workflows)
```

---

## Development Commands

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Production build
npm start                      # Start production server

# Quality checks
npx tsc --noEmit              # TypeScript check
npm run lint                   # ESLint

# Supabase
cd supabase
supabase functions deploy <name> --no-verify-jwt
supabase secrets set KEY="value"

# ByteRover (context management)
brv query "How is authentication implemented?"
brv curate "Context to store" --files path/to/file.ts
brv status
```

---

## Deployment

**Production:**
1. Push to `main` branch
2. GitHub Actions runs `deploy.yml`
3. Netlify builds and deploys
4. If Edge Functions changed, `deploy-supabase.yml` runs

**Manual Deployment:**
```bash
# Netlify
netlify deploy --prod

# Supabase Edge Functions
cd supabase
for dir in functions/*/; do
  if [ -d "$dir" ] && [ "$(basename $dir)" != "_shared" ]; then
    supabase functions deploy $(basename $dir) --no-verify-jwt
  fi
done
```

---

## Common Tasks

### Add New Edge Function
```bash
cd supabase/functions
mkdir my-function
cd my-function
# Create index.ts
supabase functions deploy my-function --no-verify-jwt
```

### Update AI Prompts
1. Go to Admin Panel → Settings → AI Prompts
2. Edit prompt text
3. Save changes
4. Next generation uses updated prompt

### Add New Social Media Platform
1. Create Edge Function: `post-to-{platform}`
2. Add helpers to `_shared/{platform}-helpers.ts`
3. Update `telegram-webhook` with callback handlers
4. Add fields to `news`/`blog_posts` tables
5. Update `social_media_posts` table support

### Debug Edge Functions
```bash
# View logs
supabase functions logs <function-name>

# Test locally
supabase functions serve <function-name>
```

---

## Important Notes

### Video Processing
- MTKruto (MTProto) bypasses Telegram Bot API 20MB limit
- GitHub Actions used for heavy video processing (LinkedIn, Instagram, YouTube)
- Fallback to Telegram embed if processing fails

### Social Media Posting
- Duplicate prevention via `social_media_posts` table (status: pending/posted/failed)
- Native image/video uploads for better quality
- Platform-specific AI-generated teasers

### AI Prompts
- All prompts editable via admin panel
- Stored in `ai_prompts` table
- Latest `updated_at` prompt used (handles multiple active prompts)

### Mobile Layout
- Different component (`BentoGridMobile`) vs desktop (`BentoGrid`)
- Bottom navigation app-style
- Touch/swipe gestures implemented
- Safe area insets for notched devices

### Supabase Integration
- Graceful degradation if credentials missing
- RLS policies for security
- Service role key for Edge Functions

---

## Troubleshooting

### Edge Function Not Updating
- Check GitHub Actions logs for deployment status
- Verify function checksum changed (add version log)
- Manual deploy if needed

### Social Media Errors
**LinkedIn:**
- Token expires after 60 days → regenerate
- Check person URN format: `urn:li:person:xxxxx`

**Instagram:**
- Error #10: Missing `instagram_content_publish` scope
- Error #190: Token expired
- Must be Business account linked to Facebook Page

### Video Processing Fails
- Check MTKruto credentials (TELEGRAM_API_ID, TELEGRAM_API_HASH)
- Verify YouTube OAuth refresh token
- Check GitHub Actions secrets

### Telegram Bot Not Working
- Verify webhook URL in BotFather
- Check Edge Function logs
- Test with manual trigger

---

## Additional Documentation

### 📚 Complete Project History (ByteRover Context)

This condensed CLAUDE.md contains essential quick reference info (15k chars).

**For complete implementation details, bug fix history, and architectural decisions:**

📁 **`docs/byterover-context/`** - Full project history (42 files, ~130k chars)

Organized by:
- **`integrations/`** (6 files) - LinkedIn, Instagram, Video processing, AI teasers
- **`features/`** (11 files) - AI systems, SEO, Mobile layout, Analytics
- **`bugfixes/`** (6 files) - Complete bug fix history with dates
- **`architecture/`** (8 files) - Database, Edge Functions, Components, CI/CD, **Supabase Workflow**
- **`implementation/`** (12 files) - Detailed implementation guides

#### Curate to ByteRover

```bash
cd docs/byterover-context
./curate-all.sh
```

This will curate all 42 files to ByteRover context service (~5-10 min).

#### Query Examples

After curation, use ByteRover to query project history:

```bash
# Troubleshooting
brv query "How to fix Instagram Error #10?"
brv query "Why is LinkedIn token expiring?"

# Architecture decisions
brv query "Why was YouTube chosen over Bunny.net?"
brv query "How does video processing workflow work?"

# Bug history
brv query "What bugs were fixed in December 2024?"
brv query "How was duplicate social media posts issue resolved?"

# Implementation details
brv query "How does two-stage AI image prompt system work?"
brv query "What is Telegram bot sequential workflow?"

# Supabase workflow
brv query "How to push Supabase migrations?"
brv query "How to fix migration sync issues?"
```

**See** `docs/byterover-context/README.md` for complete index with curate commands for each file.

---

### External Resources

- [Next.js 15 Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [LinkedIn UGC API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [MTKruto (Telegram MTProto)](https://github.com/MTKruto/MTKruto)
- [ByteRover Docs](https://docs.byterover.dev)

---

**Last Updated:** January 24, 2025
**Maintained By:** Vitalii Berbeha (@SmmShaman)
