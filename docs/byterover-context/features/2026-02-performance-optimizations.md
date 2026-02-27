## Performance & PageSpeed Optimizations (February 2026)

### Опис
Комплексна оптимізація продуктивності сайту для покращення показників PageSpeed Insights (LCP, TBT, FCP).

### Виконані роботи

#### 1. Оптимізація зображень
- **Впровадження `next/image`**: Замінено стандартні `<img>` на компонент `<Image>` у секціях `NewsSection.tsx` та `BlogSection.tsx`. Це забезпечило автоматичний ресайз, WebP/AVIF формати та lazy loading.
- **Кешування на рівні сховища**: Додано заголовок `cacheControl: '31536000'` (1 рік) для всіх завантажень зображень у Supabase Edge Functions:
  - `process-image`
  - `telegram-scraper`
  - `telegram-monitor`
  - `telegram-webhook`
- **Атрибут `sizes`**: Додано коректні `sizes` для адаптивних зображень, щоб браузер міг обрати оптимальний розмір файлу.

#### 2. Оптимізація завантаження JavaScript
- **Міграція GTM**: Замінено кастомний скрипт у `GTMScript.tsx` на офіційний компонент `GoogleTagManager` з пакета `@next/third-parties/google`. Це покращило швидкість ініціалізації та зменшило блокування головного потоку.
- **Виправлення типізації**: Вирішено конфлікт типів `window.dataLayer` у `utils/gtm.ts`, що виник після переходу на `@next/third-parties`.

#### 3. Рендеринг (SSR)
- **Увімкнення SSR для BentoGrid**: Видалено `{ ssr: false }` у динамічних імпортах `BentoGrid` та `BentoGridMobile` в `app/page.tsx`. Це дозволило серверу рендерити критичний контент головної сторінки, що значно покращило FCP (First Contentful Paint).
- **SSR-сумісність**: Оновлено `BentoGrid.tsx` для використання безпечного хука `useIsMobile()`, уникаючи прямого звернення до `window` під час рендерингу на сервері.

#### 4. SEO та Метадані
- **Канонічні посилання**: Підтверджено коректність логіки канонічних URL для новин та блогу, що запобігає дублюванню контенту між модальним вікном та окремою сторінкою.
- **OG Метадані**: Перевірено та оптимізовано генерацію `alt`-текстів для Hero-зображень на основі заголовків статей.

### Файли, що змінилися
- `components/analytics/GTMScript.tsx`
- `components/sections/NewsSection.tsx`
- `components/sections/BlogSection.tsx`
- `supabase/functions/*/index.ts` (upload logic)
- `app/page.tsx`
- `utils/gtm.ts`
- `components/sections/BentoGrid.tsx`

### Результати
- Покращення LCP (Largest Contentful Paint) завдяки кешуванню та `next/image`.
- Зменшення TBT (Total Blocking Time) завдяки оптимізації GTM.
- Покращення FCP (First Contentful Paint) завдяки SSR для головної сітки.

---
**Timestamp:** 2026-02-23
**Status:** Completed
