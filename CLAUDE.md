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

## Background Highlight & Hero Text Animation (December 2024)

### Опис

Динамічна зміна кольору фону та анімація заливки тексту Hero секції при наведенні курсора на кожне з 6 вікон BentoGrid.

### Файли

```
├── app/page.tsx                          # Background overlay + hoveredSection state
├── app/layout.tsx                        # Comfortaa font import
├── app/globals.css                       # Body background (light gray)
├── components/layout/Header.tsx          # Hero text fill animation
├── components/ui/HeroTextAnimation.tsx   # Liquid fill component with wave effect
├── components/sections/BentoGrid.tsx     # Section colors + opposite mapping
├── tailwind.config.ts                    # font-comfortaa class
```

### Шрифт Comfortaa

Округлий геометричний шрифт з відмінною підтримкою кирилиці:

```html
<!-- app/layout.tsx -->
<link
  href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

- **Підтримка:** Latin, Cyrillic (Ukrainian)
- **Tailwind клас:** `font-comfortaa`
- **Особливість:** Однакове відображення латиниці та кирилиці

### Кольори секцій

| Секція | Назва кольору | HEX | RGB |
|--------|---------------|-----|-----|
| About | Насичений коричнево-оранжевий | `#AF601A` | (175, 96, 26) |
| Services | Яскравий фуксієвий рожевий | `#EC008C` | (236, 0, 140) |
| Projects | Emerald | `#009B77` | (0, 155, 119) |
| Skills | Light Pink | `#fde5e5` | (253, 229, 229) |
| News | Greenery | `#88B04B` | (136, 176, 75) |
| Blog | Classic Blue | `#0F4C81` | (15, 76, 129) |

### Маппінг протилежних секцій

Для анімації тексту Hero використовується колір **протилежної** секції:

```typescript
export const oppositeSections: { [key: string]: string } = {
  about: 'blog',      // About hover → Blog color (Classic Blue)
  services: 'news',   // Services hover → News color (Greenery)
  projects: 'skills', // Projects hover → Skills color (Light Pink)
  skills: 'projects', // Skills hover → Projects color (Emerald)
  news: 'services',   // News hover → Services color (Fuchsia)
  blog: 'about',      // Blog hover → About color (Brown-Orange)
};
```

### Background Overlay

```typescript
// app/page.tsx
<div
  className="fixed inset-0 -z-5 transition-all duration-700 ease-in-out"
  style={{
    backgroundColor: currentNeonColor || 'transparent',
    opacity: currentNeonColor ? 0.4 : 0,
  }}
/>
```

- Фон: світло-сірий (`bg-gray-200`)
- При hover: overlay з кольором секції (opacity 40%)
- Transition: 700ms ease-in-out

### Hero Text Fill Animation

#### Компонент `HeroTextAnimation`

Ефект "наливання фарби в прозорий стакан":

```typescript
// components/ui/HeroTextAnimation.tsx
interface HeroTextAnimationProps {
  text: string;
  fillColor: string | null;
  isActive: boolean;
  direction?: 'ltr' | 'rtl';  // напрямок заливки
  fontSize?: string;
  fontWeight?: string;
}
```

#### Glass Effect (базовий стан)

- Текст повністю **прозорий** (`color: 'transparent'`)
- Тонка **чорна кайомка** (`WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.4)'`)
- Шрифт: **Comfortaa**

#### Liquid Fill (при hover)

- **Хвилеподібний край** заливки (polygon clip-path з синусоїдою)
- Анімована хвиля під час заповнення
- Легке світіння кольору (`textShadow`)

#### Напрямки заливки

**Subtitle** ("Marketing & Analytics Expert | Creator of Elvarika"):
- Напрямок: **справа наліво** (RTL)
- Розмір: `clamp(1rem, 1.7vw, 1.5rem)`

**Description** ("I help organisations grow..."):
- Напрямок: **зліва направо** (LTR)
- Розмір: `clamp(0.95rem, 1.4vw, 1.35rem)`

### Debounce для плавних переходів

При швидкому переміщенні курсора між секціями використовується debounce:

