# CLAUDE.md - AI Assistant Guide

This document provides comprehensive guidance for AI assistants working with this codebase.

## Project Overview

**Vitalii Berbeha Portfolio Website** - A modern, animated single-page application (SPA) portfolio showcasing an AI project leader and entrepreneur. Features an interactive Bento Grid layout with 6 sections, multilingual support (EN/NO/UA), and 3D particle animations.

**Live URL**: Deployed on Netlify

## Tech Stack

### Core
- **React 19.1.1** - UI framework (functional components with hooks)
- **TypeScript 5.9.3** - Strict mode enabled
- **Vite 7.1.7** - Build tool and dev server

### Styling
- **Tailwind CSS 3.4.18** - Utility-first CSS
- **tailwindcss-animate** - Animation utilities
- **tailwind-merge** - Class merging utility

### Animation
- **Framer Motion 12.23** - UI transitions and motion
- **Anime.js 4.2.2** - Character-level text animations
- **Three.js 0.180** - 3D particle background effects

### Forms & Validation
- **React Hook Form 7.65** - Form state management
- **Zod 4.1.12** - Schema validation

### Backend
- **Supabase** - PostgreSQL database for contact form submissions

### UI Components
- **Radix UI** - Accessible primitives (Dialog, ScrollArea, Tooltip)
- **Lucide React** - Icon library

## Project Structure

```
src/
├── components/
│   ├── background/
│   │   └── ParticlesBackground.tsx   # Three.js 3D particle system
│   ├── layout/
│   │   ├── Header.tsx                # Language switcher
│   │   └── Footer.tsx                # Footer content
│   ├── sections/
│   │   ├── BentoGrid.tsx             # Main 6-card grid layout
│   │   ├── SectionDialog.tsx         # Modal dialogs for sections
│   │   └── ContactForm.tsx           # Supabase-integrated form
│   └── ui/
│       ├── AnimatedDescription.tsx
│       ├── AnimatedHeaderTitle.tsx
│       ├── AnimatedName.tsx
│       ├── AnimatedTitle.tsx         # Anime.js animations
│       ├── ProjectsCarousel.tsx
│       ├── ProjectsModal.tsx
│       ├── ServicesAnimation.tsx
│       ├── SkillsAnimation.tsx
│       └── TypewriterText.tsx        # Typing effect
├── contexts/
│   └── TranslationContext.tsx        # i18n React Context
├── hooks/
│   └── useScreenSize.ts              # Responsive breakpoint hook
├── integrations/
│   └── supabase/
│       ├── client.ts                 # Supabase client setup
│       └── types.ts                  # Database types
├── lib/
│   └── utils.ts                      # cn() utility for Tailwind
├── utils/
│   └── translations.ts               # All translation strings
├── pages/
│   └── Index.tsx                     # Main page component
├── App.tsx                           # Router & providers
├── main.tsx                          # React entry point
└── index.css                         # Tailwind base + custom styles
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (HMR enabled)
npm run dev

# Type check and build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint
```

## Key Patterns & Conventions

### Component Patterns
- **Functional components only** - No class components
- **Custom hooks** for reusable logic (`useScreenSize`, `useTranslations`)
- **Context API** for global state (translations, language)
- **Radix UI** for accessible dialog/modal primitives

### Naming Conventions
- Components: `PascalCase.tsx` (e.g., `BentoGrid.tsx`)
- Hooks: `useCamelCase.ts` (e.g., `useScreenSize.ts`)
- Utilities: `camelCase.ts` (e.g., `translations.ts`)
- Types/Interfaces: `PascalCase` (e.g., `TranslationContextType`)

### TypeScript Conventions
- **Strict mode** is enforced - no implicit `any`
- **No unused variables/parameters** - will cause build errors
- Prefer `interface` for object shapes, `type` for unions/primitives
- Export types alongside implementations

### Styling Conventions
- Use **Tailwind utility classes** as primary styling method
- Use `cn()` helper (from `lib/utils.ts`) for conditional classes
- Responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Custom animations defined in `tailwind.config.js` and `index.css`
- Color scheme: Yellow-Orange gradients, Blue-500 accents, White text

