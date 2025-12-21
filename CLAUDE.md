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
- Підтримка відео (Bunny.net Stream, Telegram fallback)
- Поля: `video_type`, `video_url`, `bunny_video_id`
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
- Bunny.net Stream embed підтримка
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

### 🎬 Нативне завантаження відео (Native Video Upload)

LinkedIn підтримує **native video** з кращим охопленням ніж посилання. Використовуємо Bunny.net MP4 для завантаження:

```typescript
// Workflow завантаження відео
async function uploadVideoToLinkedIn(bunnyVideoId: string): Promise<string | null> {
  // 1. Отримати MP4 з Bunny.net
  const mp4Url = `https://${BUNNY_PULL_ZONE}.b-cdn.net/${bunnyVideoId}/play_720p.mp4`;
  const videoBuffer = await fetch(mp4Url).then(r => r.arrayBuffer());

  // 2. Реєстрація завантаження відео
  const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: LINKEDIN_PERSON_URN,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    })
  });

  const { value } = await registerResponse.json();
  const uploadUrl = value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const asset = value.asset;

  // 3. Завантажити відео
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: videoBuffer
  });

  // 4. Polling до статусу AVAILABLE
  await waitForVideoProcessing(asset);

  return asset; // urn:li:digitalmediaAsset:xxxxx
}

