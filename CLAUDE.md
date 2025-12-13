# CLAUDE.md - Project Documentation

## Project Overview

**Vitalii Berbeha Portfolio** - професійне портфоліо з блогом та новинним розділом. Побудовано на Next.js 15 з Supabase як бекендом.

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL)
- **Deployment:** Netlify
- **Languages:** Мультимовна підтримка (EN, NO, UA)

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── blog/[slug]/       # Динамічні сторінки блогу
│   ├── news/[slug]/       # Динамічні сторінки новин
│   ├── admin/             # Адмін-панель
│   ├── layout.tsx         # Root layout
│   ├── sitemap.ts         # Динамічний sitemap
│   └── robots.ts          # robots.txt
├── components/
│   ├── sections/          # Секції головної сторінки
│   └── admin/             # Компоненти адмін-панелі
├── integrations/supabase/ # Supabase клієнт та типи
├── utils/
│   ├── seo.ts             # SEO утиліти
│   ├── debug.ts           # Debug утиліти
│   └── translations.ts    # Переклади
└── supabase/functions/    # Edge Functions
```

## Content Management

### Blog Posts (`blog_posts` table)
- Мультимовний контент (title_en, title_no, title_ua)
- SEO-friendly slugs для кожної мови
- Категорії, теги, reading_time
- is_published, is_featured флаги

### News (`news` table)
- Мультимовний контент
- Система пре-модерації (pre_moderation_status)
- Підтримка відео (YouTube, Telegram)
- is_rewritten, is_published флаги

### Moderation Workflow
1. Новини збираються з RSS/Telegram джерел
2. AI переписує контент (is_rewritten)
3. Пре-модерація (pending → approved/rejected)
4. Публікація (is_published)

---

## SEO Optimization (December 2024)

### Виконані роботи

#### 1. SEO Utilities (`utils/seo.ts`)
Створено централізований модуль для SEO:

```typescript
// JSON-LD Schema generators
- generateBlogPostSchema()    // BlogPosting schema
- generateNewsArticleSchema() // NewsArticle schema
- generateBreadcrumbSchema()  // BreadcrumbList schema
- generatePersonSchema()      // Person schema (author)
- generateWebsiteSchema()     // WebSite schema

// Metadata helpers
- generateAlternates()        // canonical + hreflang
- generateOpenGraph()         // Full OG metadata
- generateTwitterCard()       // Twitter Cards
- generateRobots()            // Robots meta
- truncateDescription()       // Meta description helper
- formatDate()                // Date formatting
- calculateReadingTime()      // Reading time calculation
```

#### 2. Blog Pages (`app/blog/[slug]/`)
**page.tsx:**
- Canonical URLs
- Hreflang теги (en, no, uk, x-default)
- Повний Open Graph (publishedTime, modifiedTime, authors, tags, section)
- Twitter Cards (summary_large_image)
- Keywords meta tag
- Robots meta (index, follow, googleBot settings)

**BlogArticle.tsx:**
- JSON-LD `BlogPosting` schema
- JSON-LD `BreadcrumbList` schema
- `next/image` оптимізація зображень
- Семантична HTML розмітка:
  - `<article>`, `<header>`, `<footer>`, `<aside>`
  - `<time dateTime="...">`
  - `<nav aria-label="Breadcrumb">`
  - Schema.org microdata (itemScope, itemProp)
- Author info section з Person schema

#### 3. News Pages (`app/news/[slug]/`)
**page.tsx:**
- Ідентичні SEO покращення як для блогу

**NewsArticle.tsx:**
- JSON-LD `NewsArticle` schema
- Breadcrumb навігація
- YouTube embed підтримка
- Оптимізовані зображення
- rel="noopener noreferrer" для зовнішніх посилань

#### 4. Sitemap (`app/sitemap.ts`)
- Мультимовна підтримка з alternates
- Окремі URL для EN, NO, UK версій
- Правильні пріоритети (1.0 для homepage, 0.8 для primary lang, 0.7 для alternates)
- changeFrequency налаштування

#### 5. Robots (`app/robots.ts`)
- Специфічні правила для Googlebot та Bingbot
- Заблоковані маршрути: /api/, /_next/, /admin/, /@modal/, /private/
- Host директива
- Sitemap посилання

#### 6. BlogModal SEO Navigation (`components/sections/BlogModal.tsx`)
- Додано `<Link>` компонент для переходу на окрему сторінку блог-посту
- Функція `getBlogSlug()` для мультимовних slug-ів
- Кнопка "View full article" з правильним URL
- Тепер BlogModal працює ідентично NewsModal

### SEO Checklist

- [x] JSON-LD Schema (BlogPosting, NewsArticle, BreadcrumbList)
- [x] Canonical URLs
- [x] Hreflang tags (en, no, uk)
- [x] Open Graph metadata (full)
- [x] Twitter Cards
- [x] Image optimization (next/image)
- [x] Semantic HTML (<article>, <time>, <nav>)
- [x] Schema.org microdata
- [x] Multilingual sitemap
- [x] Enhanced robots.txt
- [x] Author/Person schema
- [x] Reading time calculation
- [x] Meta description truncation (160 chars)
- [x] BlogModal SEO navigation link

### Testing SEO

1. **JSON-LD:** [Google Rich Results Test](https://search.google.com/test/rich-results)
2. **Open Graph:** [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
3. **Twitter Cards:** [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. **Lighthouse:** Chrome DevTools → Lighthouse → SEO Audit
5. **Sitemap:** `https://your-site.com/sitemap.xml`
6. **Robots:** `https://your-site.com/robots.txt`

---

## Debug Mode (December 2024)

### Опис

Система debug-логування для анімацій з можливістю вмикання/вимикання через адмін панель.

### Файли

```
├── utils/debug.ts                    # Debug утиліти
├── components/admin/DebugSettings.tsx # UI для адмін панелі
```

### Debug Utilities (`utils/debug.ts`)

```typescript
// Основні функції
- isDebugEnabled()     // Перевірка чи debug увімкнений
- setDebugMode(bool)   // Увімкнути/вимкнути debug
- debugLog(msg, ...args)   // Логування (тільки коли debug ON)
- debugWarn(msg, ...args)  // Попередження (тільки коли debug ON)
- debugError(msg, ...args) // Помилки (завжди показуються)
```

### Використання в компонентах

Debug-логи використовуються в:
- `components/sections/BentoGrid.tsx` - стани секцій, mouse events
- `components/ui/ServicesAnimation.tsx` - GSAP анімації сервісів
- `components/ui/SkillsAnimation.tsx` - explosion анімація скілів
- `components/ui/AboutAnimation.tsx` - текстова анімація About

### Як увімкнути

1. Зайти в **Admin Panel → Settings → Debug**
2. Увімкнути toggle "Console Logging"
3. Натиснути **Refresh Page Now**

### Зберігання

Debug mode зберігається в `localStorage` під ключем `vitalii_debug_mode`.

### Що логується

- Цикли анімацій (ANIMATION CYCLE)
- Mouse enter/leave події
- Стани секцій (expanded, hiding, fullscreen)
- GSAP timeline події
- Component lifecycle (mount/unmount)
- Grid bounds calculations

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://vitalii-berbeha.netlify.app
```

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npx tsc --noEmit # TypeScript check
```

## Deployment

Автоматичний деплой через Netlify при пуші в main branch.
