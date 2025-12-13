# CLAUDE.md

This file provides context for Claude Code when working with this repository.

## Project Overview

A full-stack portfolio and content management platform for Vitalii Berbeha (e-commerce/marketing expert). Combines an interactive portfolio website with a powerful admin dashboard for content aggregation and AI-powered processing.

## Tech Stack

- **Framework**: Next.js 15.1 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion, GSAP, Three.js
- **UI**: Radix UI components, Lucide icons
- **Forms**: React Hook Form + Zod validation
- **State**: TanStack React Query
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions with Deno)
- **Deployment**: Netlify

## Project Structure

```
app/                    # Next.js App Router
├── page.tsx            # Home page (Bento Grid)
├── layout.tsx          # Root layout
├── admin/              # Admin section (login, dashboard)
├── blog/[slug]/        # Dynamic blog pages
└── news/[slug]/        # Dynamic news pages

components/
├── admin/              # Admin dashboard components
├── sections/           # Page sections (BentoGrid, NewsSection, etc.)
├── ui/                 # Reusable UI components
├── layout/             # Header, Footer
└── background/         # Particles background

integrations/supabase/  # Supabase client and types
contexts/               # React contexts (TranslationContext)
hooks/                  # Custom hooks (useScreenSize)
lib/                    # Utilities (cn function)
utils/                  # Translations, constants

supabase/
├── functions/          # Edge Functions (Deno)
│   ├── fetch-news/     # RSS/web feed fetcher
│   ├── telegram-monitor/
│   ├── process-news/   # AI content processing
│   └── process-blog-post/
└── migrations/         # Database migrations
```

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Key Entry Points

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main portfolio page |
| `app/admin/dashboard/page.tsx` | Admin management panel |
| `app/layout.tsx` | Root layout with providers |
| `integrations/supabase/client.ts` | Supabase client setup |

## Configuration Files

- `next.config.ts` - Next.js configuration
- `netlify.toml` - Netlify deployment settings
- `tsconfig.json` - TypeScript config (path alias: `@/*` → root)
- `.env.example` - Environment variables template

## Environment Variables

Required variables (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

## Database Tables (Supabase)

- `contact_forms` - Visitor contact submissions
- `news_sources` - News source configurations
- `news` - Aggregated news articles
- `blog_posts` - Blog content
- `ai_prompts` - AI prompts for content transformation
- `news_queue` - Articles awaiting processing

## Features

- Multi-language support (English/Ukrainian) via `TranslationContext`
- Dynamic neon color theming on section hover
- Particles background animation
- News aggregation from RSS, Telegram, web sources
- AI-powered content rewriting
- SEO optimization (metadata, sitemap, robots.txt)

## Code Conventions

- Use TypeScript strict mode
- Path imports via `@/` alias (e.g., `@/components/ui/Button`)
- Tailwind CSS for styling with `cn()` utility for class merging
- React Server Components by default, `"use client"` directive when needed
