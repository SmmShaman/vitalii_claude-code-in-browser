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
- Підтримка відео (YouTube, Telegram fallback)
- Поля: `video_type`, `video_url`
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

### Контрастні кольори для Hero тексту

Для анімації тексту Hero використовуються **комплементарні кольори** на основі теорії кольору для максимального контрасту:

```typescript
export const heroContrastColors: { [key: string]: string } = {
  about: '#009B77',      // Teal/Cyan для коричнево-оранжевого
  services: '#00FF80',   // Lime Green для фуксії
  projects: '#FF4040',   // Vibrant Red для смарагдового
  skills: '#0F4C81',     // Navy Blue для світло-рожевого
  news: '#734BB0',       // Royal Purple для зеленого
  blog: '#AF601A',       // Warm Orange для синього
};
```

| Секція | Колір секції | Контрастний колір Hero | Принцип |
|--------|--------------|------------------------|---------|
| About | #AF601A (Brown-Orange) | #009B77 (Teal) | Тепла vs холодна |
| Services | #EC008C (Fuchsia) | #00FF80 (Lime Green) | Магента vs зелений |
| Projects | #009B77 (Emerald) | #FF4040 (Red) | Зелений vs червоний |
| Skills | #fde5e5 (Light Pink) | #0F4C81 (Navy Blue) | Рожевий vs синій |
| News | #88B04B (Greenery) | #734BB0 (Purple) | Зелений vs фіолетовий |
| Blog | #0F4C81 (Classic Blue) | #AF601A (Orange) | Синій vs оранжевий |

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

## Projects Hover Explosion (December 2024)

### Опис

При затримці курсора на секції Projects більше 3 секунд, карусель проектів "розсипається" на сітку маленьких блоків з назвами проектів. При виведенні курсора все повертається до нормальної каруселі.

### Файли

```
├── components/sections/BentoGrid.tsx    # Стан isProjectsExploding + hover таймер
├── components/ui/ProjectsCarousel.tsx   # Explosion grid view + GSAP карусель
```

### Стани та Refs

```typescript
// BentoGrid.tsx
const [isProjectsExploding, setIsProjectsExploding] = useState(false);
const projectsHoverTimeoutRef = useRef<number | null>(null);
```

### Логіка взаємодії

1. **Наведення курсора на Projects** → запускається таймер 3 секунди
2. **Курсор тримається 3+ секунди** → `isProjectsExploding = true`
3. **Виведення курсора** → таймер скасовується, `isProjectsExploding = false`
4. **Клік на блок проекту** → відкривається модальне вікно з деталями

### Mouse Event Handlers

```typescript
// onMouseEnter для Projects
if (section.id === 'projects') {
  projectsHoverTimeoutRef.current = window.setTimeout(() => {
    setIsProjectsExploding(true);
  }, 3000); // 3 секунди затримки
}

// onMouseLeave для Projects
if (section.id === 'projects') {
  clearTimeout(projectsHoverTimeoutRef.current);
  setIsProjectsExploding(false);
}
```

### ProjectsCarousel Explosion View

При `isExploding = true`:
- GSAP timeline паузиться
- Карусель ховається через `opacity: 0`
- З'являється сітка блоків проектів

### Адаптивна сітка

```typescript
const getGridLayout = () => {
  const count = projects.length;
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 }; // Max 16 проектів
};
```

### Анімація блоків

```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{
    duration: 0.4,
    delay: index * 0.05, // Stagger effect
    ease: 'backOut'
  }}
  whileHover={{ scale: 1.05 }}
/>
```

### Стилі блоків проектів

- Градієнтний фон з кольорами проекту
- Фонове зображення проекту (opacity 30%)
- Градієнтний overlay знизу для читабельності тексту
- Hover індикатор (кольорова точка)

### Прозорий фон секції

При explosion фон секції Projects стає прозорим:

```typescript
// BentoGrid.tsx - Projects background
<div style={{ opacity: isProjectsExploding ? 0 : 1 }} /> {/* White layer */}
<div style={{ opacity: isProjectsExploding ? 0 : 1 }} /> {/* Project image */}
```

### Кольори проектів

```typescript
const projectColors = [
  { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' }, // Pink/Magenta
  { from: '#05ddfa', via: '#00bfff', to: '#4169e1' }, // Cyan/Blue
  { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' }, // Yellow/Orange
  { from: '#4caf50', via: '#8bc34a', to: '#cddc39' }, // Green/Lime
  { from: '#ff6b6b', via: '#ff5252', to: '#f44336' }, // Red/Pink
];
```

### Transitions

| Елемент | Тривалість | Призначення |
|---------|------------|-------------|
| Блоки появи | 400ms + stagger | Анімація появи блоків |
| Фон секції | 500ms | Зникнення білого фону |
| Карусель | 300ms | Приховування/показ |

---

## LinkedIn Integration (December 2024, Updated December 2024)

### Опис

Публікація новин та блог-постів у LinkedIn через Telegram бота. Підтримка трьох мов: English, Norwegian, Ukrainian. Нативне завантаження зображень.

### Файли

```
├── supabase/functions/post-to-linkedin/index.ts  # LinkedIn API + native image upload
├── supabase/functions/telegram-webhook/index.ts  # Callback handlers + bot messages
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

### 📨 Сповіщення в боті (не popup!)

Всі сповіщення про LinkedIn публікацію відправляються як **повідомлення в боті**, а не як popup alert:

**При успішній публікації:**
```
✅ Опубліковано в LinkedIn (UA)!

📰 «Заголовок статті»
🔗 Переглянути пост
```

**При спробі повторної публікації:**
```
⚠️ Вже опубліковано в LinkedIn (UA)!