### Animation Patterns
- **Framer Motion**: UI transitions, hover states, layout animations
- **Anime.js**: Character-by-character text reveals
- **Three.js**: Background particle system only
- **CSS keyframes**: Simple repeating animations

### Internationalization (i18n)
- 3 languages: English (EN), Norwegian (NO), Ukrainian (UA)
- All strings in `src/utils/translations.ts`
- Access via `useTranslations()` hook
- Never hardcode user-facing text

## Important Files

| File | Purpose |
|------|---------|
| `src/utils/translations.ts` | All translatable content |
| `src/contexts/TranslationContext.tsx` | Language state management |
| `src/components/sections/BentoGrid.tsx` | Main content grid |
| `src/components/background/ParticlesBackground.tsx` | 3D effects |
| `tailwind.config.js` | Theme customization |
| `netlify.toml` | Deployment configuration |
| `.env.example` | Environment variable template |

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Contact form works in demo mode without Supabase credentials (logs to console).

## Build & Deployment

### Netlify (Primary)
- Auto-deploys from GitHub on push
- Build command: `npm run build`
- Publish directory: `dist`
- Node.js 18 required
- SPA routing configured (all routes -> index.html)
- Security headers enabled
- Asset caching (1 year for versioned assets)

### Manual Build
```bash
npm run build    # Output to dist/
npm run preview  # Test production build locally
```

## Common Tasks

### Adding a New Section
1. Create component in `src/components/sections/`
2. Add translation keys to `src/utils/translations.ts` for all 3 languages
3. Import and add to `BentoGrid.tsx` grid layout
4. Create corresponding dialog content in `SectionDialog.tsx`

### Adding Translations
1. Open `src/utils/translations.ts`
2. Add key to all three language objects (en, no, ua)
3. Use via `const { t } = useTranslations(); t('your_key')`

### Modifying Animations
- **UI transitions**: Edit Framer Motion props in components
- **Text animations**: Modify Anime.js config in AnimatedTitle.tsx
- **Background**: Adjust Three.js params in ParticlesBackground.tsx
- **CSS animations**: Edit keyframes in `index.css` or `tailwind.config.js`

### Updating Contact Form
- Schema: Edit Zod schema in `ContactForm.tsx`
- Supabase table: Modify in Supabase dashboard
- Types: Update `src/integrations/supabase/types.ts`

## Code Quality Rules

### Do
- Run `npm run lint` before committing
- Use TypeScript strict types
- Follow existing component patterns
- Keep components focused and small
- Use Tailwind for all styling
- Maintain translations for all 3 languages

### Don't
- Use `any` type (will cause lint errors)
- Leave unused imports/variables
- Hardcode user-facing strings
- Create new CSS files (use Tailwind)
- Skip type annotations on function params
- Add dependencies without justification

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | < 640px | Mobile (1 column grid) |
| `sm:` | >= 640px | Small tablets |
| `md:` | >= 768px | Tablets (2 column grid) |
| `lg:` | >= 1024px | Desktop (3 column grid) |
| `xl:` | >= 1280px | Large desktop |
| `2xl:` | >= 1536px | Extra large |

## Performance Considerations

- Three.js configured with `powerPreference: 'low-power'`
- Particle count limited to 1000 for performance
- Device pixel ratio capped at 2
- Static assets have 1-year cache headers
- CSS/JS bundled and minified in production

## SEO

Comprehensive SEO is implemented:
- Meta tags in `index.html`
- Schema.org structured data (Person + WebSite)
- Open Graph and Twitter Cards
- hreflang tags for multilingual content
- Noscript fallback content
- See `SEO-GUIDE.md` for full details

## Testing

No formal test framework is currently configured. Code quality is maintained via:
- TypeScript strict mode
- ESLint rules
- Manual testing

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npx tsc --noEmit`
- Run lint: `npm run lint`
- Verify Node.js version >= 18

### Supabase Issues
- Verify `.env` variables are set
- Check Supabase dashboard for table schema
- Contact form works in demo mode without credentials

### Animation Performance
- Reduce particle count in `ParticlesBackground.tsx`
- Check browser GPU acceleration settings
- Test on `powerPreference: 'low-power'` mode