async function waitForVideoProcessing(asset: string, timeout = 300000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const response = await fetch(
      `https://api.linkedin.com/v2/assets/${encodeURIComponent(asset)}`,
      { headers: { 'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}` } }
    );
    const data = await response.json();

    if (data.recipes?.[0]?.status === 'AVAILABLE') return;
    if (data.recipes?.[0]?.status === 'FAILED') throw new Error('Video processing failed');

    await new Promise(r => setTimeout(r, 10000)); // Check every 10s
  }
  throw new Error('Video processing timeout');
}
```

**LinkedIn технічні вимоги для відео:**

| Параметр | Вимога |
|----------|--------|
| Формат | MP4 (обов'язково) |
| Кодек | H.264 + AAC audio |
| Розмір файлу | до 5 GB |
| Тривалість | 3 сек – 10 хв |
| Роздільність | 1080p рекомендовано |
| Бітрейт | 8 Mbps оптимально |
| Частота аудіо | 48 kHz |

**Три категорії постів:**
- **VIDEO** - коли відео успішно завантажено з Bunny.net
- **IMAGE** - коли зображення успішно завантажено (з asset URN)
- **ARTICLE** - fallback коли media немає або upload не вдався

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

## Video Handling & Bunny.net Stream Integration (December 2024)

### Опис

Автоматичне завантаження відео з Telegram каналів на Bunny.net Stream для надійного вбудовування на сайті та нативного завантаження в LinkedIn.

### ⚠️ Чому не YouTube?

| Проблема | YouTube | Bunny.net |
|----------|---------|-----------|
| Ліміт uploads/день | ~6 (10,000 units, upload=1,600) | Без лімітів |
| LinkedIn native video | ❌ Тільки embed | ✅ MP4 download URL |
| API складність | OAuth 2.0 + refresh tokens | Простий API key |
| Вартість | Безкоштовно, але з лімітами | Pay-as-you-go |

### Файли

```
├── supabase/functions/telegram-scraper/index.ts   # Video extraction + Bunny.net upload
├── supabase/functions/_shared/bunny-helpers.ts    # Bunny.net Stream API helpers
├── supabase/functions/post-to-linkedin/index.ts   # Native video upload via Bunny MP4
├── components/sections/NewsSection.tsx            # Video player (iframe/HLS)
├── components/sections/NewsModal.tsx              # Video player (iframe/HLS)
├── app/news/[slug]/NewsArticle.tsx                # Standalone news page with video
```

### Video Types

| Type | Опис | Джерело |
|------|------|---------|
| `bunny` | Bunny.net Stream embed | Завантажено на Bunny.net |
| `bunny_hls` | HLS playlist URL | Для кастомних плеєрів |
| `telegram_embed` | Telegram post URL | Fallback коли Bunny недоступний |
| `direct_url` | Пряме посилання на .mp4 | Рідко використовується |

### Workflow обробки відео

```
1. Scraper знаходить відео в Telegram пості
   ↓
2. Telegram відео > 20MB?
   ├─ ТАК → MTProto (Pyrogram) для скачування до 2GB
   └─ НІ  → Стандартний Bot API
   ↓
3. Bunny.net credentials налаштовані?
   ├─ ТАК → Створити video object (POST /videos)
   │        → Завантажити binary (PUT /videos/{id})
   │        → Polling до status=4 (Finished)
   │        → video_type = 'bunny'
   │        → video_url = embed URL
   │        → bunny_video_id = GUID
   │
   └─ НІ (або помилка) → Fallback на Telegram embed
                        → video_type = 'telegram_embed'
                        → video_url = 'https://t.me/channel/123?embed=1'
```

### Bunny.net Stream API

#### Автентифікація

```typescript
const BUNNY_LIBRARY_ID = '62a42da3-5234-4b4c-9e61-8fc06571220d';
const BUNNY_STREAM_API_KEY = '081d503b-9eb8-40f2-a629-f7b0b821a1f0';
const BUNNY_BASE_URL = 'https://video.bunnycdn.com';

const headers = {
  'AccessKey': BUNNY_STREAM_API_KEY,
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};
```

> ⚠️ **ВАЖЛИВО**: Stream API використовує **власні ключі автентифікації**. Account API key НЕ працює!

#### Основні endpoints

| Операція | Метод | Endpoint |
|----------|-------|----------|
| Список відео | GET | `/library/{libraryId}/videos` |
| Інфо про відео | GET | `/library/{libraryId}/videos/{videoId}` |
| Створити video object | POST | `/library/{libraryId}/videos` |
| Завантажити файл | PUT | `/library/{libraryId}/videos/{videoId}` |
| Fetch з URL | POST | `/library/{libraryId}/videos/fetch` |
| Видалити | DELETE | `/library/{libraryId}/videos/{videoId}` |

#### Статуси відео

| Код | Статус | Опис |
|-----|--------|------|
| 0 | Created | Об'єкт створено, файл не завантажено |
| 1 | Uploaded | Файл завантажено, очікує обробки |
| 2 | Processing | Обробляється |
| 3 | Transcoding | Транскодування |
| 4 | Finished | ✅ Готово до відтворення |
| 5 | Error | Помилка обробки |

#### Приклад: Upload відео

```typescript
// Крок 1: Створити video object
const createResponse = await fetch(
  `${BUNNY_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({ title: 'My Video' })
  }
);
const { guid: videoId } = await createResponse.json();

// Крок 2: Завантажити binary
await fetch(
  `${BUNNY_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
  {
    method: 'PUT',
    headers: {
      'AccessKey': BUNNY_STREAM_API_KEY,
      'Content-Type': 'application/octet-stream'
    },
    body: videoBuffer // ArrayBuffer або Buffer
  }
);

// Крок 3: Polling до status=4
let status = 0;
while (status !== 4) {
  await new Promise(r => setTimeout(r, 5000));
  const info = await fetch(
    `${BUNNY_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos/${videoId}`,
    { headers }
  ).then(r => r.json());
  status = info.status;
  if (status === 5) throw new Error('Encoding failed');
}
```

#### Приклад: Fetch з URL (альтернатива)

```typescript
// Для публічно доступних URL
const response = await fetch(
  `${BUNNY_BASE_URL}/library/${BUNNY_LIBRARY_ID}/videos/fetch`,
  {
    method: 'POST',
    headers,
    body: JSON.stringify({
      url: 'https://example.com/video.mp4',
      title: 'Fetched Video'
    })
  }
);
```

### URL структура Bunny.net

| Тип | URL шаблон | Призначення |
|-----|-----------|-------------|
| **Embed Player** | `https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}` | Для блогу |
| **HLS Playlist** | `https://{pullZone}.b-cdn.net/{videoId}/playlist.m3u8` | Кастомний плеєр |
| **MP4 Download** | `https://{pullZone}.b-cdn.net/{videoId}/play_720p.mp4` | LinkedIn upload |
| **Thumbnail** | `https://{pullZone}.b-cdn.net/{videoId}/thumbnail.jpg` | Preview |

> **Pull Zone:** Отримати з Bunny Dashboard → Video Library → Settings

### LinkedIn Native Video Upload

Bunny.net дозволяє отримати MP4 файл для нативного завантаження в LinkedIn:

```typescript
// 1. Отримати MP4 URL з Bunny
const mp4Url = `https://${BUNNY_PULL_ZONE}.b-cdn.net/${bunnyVideoId}/play_720p.mp4`;

// 2. Скачати відео
const videoBuffer = await fetch(mp4Url).then(r => r.arrayBuffer());

// 3. Завантажити в LinkedIn (див. LinkedIn Integration)
```

**LinkedIn технічні вимоги для native video:**

| Параметр | Вимога |
|----------|--------|
| Формат | MP4 (обов'язково) |
| Кодек | H.264 + AAC audio |
| Розмір файлу | до 5 GB |
| Тривалість | 3 сек – 10 хв |
| Роздільність | 1080p рекомендовано |
| Бітрейт | 8 Mbps оптимально |
| Частота аудіо | 48 kHz |

### Telegram великі файли (MTProto)

Telegram Bot API обмежує завантаження до **20 MB**. Для більших відео потрібен MTProto:

```python
# Pyrogram приклад
from pyrogram import Client

app = Client("my_bot", api_id=API_ID, api_hash=API_HASH, bot_token=BOT_TOKEN)

async with app:
    # Скачати файл до 2GB
    await app.download_media(message, file_name="video.mp4")
```

**Варіанти реалізації:**
1. **Python microservice** з Pyrogram/Telethon для великих файлів
2. **Supabase Edge Function** викликає Python сервіс
3. Результат → upload на Bunny.net

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

### Environment Variables (Bunny.net)

```env
# Bunny.net Stream API
BUNNY_LIBRARY_ID=62a42da3-5234-4b4c-9e61-8fc06571220d
BUNNY_STREAM_API_KEY=081d503b-9eb8-40f2-a629-f7b0b821a1f0
BUNNY_PULL_ZONE=your-pullzone-name

# Azure OpenAI (для перекладу заголовків)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_key
```

### Database Fields (оновлені)

```sql
ALTER TABLE news ADD COLUMN IF NOT EXISTS bunny_video_id TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS bunny_video_id TEXT;
```

| Поле | Тип | Опис |
|------|-----|------|
| `video_type` | text | `bunny`, `bunny_hls`, `telegram_embed`, `direct_url` |
| `video_url` | text | Embed URL або HLS playlist |
| `bunny_video_id` | text | GUID відео в Bunny.net (для MP4 download) |

### Документація Bunny.net

- [Stream API Overview](https://docs.bunny.net/reference/stream-api-overview)
- [Upload Videos HTTP API](https://docs.bunny.net/docs/stream-uploading-videos-through-our-http-api)
- [MP4 URL Retrieval](https://docs.bunny.net/docs/stream-how-to-retrieve-an-mp4-url-from-stream)
- [TUS Resumable Uploads](https://docs.bunny.net/reference/tus-resumable-uploads)

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
- **Bunny.net Stream:** Нативний iframe player (`iframe.mediadelivery.net`)
- **Bunny.net HLS:** Кастомний плеєр з HLS.js
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

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SITE_URL=https://vitalii-berbeha.netlify.app

# LinkedIn Integration
LINKEDIN_ACCESS_TOKEN=your_linkedin_access_token
LINKEDIN_PERSON_URN=urn:li:person:your_person_id

# Bunny.net Stream API
BUNNY_LIBRARY_ID=62a42da3-5234-4b4c-9e61-8fc06571220d
BUNNY_STREAM_API_KEY=081d503b-9eb8-40f2-a629-f7b0b821a1f0
BUNNY_PULL_ZONE=your-pullzone-name

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_key

# Telegram MTProto (для файлів > 20MB)
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
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