🔗 Переглянути пост
```

### 🛡️ Захист від дублікатів (Duplicate Safeguards)

Система запобігає повторній публікації:

**Для News/Blog:**
```typescript
if (news.is_published || news.is_rewritten) {
  // Показує: "⚠️ Ця новина вже опублікована!"
  // Прибирає кнопки публікації, залишає тільки LinkedIn
}
```

**Для LinkedIn:**
```typescript
if (news.linkedin_post_id) {
  // Відправляє повідомлення в бот (не popup!)
  // Прибирає LinkedIn кнопки, показує посилання на пост
}
```

### 🖼️ Нативне завантаження зображень (Native Image Upload)

LinkedIn тепер отримує зображення через **нативний upload** замість thumbnail URL:

```typescript
// Workflow завантаження зображення
async function uploadImageToLinkedIn(imageUrl: string): Promise<string | null> {
  // 1. Реєстрація завантаження
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner: LINKEDIN_PERSON_URN,
        // ...
      }
    })
  })

  // 2. Завантаження зображення з джерела
  const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer())

  // 3. Завантаження на LinkedIn
  await fetch(uploadUrl, {
    method: 'PUT',
    body: imageBuffer
  })

  return asset // urn:li:digitalmediaAsset:xxxxx
}
```

**Дві категорії постів:**
- **IMAGE** - коли зображення успішно завантажено (з asset URN)
- **ARTICLE** - fallback коли зображення немає або upload не вдався

> **Примітка:** Native video upload в LinkedIn потребує MP4 файл. YouTube не надає прямий MP4 URL, тому поки що відео публікуються як посилання. Для native video потрібен буде альтернативний сховище (Bunny.net Stream тощо).

### LinkedIn API

Використовується **UGC Post API** (User Generated Content):
- Endpoint: `https://api.linkedin.com/v2/ugcPosts`
- Assets API: `https://api.linkedin.com/v2/assets?action=registerUpload`
- Метод: POST
- Формат: IMAGE (з завантаженим зображенням) або ARTICLE (link preview)
- URL: `https://vitalii.no/news/{slug}` (реальний домен)

### Що публікується

```
{Заголовок статті}

{Повний опис статті - до 2500 символів}

🔗 Read more: https://vitalii.no/news/{slug}
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
supabase functions deploy telegram-webhook

# Set secrets
supabase secrets set LINKEDIN_ACCESS_TOKEN="your_token"
supabase secrets set LINKEDIN_PERSON_URN="urn:li:person:xxxxx"
```

---

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

## News Article Page (December 2024)

### Опис

Окрема сторінка для новин (`/news/[slug]`) з білим фоном та підтримкою всіх типів відео. Використовується для прямих посилань (LinkedIn, SEO).

### Файл

```
app/news/[slug]/NewsArticle.tsx
```

### Дизайн

- **Фон:** Білий (`bg-white`)
- **Текст:** Темно-сірий (`text-gray-900`, `text-gray-700`)
- **Посилання:** Синій (`text-blue-600`)
- **Tags:** Світло-сірий бейдж (`bg-gray-100`)
- **Author block:** Світло-сірий з рамкою (`bg-gray-50 border-gray-100`)

### Структура сторінки

```
┌─────────────────────────────────────────────────┐
│  Home / News / Article Title...                 │
│  ← Back to Home                                 │
│                                                 │
│  [Featured Image або Video]                     │
│                                                 │
│  Meta Unveils SAM Audio: A Breakthrough...      │
│  📅 December 17, 2025  👁 2 views               │
│                                                 │
│  [Article content - description_en]             │
│                                                 │
│  #ai #technology #meta                          │
│                                                 │
│  [Read Original Article] ← кнопка              │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Curated by                               │   │
│  │ Vitalii Berbeha                          │   │
│  │ E-commerce & Marketing Expert            │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Video Support

Підтримуються всі типи відео:
- **YouTube:** Нативний iframe player
- **Telegram embed:** Красивий fallback з кнопкою "Дивитись в Telegram"
- **Direct URL:** HTML5 video player

### SEO Features

- JSON-LD `NewsArticle` schema
- JSON-LD `BreadcrumbList` schema
- Open Graph metadata
- Twitter Cards
- Canonical URLs
- Hreflang tags

---

## Admin Skills Management (December 2024)

### Опис

Адмін-панель для керування скілами (технологіями), які відображаються в секції Skills на головній сторінці. Кожен скіл має назву та категорію, яка визначає колір бейджу.

### Файли

```
├── utils/skillsStorage.ts              # Утиліти для зберігання скілів
├── components/admin/SkillsManager.tsx  # Адмін-компонент для керування скілами
├── components/ui/SkillsAnimation.tsx   # Анімація скілів (використовує dynamic data)
├── app/admin/dashboard/page.tsx        # Адмін дашборд з вкладкою Skills
```

### Категорії та кольори

| Категорія | Label | Tailwind Classes | HEX |
|-----------|-------|------------------|-----|
| development | Development | `bg-green-100 text-green-800` | `#dcfce7` |
| ui | UI/Design | `bg-purple-100 text-purple-800` | `#f3e8ff` |
| automation | Automation | `bg-blue-100 text-blue-800` | `#dbeafe` |
| ai | AI/ML | `bg-orange-100 text-orange-800` | `#ffedd5` |
| marketing | Marketing | `bg-pink-100 text-pink-800` | `#fce7f3` |
| integration | Integration | `bg-cyan-100 text-cyan-800` | `#cffafe` |

### Структура даних

```typescript
interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

type SkillCategory = 'development' | 'ui' | 'ai' | 'automation' | 'marketing' | 'integration';
```

### Зберігання

Скіли зберігаються в `localStorage` під ключем `vitalii_skills_list`.

### Функції утиліт (`utils/skillsStorage.ts`)

```typescript
// Отримати скіли з localStorage або повернути defaults
getStoredSkills(): Skill[]

// Зберегти скіли в localStorage
saveSkills(skills: Skill[]): void

// Скинути до дефолтних скілів
resetSkillsToDefault(): Skill[]

// Генерувати унікальний ID для нового скілу
generateSkillId(): string

// Конвертувати для SkillsAnimation
convertSkillsForAnimation(skills: Skill[]): { name: string; category: string }[]
```

