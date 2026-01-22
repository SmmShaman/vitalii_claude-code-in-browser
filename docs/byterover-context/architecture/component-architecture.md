## Component Architecture

### BentoGrid Layout

Головна сторінка побудована на **6 інтерактивних секцій** у grid-layout:

```
┌─────────────┬─────────────┬─────────────┐
│   About     │  Services   │  Projects   │
│  (Profile)  │   (Cards)   │ (Carousel)  │
├─────────────┼─────────────┼─────────────┤
│   Skills    │    News     │    Blog     │
│ (Explosion) │   (List)    │   (List)    │
└─────────────┴─────────────┴─────────────┘
```

**Взаємодія:**
- Hover на секцію → фон сторінки змінює колір
- Hover на секцію → Hero текст заповнюється контрастним кольором
- 3 секунди hover на Projects → "explosion" у сітку проектів
- Hover на Skills → particle explosion effect
- Click на News/Blog → modal з деталями

### Key UI Components

| Компонент | Файл | Опис |
|-----------|------|------|
| `BentoGrid` | `components/sections/BentoGrid.tsx` | Головний grid з 6 секцій (desktop) |
| `BentoGridMobile` | `components/sections/BentoGridMobile.tsx` | Accordion layout (mobile) |
| `HeroTextAnimation` | `components/ui/HeroTextAnimation.tsx` | Liquid fill ефект для тексту |
| `ProjectsCarousel` | `components/ui/ProjectsCarousel.tsx` | GSAP карусель + explosion grid |
| `ServicesAnimation` | `components/ui/ServicesAnimation.tsx` | GSAP анімація сервісів |
| `SkillsAnimation` | `components/ui/SkillsAnimation.tsx` | Particle explosion на hover |
| `AboutAnimation` | `components/ui/AboutAnimation.tsx` | Text morph анімація |
| `Modal` | `components/ui/Modal.tsx` | Reusable modal з safe-area |
| `Toast` | `components/ui/Toast.tsx` | Toast notifications + Context |
| `ShareButtons` | `components/ui/ShareButtons.tsx` | Social sharing (LinkedIn, X) |
| `Skeleton` | `components/ui/Skeleton.tsx` | Loading skeleton components |
| `ScrollReveal` | `components/ui/ScrollReveal.tsx` | Scroll-triggered animations |
| `NewsSection` | `components/sections/NewsSection.tsx` | News list + detail view |
| `BlogSection` | `components/sections/BlogSection.tsx` | Blog list + detail view |
| `ArticleLayout` | `components/ArticleLayout.tsx` | Standalone article wrapper |

### Modal System (Parallel Routes)

Next.js App Router parallel routes для модалів:

```
app/
├── @modal/                    # Modal slot
│   ├── (.)blog/[slug]/        # Intercepted blog route
│   │   └── page.tsx           # Shows BlogModal
│   └── (.)news/[slug]/        # Intercepted news route
│       └── page.tsx           # Shows NewsModal
├── blog/[slug]/page.tsx       # Full blog page (direct navigation)
└── news/[slug]/page.tsx       # Full news page (direct navigation)
```

**Як працює:**
1. Click на картку → URL змінюється на `/blog/[slug]`
2. Parallel route `@modal/(.)blog/[slug]` перехоплює
3. Показується modal overlay
4. Прямий перехід на `/blog/[slug]` → повна сторінка

---
