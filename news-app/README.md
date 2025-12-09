# News App - Next.js with Supabase SSR

This is a standalone Next.js application for displaying news articles with full SEO support.

## Features

- ✅ **Server-Side Rendering (SSR)** - Every page is pre-rendered on the server
- ✅ **ISR (Incremental Static Regeneration)** - Pages auto-update every 60 seconds
- ✅ **Multilingual Support** - English, Ukrainian, Norwegian
- ✅ **Full SEO** - Meta tags, Open Graph, Schema.org, sitemap
- ✅ **Dynamic Sitemap** - Auto-generates from Supabase data
- ✅ **Responsive Design** - Works on all devices

## Structure

```
news-app/
├── app/
│   ├── page.tsx                    # /news - Main news listing
│   ├── [locale]/
│   │   ├── page.tsx               # /news/en - Localized listing
│   │   └── [slug]/
│   │       └── page.tsx           # /news/en/slug - Article page
│   ├── sitemap.ts                 # Dynamic sitemap
│   ├── robots.ts                  # Robots.txt
│   └── layout.tsx                 # Root layout
├── lib/
│   └── supabase.ts                # Supabase client & helpers
└── .env.local                     # Environment variables
```

## Routes

- `/news` - All news (English by default)
- `/news/en` - English news
- `/news/ua` - Ukrainian news (Українські новини)
- `/news/no` - Norwegian news (Norske nyheter)
- `/news/en/[slug]` - Individual article in English
- `/news/ua/[slug]` - Individual article in Ukrainian
- `/news/no/[slug]` - Individual article in Norwegian
- `/news/sitemap.xml` - Dynamic sitemap (auto-generated)
- `/news/robots.txt` - Robots file

## Development

```bash
npm run dev
```

Open http://localhost:3001

## Build

```bash
npm run build
npm start
```

## Deployment

### Option 1: Vercel (Recommended)

1. Push to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### Option 2: Netlify

Create `netlify.toml`:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/news/*"
  to = "/.netlify/functions/nextjs/:splat"
  status = 200
```

## SEO Features

### Meta Tags
- Title, description for each article
- Canonical URLs
- Hreflang tags for multilingual SEO

### Open Graph
- Title, description, images
- Locale-specific tags
- Article metadata

### Schema.org
- NewsArticle structured data
- Publisher information
- Dates (published, modified)

### Sitemap
- Auto-updates from Supabase
- Includes all published articles
- Multilingual alternates

## Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## How It Works with Main Site

This app is designed to work alongside your existing React SPA:

```
vitalii-berbeha.com/          → Vite React SPA (main site)
vitalii-berbeha.com/news/*    → Next.js (this app)
```

Configure routing in your hosting platform (Vercel/Netlify).

## Database Schema

Expected Supabase table structure:

```sql
CREATE TABLE news (
  id UUID PRIMARY KEY,
  original_title TEXT,
  original_content TEXT,
  image_url TEXT,

  -- English
  title_en TEXT,
  content_en TEXT,
  description_en TEXT,
  slug_en TEXT,

  -- Ukrainian
  title_ua TEXT,
  content_ua TEXT,
  description_ua TEXT,
  slug_ua TEXT,

  -- Norwegian
  title_no TEXT,
  content_no TEXT,
  description_no TEXT,
  slug_no TEXT,

  -- Meta
  is_published BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  views_count INTEGER DEFAULT 0,
  video_url TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Auto-Revalidation

Pages automatically revalidate every 60 seconds (ISR). New articles appear without rebuild!

To force immediate revalidation, use On-Demand Revalidation:

```typescript
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const { slug, locale } = await request.json()
  revalidatePath(`/${locale}/${slug}`)
  return Response.json({ revalidated: true })
}
```

Then trigger from Supabase webhook when news is published.

## Performance

- **First Load**: Server-rendered HTML (instant SEO)
- **Navigation**: Client-side transitions (instant)
- **Updates**: ISR (auto-refresh every 60s)
- **Images**: Next.js Image optimization

## License

Private - Vitalii Berbeha Portfolio