### Дефолтні скіли

При першому завантаженні або після скидання використовуються дефолтні скіли:

**Development:** React, TypeScript, Tailwind CSS, Python, FastAPI, Docker
**Integration:** Supabase, Firebase, Vercel, Netlify
**AI/ML:** Azure OpenAI, Claude MCP, spaCy, ElevenLabs API, Zvukogram API, OCR.space
**Automation:** n8n
**Marketing:** Helium10, Meta Ads Manager
**UI/Design:** Bolt.new, Canva

### Використання в адмін-панелі

1. Перейти в **Admin Panel → Skills**
2. Додавати нові скіли через форму (назва + категорія)
3. Редагувати існуючі скіли inline
4. Видаляти скіли кнопкою trash
5. Перетягувати скіли для зміни порядку (drag & drop)
6. Натиснути **Save Changes** для збереження
7. Оновити сторінку для застосування змін на сайті

### Функціонал адмін-компонента

- Додавання нових скілів з preview
- Inline редагування назви та категорії
- Видалення скілів
- Drag & drop сортування (Framer Motion Reorder)
- Групування по категоріях
- Preview як на сайті
- Reset to Default
- Індикатор незбережених змін

---

## Mobile Responsiveness Improvements (December 2024)

### Опис

Комплексне покращення мобільної версії сайту: виправлення проблем з viewport, адаптивна сітка, підтримка тач-жестів, safe area insets для пристроїв з notch, та reduced motion для accessibility.

### Файли

```
├── app/globals.css                      # Утиліти h-screen-safe, safe-area-inset, reduced-motion
├── app/page.tsx                         # Responsive padding, h-screen-safe клас
├── components/sections/BentoGrid.tsx    # Responsive gap, mobile heights
├── components/ui/Modal.tsx              # Safe area insets, responsive sizing
├── components/sections/NewsSection.tsx  # Responsive grid layout
├── components/ui/ProjectsCarousel.tsx   # Touch/swipe підтримка
├── components/layout/Footer.tsx         # Touch-friendly social buttons
├── hooks/useReducedMotion.ts            # Hook для prefers-reduced-motion
```

### Виправлені проблеми

#### 1. 100vh проблема на мобільних (Safari address bar)

**Проблема:** `height: 100vh` на iOS не враховує динамічну адресну строку Safari, що призводить до обрізаного контенту.

**Рішення:**
```css
/* globals.css */
body {
  height: 100dvh;        /* Dynamic viewport height */
  height: 100vh;         /* Fallback */
}

.h-screen-safe {
  height: 100vh;
  height: 100dvh;
}

@supports (height: 100dvh) {
  body { height: 100dvh; }
}
```

#### 2. Responsive Gap у BentoGrid

**Проблема:** Фіксований gap 20px займає занадто багато місця на маленьких екранах.

**Рішення:**
```typescript
const GAP_SIZE_DESKTOP = 20; // Desktop gap
const GAP_SIZE_MOBILE = 12;  // Mobile gap

// Використання
gap: `${isMobile ? GAP_SIZE_MOBILE : GAP_SIZE_DESKTOP}px`
```

#### 3. Safe Area Insets для Modal

**Проблема:** На iPhone X+ контент перекривається notch та home indicator.

**Рішення:**
```tsx
<div style={{
  paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
  paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
  paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
}} />
```

#### 4. NewsSection Responsive Grid

**Проблема:** Фіксована колонка 448px не адаптується до планшетів.

**Рішення:**
```css
/* Mobile: Stack */
.news-section-detail-grid {
  flex-direction: column;
}

/* Tablet (640px+): Single column */
@media (min-width: 640px) {
  grid-template-columns: 1fr;
}

/* Medium (768px+): Two columns */
@media (min-width: 768px) {
  grid-template-columns: minmax(280px, 45%) 1fr;
}

/* Large (1024px+): Fixed media width */
@media (min-width: 1024px) {
  grid-template-columns: 400px 1fr;
}
```

#### 5. Touch/Swipe Support для ProjectsCarousel

**Рішення:**
```typescript
// Touch event handlers
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartRef.current = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    time: Date.now(),
  };
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const deltaX = touch.clientX - touchStartRef.current.x;
  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    if (deltaX < 0) nextProject();
    else prevProject();
  }
};
```

#### 6. Prefers Reduced Motion

**CSS рішення:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**React Hook:**
```typescript
// hooks/useReducedMotion.ts
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    // ... listener
  }, []);

  return prefersReducedMotion;
};
```

#### 7. Touch-Friendly Targets

**Мінімальний розмір:** 44x44px для всіх інтерактивних елементів на тач-пристроях.

```css
@media (pointer: coarse) {
  button, a, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Mobile-First CSS Utilities

```css
/* globals.css */

/* Safe viewport heights */
.h-screen-safe { height: 100vh; height: 100dvh; }
.min-h-screen-safe { min-height: 100vh; min-height: 100dvh; }

