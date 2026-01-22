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

#### 7. BlogSection SEO URL Update (`components/sections/BlogSection.tsx`)
- Додано `window.history.replaceState` для оновлення URL при виборі блог-посту
- Функція `getBlogSlug()` для мультимовних slug-ів
- URL в браузері автоматично оновлюється на `/blog/[slug]` при виборі посту
- Працює ідентично NewsSection - без додаткових кнопок

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
- [x] BlogSection SEO URL update (window.history.replaceState)

### Testing SEO

1. **JSON-LD:** [Google Rich Results Test](https://search.google.com/test/rich-results)
2. **Open Graph:** [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
3. **Twitter Cards:** [Twitter Card Validator](https://cards-dev.twitter.com/validator)
4. **Lighthouse:** Chrome DevTools → Lighthouse → SEO Audit
5. **Sitemap:** `https://your-site.com/sitemap.xml`
6. **Robots:** `https://your-site.com/robots.txt`

---