```typescript
// components/layout/Header.tsx
const [debouncedSection, setDebouncedSection] = useState<string | null>(null);
const [isTransitioning, setIsTransitioning] = useState(false);

// При переході між секціями: 150ms затримка
// При виході з усіх секцій: 300ms затримка
```

### Transitions

| Властивість | Тривалість | Призначення |
|-------------|------------|-------------|
| `clip-path` | 700ms | Анімація заливки тексту |
| `color` | 400ms | Плавна зміна кольору |
| `background-color` | 700ms | Зміна фону |

### Як це працює

1. Користувач наводить курсор на вікно (напр. Services)
2. `BentoGrid` викликає `onHoveredSectionChange('services')`
3. `page.tsx` оновлює background overlay кольором Services (`#EC008C`)
4. `Header.tsx` отримує `hoveredSection='services'`
5. Знаходить протилежну секцію: `oppositeSections['services'] = 'news'`
6. Заливає текст Hero кольором News (`#88B04B`)
7. При швидкому переході - debounce забезпечує плавність

---

## LinkedIn Integration (December 2024)

### Опис

Публікація новин та блог-постів у LinkedIn через Telegram бота. Підтримка трьох мов: English, Norwegian, Ukrainian.

### Файли

```
├── supabase/functions/post-to-linkedin/index.ts  # LinkedIn API edge function
├── supabase/functions/telegram-webhook/index.ts  # Callback handlers
├── supabase/functions/telegram-scraper/index.ts  # Кнопки модерації
```

### Workflow

1. Новина проходить модерацію в Telegram боті
2. Модератор натискає "📰 В новини" або "📝 В блог" для публікації
3. Після публікації модератор може натиснути одну з кнопок LinkedIn:
   - `🔗 LinkedIn EN` - публікація англійською
   - `🔗 LinkedIn NO` - публікація норвезькою
   - `🔗 LinkedIn UA` - публікація українською
4. Контент публікується в LinkedIn з посиланням на статтю

### Telegram Bot Keyboard

```
┌─────────────────────┬─────────────────────┐
│    📰 В новини      │     📝 В блог       │
├─────────────────────┼──────────┬──────────┤
│   🔗 LinkedIn EN    │ LinkedIn │ LinkedIn │
│                     │    NO    │    UA    │
├─────────────────────┴──────────┴──────────┤
│               ❌ Reject                    │
└───────────────────────────────────────────┘
```

### LinkedIn API

Використовується **UGC Post API** (User Generated Content):
- Endpoint: `https://api.linkedin.com/v2/ugcPosts`
- Метод: POST
- Формат: Article share з preview

### Що публікується

```
{Заголовок статті}

{Опис статті}

🔗 Read more: {URL статті на сайті}
```

### Database Fields

Після публікації в LinkedIn додаються поля:
- `linkedin_post_id` - ID поста в LinkedIn
- `linkedin_posted_at` - Дата публікації
- `linkedin_language` - Мова публікації (en/no/ua)

### Environment Variables (LinkedIn)

```env
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:your_person_id
```

### Отримання LinkedIn Access Token

1. Створити додаток на [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
2. Додати продукт "Share on LinkedIn" та "Sign In with LinkedIn using OpenID Connect"
3. Отримати OAuth 2.0 токен через authorization flow
4. Scope: `w_member_social` (для публікації постів)

### Важливо

- LinkedIn Access Token має обмежений термін дії (60 днів)
- Для оновлення токена потрібен refresh flow
- `LINKEDIN_PERSON_URN` - це ваш унікальний ID в форматі `urn:li:person:xxxxx`
- Можна знайти через LinkedIn API: `GET /v2/me`

### Deploy

```bash
# Deploy LinkedIn function
cd supabase
supabase functions deploy post-to-linkedin

# Set secrets
supabase secrets set LINKEDIN_ACCESS_TOKEN="your_token"
supabase secrets set LINKEDIN_PERSON_URN="urn:li:person:xxxxx"
```

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://vitalii-berbeha.netlify.app

# LinkedIn Integration
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:your_person_id
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