/* Safe area padding for notched devices */
.safe-area-inset {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* Prevent iOS bounce */
body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}
```

### Breakpoints

| Breakpoint | Ширина | Призначення |
|------------|--------|-------------|
| `sm` | 640px | Малі планшети, великі телефони (landscape) |
| `md` | 768px | Планшети (portrait) |
| `lg` | 1024px | Планшети (landscape), малі десктопи |
| `xl` | 1280px | Десктопи |

### Testing Mobile

1. **Chrome DevTools:** Toggle device toolbar (Ctrl+Shift+M)
2. **Safari Responsive Mode:** Develop → Enter Responsive Design Mode
3. **Real Device Testing:** Критично для iOS Safari address bar
4. **Lighthouse Mobile Audit:** Performance, Accessibility, Best Practices

### Checklist для нових компонентів

- [ ] Використовуй `dvh` замість `vh` для повноекранних layouts
- [ ] Додай safe-area-inset для fixed/absolute positioned елементів
- [ ] Мінімальний touch target 44x44px
- [ ] Перевір на landscape orientation
- [ ] Тестуй swipe gestures якщо є carousel/slider
- [ ] Додай `active:` states для touch feedback
- [ ] Використовуй responsive Tailwind classes (sm:, md:, lg:)

---

## Bug Fixes & Improvements (December 2024 - Session 2)

### Опис

Виправлення критичних помилок у Supabase Edge Functions для коректної роботи пре-модерації та публікації контенту.

### Файли

```
├── supabase/functions/pre-moderate-news/index.ts   # Azure OpenAI deployment fix
├── supabase/functions/post-to-linkedin/index.ts    # URL format fix
├── supabase/functions/process-blog-post/index.ts   # Video data saving fix
```

### 1. Azure OpenAI Deployment Fix (`pre-moderate-news`)

**Проблема:** Функція пре-модерації використовувала неіснуючий deployment `gpt-4`, що призводило до помилки `DeploymentNotFound` і тихого провалу пре-модерації.

**Симптоми:**
- `usage_count` не інкрементувався
- Пре-модерація не працювала
- Помилка в логах: `DeploymentNotFound`

**Рішення:**
```typescript
// До
const deploymentName = 'gpt-4';

// Після
const deploymentName = 'Jobbot-gpt-4.1-mini';
```

Тепер використовується той самий deployment, що й в інших функціях проекту.

### 2. LinkedIn URL Format Fix (`post-to-linkedin`)

**Проблема:** Функція додавала мовні префікси (`/no/`, `/uk/`) до URL, але Next.js роути не мають таких префіксів - мова обробляється client-side через контекст.

**Симптоми:**
- Посилання в LinkedIn постах вели на 404
- URL виглядав як: `https://vitalii.no/no/news/slug`

**Рішення:**
```typescript
// До
const articleUrl = `https://vitalii.no/${language === 'en' ? '' : language + '/'}news/${slug}`;

// Після
const articleUrl = `https://vitalii.no/news/${slug}`;
```

Тепер URL коректний: `https://vitalii.no/news/slug`

### 3. Blog Post Video Data Fix (`process-blog-post`)

**Проблема:** При створенні блог-постів `video_url` та `video_type` передавались з `telegram-webhook`, але не зберігались в базу даних.

**Симптоми:**
- Блог-пости без відео, навіть якщо оригінальна новина мала відео
- `video_url` та `video_type` завжди `null` в `blog_posts`

**Рішення:**
```typescript
// Додано до INSERT запиту
const { data, error } = await supabaseClient
  .from('blog_posts')
  .insert({
    // ... інші поля
    video_url: videoUrl,      // Додано
    video_type: videoType,    // Додано
  })
```

### Deploy команди

```bash
cd supabase
supabase functions deploy pre-moderate-news
supabase functions deploy post-to-linkedin
supabase functions deploy process-blog-post
```

---

## AI Prompts Selection Fix (December 2024)

### Опис

Виправлення вибору AI промптів з бази даних. Тепер завжди береться **останній оновлений** промпт замість випадкового.

### Проблема

При наявності кількох промптів з однаковим `prompt_type` (напр. два `blog_rewrite`), запит `.limit(1)` без сортування повертав **перший знайдений** в непередбачуваному порядку. Це призводило до використання старого промпту замість відредагованого.

### Рішення

Додано `.order('updated_at', { ascending: false })` перед `.limit(1)`:

```typescript
// До (неправильно)
const { data: prompts } = await supabase
  .from('ai_prompts')
  .select('*')
  .eq('is_active', true)
  .eq('prompt_type', 'blog_rewrite')
  .limit(1)  // ❌ Може повернути будь-який промпт

// Після (правильно)
const { data: prompts } = await supabase
  .from('ai_prompts')
  .select('*')
  .eq('is_active', true)
  .eq('prompt_type', 'blog_rewrite')
  .order('updated_at', { ascending: false })  // ✅ Найновіший перший
  .limit(1)
```

### Виправлені функції

| Функція | Тип промпту | Файл |
|---------|-------------|------|
| `process-blog-post` | `blog_rewrite` | `supabase/functions/process-blog-post/index.ts` |
| `pre-moderate-news` | `pre_moderation` | `supabase/functions/pre-moderate-news/index.ts` |
| `process-news` | `news_rewrite`, `rewrite` | `supabase/functions/process-news/index.ts` |

### Як працює

1. Якщо в базі є кілька промптів з однаковим `prompt_type`
2. Обидва можуть бути `is_active = true`
3. Тепер береться той, що має найновіший `updated_at`
4. Редагування промпту в адмін-панелі автоматично оновлює `updated_at`

### Deploy

```bash
cd supabase
supabase functions deploy process-blog-post
supabase functions deploy pre-moderate-news
supabase functions deploy process-news
```

---

## AI Image Generation & Upload (December 2024)

### Опис

Інтеграція генерації промптів для зображень через Azure OpenAI та завантаження власних зображень через Telegram бота. Користувач може використовувати згенерований промпт в Google AI Studio (Gemini 3 Banana) для створення зображень або завантажити власне зображення з галереї.

### Файли

```
├── supabase/functions/generate-image-prompt/index.ts  # Edge Function для генерації промпту
├── supabase/functions/telegram-scraper/index.ts       # Виклик generate-image-prompt після пре-модерації
├── supabase/functions/telegram-webhook/index.ts       # Обробка завантаження зображень та callback кнопок
├── supabase/migrations/20251221_add_image_generation_prompt.sql  # Додавання полів для промпту
```

### Workflow

