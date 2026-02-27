# Frontend UI Architecture

## BentoGrid Layout (Desktop)
6 interactive sections: About, Services, Projects, Skills, News, Blog
- Hover -> background color change (40% opacity overlay, 700ms transition)
- Hover -> Hero text fill animation (HeroTextAnimation with liquid wave effect)
- 3s hover on Projects -> explosion grid of project cards
- Hover on Skills -> particle explosion

## Section Colors
| Section | Color | Contrast Hero |
|---------|-------|---------------|
| About | #AF601A | #009B77 |
| Services | #EC008C | #00FF80 |
| Projects | #009B77 | #FF4040 |
| Skills | #fde5e5 | #0F4C81 |
| News | #88B04B | #734BB0 |
| Blog | #0F4C81 | #AF601A |

## Mobile Layout (BentoGridMobile)
- Bottom navigation app-style (6 tabs)
- Typewriter effect (About), rotation animation (Services), swipe carousel (Projects)
- Tags/logos toggle (Skills), horizontal scroll cards (News/Blog)
- Safe area insets for notched devices (env(safe-area-inset-*))
- Glassmorphism bottom nav

## Modal System (Next.js Parallel Routes)
- `app/@modal/(.)blog/[slug]/` and `app/@modal/(.)news/[slug]/` intercept routes
- Homepage click -> modal overlay; direct URL -> full page

## Animation Libraries
- GSAP: ProjectsCarousel, ServicesAnimation, SkillsAnimation
- Framer Motion: page transitions, modals, drag & drop, hover states
- Three.js: ParticleBackground

## Key Components
- ArticleLayout: white bg wrapper for standalone article pages
- ShareButtons: LinkedIn, X (Twitter), copy link
- Toast: global notification system (success/error/warning/info)
- ScrollReveal: Intersection Observer animations
- Skeleton: loading states with pulse animation

## Font: Comfortaa (Google Fonts) - rounded geometric, good Cyrillic support

## SEO
- JSON-LD schemas: BlogPosting, NewsArticle, BreadcrumbList, Person, WebSite
- OG metadata, Twitter Cards, hreflang (en, no, uk), canonical URLs
- Multilingual sitemap with alternates
- utils/seo.ts for all SEO helpers

## Analytics (GTM-5XBL8L8S)
- @next/third-parties/google GoogleTagManager component
- TrackingContext: auto page_view, trackArticleView, trackShare, trackLanguageChange, trackSectionClick
- Integrations: GA4, Meta Pixel, LinkedIn Insight Tag
- dataLayer typed as `(window as any).dataLayer` to avoid Next.js type conflicts

## Translations
- TranslationContext with `t(key)` function, 3000+ keys in utils/translations.ts
- DB content: separate fields per language (title_en, title_no, title_ua)

## Mobile Detection
- useIsMobile() (<768px), useIsTablet() (768-1024px)
- SSR-safe: initial false, updates on mount
- useReducedMotion() for prefers-reduced-motion

## Debug Mode
- localStorage 'vitalii_debug_mode', toggle in Admin -> Settings -> Debug
- debugLog/debugWarn/debugError in utils/debug.ts
