# News & Blog App - Deployment Guide

## Overview

This Next.js application provides SEO-optimized news and blog content with:
- **Server-Side Rendering (SSR)** for all content
- **Incremental Static Regeneration (ISR)** with 60-second revalidation
- **Multilingual support** (English, Ukrainian, Norwegian)
- **Dynamic sitemap** generation
- **Full SEO optimization** with meta tags, Schema.org, Open Graph

## Content Sources

The app fetches content from two Supabase tables:
- **`news`** table: 114 total items, 38 published (from Telegram automation)
- **`blog_posts`** table: 8 items

## Routes Structure

### News Routes
- `/` - Home page showing latest news and blog posts
- `/en` - English news list
- `/ua` - Ukrainian news list
- `/no` - Norwegian news list
- `/en/{slug}` - Individual news article in English
- `/ua/{slug}` - Individual news article in Ukrainian
- `/no/{slug}` - Individual news article in Norwegian

### Blog Routes
- `/blog/en` - English blog list
- `/blog/ua` - Ukrainian blog list
- `/blog/no` - Norwegian blog list
- `/blog/en/{slug}` - Individual blog post in English
- `/blog/ua/{slug}` - Individual blog post in Ukrainian
- `/blog/no/{slug}` - Individual blog post in Norwegian

### SEO Routes
- `/sitemap.xml` - Dynamically generated sitemap with all news and blog posts
- `/robots.txt` - Search engine directives

## Netlify Deployment (Option 1: Subdomain - RECOMMENDED)

### 1. Create New Netlify Site

1. Go to Netlify dashboard
2. Click "Add new site" → "Import an existing project"
3. Connect to your GitHub repository
4. Configure build settings:

```
Base directory: news-app
Build command: npm run build
Publish directory: .next
```

### 2. Environment Variables

Add these in Netlify dashboard → Site settings → Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://uchmopqiylywnemvjttl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjaG1vcHFpeWx5d25lbXZqdHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0OTg5MjMsImV4cCI6MjA3NzA3NDkyM30._0tAkFpia8ZrmGZcKYKywIrQNkQ0NDm15VVHvpuIemU
```

### 3. Configure Subdomain

1. Go to Site settings → Domain management
2. Add custom domain: `news.vitalii.no` or `content.vitalii.no`
3. Netlify will auto-configure DNS if using Netlify DNS
4. If using external DNS, add CNAME record pointing to your Netlify site

### 4. Update Base URL

After deployment, update the base URL in the code:
- `news-app/app/sitemap.ts` - Change `baseUrl` to your subdomain
- `news-app/app/[locale]/[slug]/page.tsx` - Update `baseUrl` in metadata
- `news-app/app/blog/[locale]/[slug]/page.tsx` - Update `baseUrl` in metadata

## Netlify Deployment (Option 2: Monorepo)

If you want both sites in one repository:

### 1. Netlify Configuration for Main Site

Create `/netlify.toml` (if not exists):

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2. Create Second Netlify Site for News/Blog

1. Same repository, different site
2. Base directory: `news-app`
3. Build command: `npm run build`
4. Publish directory: `.next`

## ISR Configuration

The app uses Incremental Static Regeneration:

```typescript
export const revalidate = 60 // Revalidate every 60 seconds
```

This means:
- Pages are generated at build time
- After 60 seconds, the next request triggers a background regeneration
- New content from Supabase appears automatically without rebuilding
- Google can index new articles without manual deploys

## SEO Features

### 1. Meta Tags
- Title, description, keywords
- Open Graph (Facebook, LinkedIn)
- Twitter Cards
- Multilingual alternate links

### 2. Schema.org Structured Data
- NewsArticle for news items
- BlogPosting for blog posts
- Person schema for author

### 3. Sitemap
- Auto-generated from Supabase
- Includes all published content
- Multilingual support
- Updated every 60 seconds

### 4. Robots.txt
- Allows all crawlers
- References sitemap
- No restrictions

## Testing the Deployment

### 1. Build Test (Local)
```bash
cd news-app
npm run build
npm start
```

Visit: http://localhost:3000

### 2. SEO Validation

After deployment:
- Google Search Console: Submit sitemap
- Bing Webmaster Tools: Submit sitemap
- Test with: https://search.google.com/test/rich-results
- Validate Schema.org: https://validator.schema.org/

### 3. ISR Validation

1. Visit a news article
2. Update content in Supabase
3. Wait 60 seconds
4. Refresh the page → content should update

## Monitoring

### Check Build Logs
1. Netlify dashboard → Deploys
2. Look for successful build completion
3. Fetch errors during build are EXPECTED (Supabase not accessible during build)

### Verify ISR
- Check Netlify Functions logs for revalidation events
- Monitor response times (should be fast after first load)

## Troubleshooting

### Build Errors
- **"fetch failed"**: Expected during build - will work in production
- **ESLint errors**: Check `.eslintrc.json` configuration
- **Missing env vars**: Verify `NEXT_PUBLIC_SUPABASE_*` are set

### ISR Not Working
- Verify `export const revalidate = 60` in page files
- Check Netlify supports Next.js 15.5
- Ensure Netlify is NOT using static export

### Sitemap Not Updating
- Check Supabase credentials
- Verify network access from Netlify
- Test sitemap URL: `https://your-site.com/sitemap.xml`

## Architecture Summary

```
Main Site (vitalii.no)
├── Vite + React SPA
├── Three.js particles
├── Anime.js animations
└── Client-side rendering

News/Blog Site (news.vitalii.no)
├── Next.js 15.5
├── Server-Side Rendering
├── ISR (60s revalidation)
├── Supabase integration
├── Dynamic sitemap
└── Full SEO optimization
```

## Performance

Expected metrics:
- **First Load**: ~111 kB JS
- **Page Size**: ~184 B (HTML)
- **Lighthouse SEO**: 95-100
- **Time to Interactive**: < 2s

## Future Improvements

1. Add image optimization with Next.js Image
2. Implement on-demand revalidation via Supabase webhook
3. Add RSS feed for news and blog
4. Set up Google Analytics
5. Configure CDN caching headers