```
1. Новина проходить пре-модерацію (AI)
   ↓
2. Azure OpenAI генерує короткий промпт для зображення (1-3 речення, max 200 символів)
   ↓
3. Промпт показується користувачу в Telegram боті
   ↓
4. Користувач має 2 опції:
   ├─ 🖼️ Залишити поточне зображення (якщо є)
   │  → Підтверджується, що зображення залишено
   │
   └─ 📸 Завантажити власне зображення
      → Бот просить відповісти фото на це повідомлення
      → Користувач відправляє фото
      → Зображення завантажується в Supabase Storage (/custom/)
      → processed_image_url оновлюється в базі
      → Підтвердження з URL зображення
   ↓
5. Користувач може продовжити з публікацією (📰 В новини / 📝 В блог)
```

### Database Fields

**Таблиця `news` (і `blog_posts`):**
- `image_generation_prompt` (TEXT) - AI-згенерований промпт для Google AI Studio
- `prompt_generated_at` (TIMESTAMPTZ) - Час створення промпту
- `processed_image_url` (TEXT) - URL завантаженого зображення (власне або AI-згенероване)
- `image_processed_at` (TIMESTAMPTZ) - Час завантаження зображення

### Telegram Bot UI

```
┌─────────────────────────────────────────────────────┐
│  🆕 New Post from Telegram Channel                  │
│                                                     │
│  Channel: @geekneural                              │
│  Message ID: 12345                                 │
│  Content: Meta Unveils SAM Audio...                │
│                                                     │
│  🎨 Image Generation Prompt (копіюй в Google...): │
│  Professional illustration of audio waveforms...   │
│                                                     │
│  💡 Скопіюй промпт вище та використай в Google...  │
│  ⏳ Waiting for moderation...                       │
├─────────────────────────────────────────────────────┤
│  [📰 В новини]  [📝 В блог]                        │
│  [🖼️ Залишити зображення]  [📸 Завантажити власне]│
│  [🔗 LinkedIn EN] [LinkedIn NO] [LinkedIn UA]      │
│  [❌ Reject]                                        │
└─────────────────────────────────────────────────────┘
```

### Callbacks

| Callback Data | Дія |
|---------------|-----|
| `keep_image_${newsId}` | Залишити поточне зображення |
| `upload_image_${newsId}` | Почати процес завантаження власного зображення |

### Upload Flow

**1. Користувач натискає "📸 Завантажити власне":**
```
✅ Popup: "📸 Відправте фото у відповідь на це повідомлення"
✏️ Повідомлення оновлюється:
   "📸 Очікую фото...
    Reply to this message with your photo
    newsId:abc-123-def-456"
```

**2. Користувач відправляє фото у reply:**
```
1. Telegram webhook перевіряє:
   - Чи це reply на повідомлення?
   - Чи містить фото?
   - Чи текст містить "Очікую фото" та newsId?

2. Завантажує фото з Telegram Bot API
   → Зберігає в Supabase Storage (bucket: news-images, path: custom/${newsId}_${timestamp}.jpg)
   → Отримує публічний URL

3. Оновлює news запис:
   - processed_image_url = publicUrl
   - image_processed_at = now()

4. Підтверджує користувачу:
   "✅ Зображення завантажено!
    📸 URL: https://...
    🆔 News ID: abc-123-def-456"

5. Оновлює оригінальне повідомлення:
   "✅ Власне зображення завантажено"
```

### Generate Image Prompt Function

**Input:**
```json
{
  "newsId": "abc-123-def-456",
  "title": "Meta Unveils SAM Audio: A Breakthrough...",
  "content": "Meta has announced..."
}
```

**Output:**
```json
{
  "success": true,
  "prompt": "Professional illustration of audio waveforms transforming into colorful AI neural networks, modern tech style, vibrant blues and purples"
}
```

### Azure OpenAI Prompt Engineering

**Промпт зберігається в базі даних** (`ai_prompts` таблиця) з типом `image_generation` та може бути відредагований через Admin Panel → Settings → AI Prompts.

**Дефолтний промпт (людино-орієнтований підхід):**
```
Подивися на статтю очима людини якій далека тема але при цьому щось їй ну дуже цікаво.
Як ти вважаєш що саме було б цікаво цій людині? Яка картинка постала перед очима цієї людини?
Напиши одне коротке речення на основі якого я б передав би художнику реалісту твоє бачення!
Це може бути ілюстрація, фото реалістична картинка, футуристична, і тд.
Стиль повинен бути максимально наближений до духу статті.
Сам опис картини повинен бути детальним та зрозумілим з першого погляду навіть без тексту.

Ось стаття:

Заголовок: {title}

Текст: {content}

Твоє бачення (одне речення, max 200 символів):
```

**Плейсхолдери:**
- `{title}` - замінюється на заголовок статті
- `{content}` - замінюється на текст статті (перші 1000 символів)

**Характеристики промпту:**
- Емоційний, людино-орієнтований підхід
- Дивиться на статтю очима звичайної цікавої людини
- Створює детальний візуальний опис
- Виводить одне речення (max 200 символів)
- Адаптується до духу статті

**Як редагувати:**
1. Зайти в Admin Panel → Settings → AI Prompts
2. Знайти промпт "🎨 Генерація опису зображення" (тип: `image_generation`)
3. Відредагувати текст промпту
4. Зберегти зміни
5. Наступні генерації використовуватимуть новий промпт

**Приклади згенерованих описів:**

| Стаття | Згенерований опис (українською) |
|--------|----------------------------------|
| "Meta представила SAM Audio" | Футуристична ілюстрація де звукові хвилі перетворюються на кольорову нейронну мережу ШІ, сучасний tech-стиль з яскравими синьо-фіолетовими тонами |
| "Вчені виявили нову екзопланету" | Художня візуалізація синьо-зеленої планети схожої на Землю з двома сонцями на горизонті, космічний стиль ілюстрації |
| "Новий ШІ інструмент допомагає лікарям" | Чиста медична ілюстрація де штучний інтелект у вигляді світного мозку аналізує дані пацієнтів на голографічних дисплеях |

### Storage Structure

```
news-images/
├── telegram/               # Оригінальні зображення з Telegram
│   └── channelname/
│       ├── 12345.jpg
│       ├── 12345_1.jpg     # Multiple images support
│       └── 12345_2.jpg
└── custom/                 # Власні завантажені зображення
    ├── abc-123_1703123456789.jpg
    └── def-456_1703123456790.jpg
```

### Error Handling

**1. Генерація промпту не вдалася:**
- Новина все одно відправляється в бот
- Промпт не показується
- Кнопки вибору зображення залишаються

**2. Завантаження фото не вдалося:**
- Користувачу показується помилка
- Можна спробувати ще раз
- Оригінальне зображення залишається незмінним

**3. Azure OpenAI недоступний:**
- Функція логує помилку
- Повертає `success: false`
- Telegram бот продовжує працювати без промпту

### Використання промпту

**Google AI Studio (Gemini 3 Banana):**
1. Відкрити [Google AI Studio](https://aistudio.google.com/)
2. Вибрати модель Gemini 3 Banana (або інша з підтримкою генерації зображень)
3. Вставити скопійований промпт
4. Згенерувати зображення
5. Завантажити та відправити в Telegram бота

### Deploy

```bash
cd supabase

# Apply migrations (додає поля та оновлює промпт)
# Виконати SQL з файлів:
# - 20251221_add_image_generation_prompt.sql (додає поля)
# - 20251221_update_image_generation_prompt.sql (оновлює промпт)

# Функції задеплояться автоматично через GitHub Actions при merge в main
# Або вручну:
supabase functions deploy generate-image-prompt
supabase functions deploy telegram-webhook
supabase functions deploy telegram-scraper
```

**ВАЖЛИВО:** Перед deploy переконайтеся що в Supabase Secrets є всі необхідні змінні:
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Telegram Bot Workflow Improvements (December 22, 2024)

### Опис

Комплексне покращення Telegram бота для модерації новин: секвенційний workflow, автоматична детекція медіа, покращений контекст для AI промптів, та відображення посилань на джерела.

### Виправлені проблеми

#### 1. Sequential Workflow (Секвенційний робочий процес)

**Проблема:** Всі кнопки показувались одночасно, що було незрозуміло та заплутано.

**Рішення:** Покроковий workflow з автоматичною зміною кнопок:

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Image Selection (якщо немає відео)        │
│  ┌───────────────────────────────────────────────┐ │
│  │  ✅ Залишити зображення                       │ │
│  │  📸 Згенерувати своє                           │ │
│  │  ❌ Reject                                     │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 2: Publication (після підтвердження)         │
│  ┌───────────────────────────────────────────────┐ │
│  │  📰 В новини    │    📝 В блог                 │ │
│  │  ❌ Reject                                     │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 3: LinkedIn (після публікації)               │
│  ┌───────────────────────────────────────────────┐ │
│  │  🔗 LinkedIn EN │ LinkedIn NO │ LinkedIn UA    │ │
│  └───────────────────────────────────────────────┘ │
│                        ↓                            │
│  STEP 4: Final Links (після LinkedIn поста)        │
│  ┌───────────────────────────────────────────────┐ │
│  │  ✅ LINKEDIN EN                                │ │
│  │  📰 «Article Title»                            │ │
│  │  📝 Читати статтю (website link)               │ │
│  │  🔗 Переглянути пост (LinkedIn link)           │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Виконані зміни:**

| Файл | Зміни |
|------|-------|
| `telegram-scraper/index.ts` | Початкові кнопки: тільки image workflow або publish (якщо є відео) |
| `telegram-webhook/index.ts` | Нові callback handlers: `confirm_image`, `create_custom` |
| `telegram-webhook/index.ts` | Photo upload показує publish buttons після завантаження |
| `telegram-webhook/index.ts` | LinkedIn handler додає article URL + LinkedIn URL в кінці |

#### 2. Media Detection (Автоматична детекція медіа)

**Проблема:** Бот показував кнопки вибору зображення навіть коли пост містив відео.

**Рішення:** Автоматична детекція типу медіа:

```typescript
// telegram-scraper/index.ts
const hasVideo = videoUrl && videoType

if (hasVideo) {
  // 🎥 Video exists → Skip image workflow
  keyboard = {
    inline_keyboard: [
      [
        { text: '📰 В новини', callback_data: `publish_news_${newsId}` },
        { text: '📝 В блог', callback_data: `publish_blog_${newsId}` }
      ],
      [{ text: '❌ Reject', callback_data: `reject_${newsId}` }]
    ]
  }
} else {
  // 🖼️ No video → Show image workflow
  // ...
}
```

**Результат:**
- Якщо `video_url` існує → Одразу показуються кнопки публікації
- Якщо немає відео → Показується image workflow (Step 1)

**CRITICAL FIX (Dec 22):** Використання `uploadedPhotoUrl` замість `post.photoUrl`

**Проблема:** Бот використовував `post.photoUrl` (оригінальний URL з парсингу каналу), а не оновлений `photoUrl` після завантаження в Supabase Storage. Через це image workflow пропускався навіть коли зображення було успішно завантажено.

**Рішення:**
```typescript
// telegram-scraper/index.ts:471
sendToTelegramBot(..., photoUrl || null) // Pass uploaded photoUrl

// telegram-scraper/index.ts:875
const hasImage = uploadedPhotoUrl // Use uploaded, not original post.photoUrl
```

Тепер image workflow кнопки показуються **тільки** коли зображення реально завантажено в Supabase Storage.

#### 3. Longer Prompt Context (Більше контексту для AI)

**Проблема:** AI промпт для генерації опису зображення отримував тільки перші 1000 символів статті, що було недостатньо для розуміння контексту.

**Рішення:**

```typescript
// generate-image-prompt/index.ts (line 150)
// До
promptTemplate = promptTemplate.replace(/{content}/g, content.substring(0, 1000))

// Після
promptTemplate = promptTemplate.replace(/{content}/g, content.substring(0, 5000))
```

**Результат:** AI отримує в 5 разів більше контексту (5000 символів), що дозволяє краще зрозуміти суть статті та згенерувати релевантніший опис зображення.

#### 4. Display Source Links (Відображення посилань на джерела)

**Проблема:** Поле `source_link` (зовнішнє джерело статті, знайдене LLM) не відображалось у фінальній UI новин та блогу.

**Рішення:**

**NewsArticle.tsx (lines 226-238):**
```typescript
{(news.source_link || news.original_url) && (
  <div className="mb-8">
    <a
      href={news.source_link || news.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl"
    >
      <ExternalLink className="w-4 h-4" />
      Read Original Article
    </a>
  </div>
)}
```

**NewsModal.tsx (lines 445-448):**
```typescript
{((selectedNews as any).source_link || selectedNews.original_url) && (
  <a href={(selectedNews as any).source_link || selectedNews.original_url}>
    {t('news_read_more')}
  </a>
)}
```

**Результат:**
- `source_link` має пріоритет над `original_url`
- Показується як помітна кнопка "Read Original Article"
- Відкривається у новій вкладці з `noopener noreferrer`

### New Callback Handlers

| Callback | Опис | Наступний крок |
|----------|------|----------------|
| `confirm_image_${newsId}` | Підтверджує існуюче зображення або продовжує без зображення | Показує кнопки публікації |
| `create_custom_${newsId}` | Ініціює завантаження власного зображення | Чекає reply з фото |
| `publish_news_${newsId}` | Публікує як новину | Показує LinkedIn кнопки |
| `publish_blog_${newsId}` | Публікує як блог-пост | Показує LinkedIn кнопки |
| `linkedin_en/no/ua_${newsId}` | Публікує в LinkedIn | Показує фінальні посилання |

### Photo Upload Flow

```
1. Користувач натискає "📸 Створити своє"
   ↓
2. Бот оновлює повідомлення: "📸 Очікую фото..."
   ↓
3. Користувач відправляє фото як reply (Telegram Bot API)
   ↓
4. Бот завантажує фото через getFile API
   ↓
5. Зберігає в Supabase Storage (custom/ folder)
   ↓
6. Оновлює processed_image_url в базі даних
   ↓
7. Показує кнопки публікації [📰 В новини] [📝 В блог]
   ↓
8. При публікації: processed_image_url має ПРІОРИТЕТ над image_url
```

### Image Priority Logic

**Проблема:** Раніше завантажене зображення (`processed_image_url`) не використовувалось при публікації.

**Рішення:**
```typescript
// telegram-webhook/index.ts:611
imageUrl: news.processed_image_url || news.image_url || null
```

**Пріоритет:**
1. `processed_image_url` - власне завантажене зображення
2. `image_url` - оригінальне з Telegram каналу
3. `null` - немає зображення

Це гарантує що користувацькі зображення **реально використовуються** в опублікованих статтях.

### Deploy

```bash
cd supabase

# Deploy оновлені функції
supabase functions deploy telegram-scraper
supabase functions deploy telegram-webhook
supabase functions deploy generate-image-prompt
```

### Testing Checklist

- [ ] Posts з відео пропускають image workflow
- [ ] Posts без відео показують image workflow з правильними кнопками:
  - [ ] ✅ Залишити зображення
  - [ ] 📸 Згенерувати своє
- [ ] Підтвердження зображення показує publish buttons
- [ ] Custom image upload показує publish buttons після завантаження
- [ ] **Custom image реально використовується в публікації** (processed_image_url priority)
- [ ] **Image workflow показується тільки коли зображення завантажено** (uploadedPhotoUrl check)
- [ ] Публікація показує LinkedIn buttons
- [ ] LinkedIn post показує фінальні посилання (article + LinkedIn)
- [ ] Source links відображаються у NewsArticle та NewsModal
- [ ] AI промпт генерується з більшим контекстом (5000 chars)

### 5. Retry Logic для Pending News (December 22, 2024)

**Проблема:** Новини які пройшли AI модерацію (`approved`) але не були відправлені в Telegram бот (помилка/збій) застрягали в БД назавжди. При наступному скрапінгу вони пропускались як дублікати.

**Симптоми:**
- 200+ новин в Queue (admin panel)
- Новини не надходять в Telegram бот
- `pre_moderation_status = 'approved'` але `is_published = false`

**Рішення:**
```typescript
// telegram-scraper/index.ts:318-395
if (existingPost.pre_moderation_status === 'approved' &&
    !existingPost.is_published &&
    !existingPost.is_rewritten) {

  // 1. Generate image prompt
  // 2. Re-upload photo if needed
  // 3. Retry sending to Telegram bot
  console.log(`🔄 Retry sending approved but unpublished post to bot`)
}
```

**Що відбувається при retry:**
1. Генерується image prompt через Edge Function
2. Фото завантажується в Supabase Storage (якщо потрібно)
3. Повторна спроба відправки в Telegram бот
4. Логування результату (success/fail)

**Результат:** Всі approved новини які застрягли в черзі будуть автоматично відправлені в бот при наступному запуску scraper.

### 6. Debug Logging для Queue Diagnostics (December 22, 2024)

**Проблема:** 200+ новин в черзі, але жодні нові новини не надходять в Telegram бот. Логи показували що пости знайдені, але не оброблені.

**Симптоми:**
- Логи: "✅ Found 17 message elements"
- Але НЕ БУЛО логів: "🔄 Processing post ${messageId}"
- Всі пости відсіювалися, але невідомо чому

**Рішення:** Додано детальне логування для діагностики:

```typescript
// telegram-scraper/index.ts

// 1. Date range parsing
console.log(`📨 Found ${posts.length} posts`)
if (posts.length > 0) {
  const dates = posts.map(p => p.date).sort((a, b) => a.getTime() - b.getTime())
  const oldestDate = dates[0]
  const newestDate = dates[dates.length - 1]
  console.log(`📅 Parsed posts date range: ${oldestDate.toISOString()} to ${newestDate.toISOString()}`)
}

// 2. Date filtering with warnings
console.log(`📊 Filtering ${posts.length} parsed posts by date...`)
const newPosts = posts.filter(post => {
  const passesFilter = filterToDate
    ? (post.date >= filterFromDate && post.date <= filterToDate)
    : (post.date > filterFromDate)

  if (!passesFilter) {
    console.log(`⏭️ Skipping post ${post.messageId} (date ${post.date.toISOString()} outside filter range)`)
  }
  return passesFilter
})

// 3. Final count and warning
console.log(`✅ Found ${newPosts.length} post(s) matching date filter (out of ${posts.length} parsed)`)
if (newPosts.length === 0) {
  console.log(`⚠️ No posts passed date filter. Filter range: ${filterFromDate.toISOString()} to ${filterToDate ? filterToDate.toISOString() : 'now'}`)
}

// 4. Missing datetime warning
if (!datetime) {
  console.log(`⚠️ Post ${messageId} has no datetime attribute, using current time`)
}
```

**Що логується тепер:**

| Етап | Лог | Мета |
|------|-----|------|
| Parsing | `📅 Parsed posts date range: X to Y` | Показати діапазон спарсених дат |
| Filtering | `📊 Filtering N parsed posts by date...` | Скільки постів до фільтру |
| Skipped | `⏭️ Skipping post X (date Y outside filter range)` | Чому пост відсіяний |
| Result | `✅ Found N post(s) matching date filter (out of M parsed)` | Скільки пройшло фільтр |
| Warning | `⚠️ No posts passed date filter. Filter range: X to Y` | Якщо жоден не пройшов |
| Missing date | `⚠️ Post X has no datetime attribute` | Коли дата не спарсилась |

**Результат:** Тепер можемо точно діагностувати чому пости не обробляються:
- Чи всі пости старіші за last_fetched_at?
- Чи є проблеми з парсингом дат?
- Чи filter range налаштований правильно?

### 7. Deployment Troubleshooting & Version Logging (December 24, 2024)

**Проблема:** Supabase Edge Functions не оновлювались після GitHub Actions deployment, навіть коли workflow показував success. Функції продовжували виконувати старий код.

**Симптоми:**
- GitHub Actions workflow "Deploy Supabase Edge Functions" завершувався успішно
- Але Supabase function logs показували старий код (відсутні нові debug логи)
- Workflow output показував: "No change found in Function: telegram-scraper"
- Навіть після додавання dummy коментарів та merge PR

**Діагностика:**

1. **Перевірка версії в логах:**
```
# Старий код (до fix)
🕷️  Telegram Scraper started

# Новий код (після fix)
🕷️  Telegram Scraper v2024-12-24-01 started
📦 Features: Sequential workflow, media detection, debug logging, retry logic
```

2. **Перевірка GitHub Actions logs:**
- Відкрити https://github.com/SmmShaman/vitalii_claude-code-in-browser/actions
- Знайти workflow run "Deploy Supabase Edge Functions"
- Відкрити job "deploy"
- Розгорнути step "Deploy all functions"
- Шукати: `Deploying function: telegram-scraper`

**Очікуваний output при успішному deployment:**
```
Deploying function: telegram-scraper
Bundling Function: telegram-scraper
Deploying Function: telegram-scraper (script size: X.XXX MB)
Deployed Functions on project ***: telegram-scraper
```

**Очікуваний output коли Supabase пропускає deployment:**
```
No change found in Function: telegram-scraper
```

**Рішення:** Додано version logging для верифікації deployment:

```typescript
// supabase/functions/telegram-scraper/index.ts:89-91
// Version: 2024-12-24-01 - Sequential workflow + debug logging
console.log('🕷️  Telegram Scraper v2024-12-24-01 started')
console.log('📦 Features: Sequential workflow, media detection, debug logging, retry logic')

// supabase/functions/telegram-scraper/index.ts:636
console.log(`✅ Telegram Scraper v2024-12-24-01 finished successfully`)
```

**Як перевірити що deployment відбувся:**

1. Запустити функцію через Admin Panel або Edge Function endpoint
2. Перевірити Supabase Function Logs
3. Шукати рядок: `🕷️  Telegram Scraper v2024-12-24-01 started`
4. Якщо version присутній → deployment successful
5. Якщо version відсутній → функція все ще на старій версії

**Checksum Issue:**

Supabase CLI використовує checksums для визначення чи змінився код функції:
- Тільки зміни в коді викликають checksum change
- Зміни в коментарях можуть не змінити checksum (залежить від bundler)
- Найкращий спосіб force redeploy: змінити actual код (log statements, constants, тощо)

**Deployment через GitHub Actions:**

GitHub Actions workflow (`/.github/workflows/deploy-supabase.yml`) автоматично деплоїть при:
- Push до `main` branch
- Зміни в `supabase/functions/**` або `supabase/migrations/**`
- Manual workflow dispatch

**Manual deployment (альтернатива):**

Якщо GitHub Actions не спрацьовує:
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login --token YOUR_ACCESS_TOKEN

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy specific function
supabase functions deploy telegram-scraper --no-verify-jwt

# Deploy all functions
for dir in supabase/functions/*/; do
  if [ -d "$dir" ] && [ "$(basename $dir)" != "_shared" ]; then
    func_name=$(basename $dir)
    supabase functions deploy $func_name --no-verify-jwt
  fi
done
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://vitalii-berbeha.netlify.app

# Telegram (Bot API + MTProto)
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_API_ID=35388773
TELEGRAM_API_HASH=aa3d654a6327701da78c0f44e1a47993

# YouTube API
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=GOCSPX-...
YOUTUBE_REFRESH_TOKEN=1//04...

# LinkedIn Integration
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:your_person_id

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_key
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
