# GitHub Actions Secrets Setup

To enable automatic deployment, you need to add the following secrets to your GitHub repository.

Go to **Repository Settings → Secrets and variables → Actions → New repository secret**

---

## Supabase Secrets (for Edge Functions deployment)

### 1. SUPABASE_ACCESS_TOKEN

Your Supabase access token for CLI authentication.

**How to get it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon → **Access Tokens**
3. Generate a new token
4. Copy and save as `SUPABASE_ACCESS_TOKEN`

### 2. SUPABASE_PROJECT_REF

Your Supabase project reference ID.

**How to get it:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → General**
4. Copy the **Reference ID** (looks like: `abcdefghijklmnop`)
5. Save as `SUPABASE_PROJECT_REF`

---

## Netlify Secrets (for website deployment)

### 3. NETLIFY_AUTH_TOKEN

Your Netlify personal access token.

**How to get it:**
1. Go to [Netlify User Settings](https://app.netlify.com/user/applications)
2. Click **New access token**
3. Give it a name and create
4. Copy and save as `NETLIFY_AUTH_TOKEN`

### 4. NETLIFY_SITE_ID

Your Netlify site ID.

**How to get it:**
1. Go to your site in Netlify Dashboard
2. Go to **Site configuration → General**
3. Copy the **Site ID**
4. Save as `NETLIFY_SITE_ID`

### 5. NEXT_PUBLIC_SUPABASE_URL

Your Supabase project URL (same as in Netlify env vars).

### 6. NEXT_PUBLIC_SUPABASE_ANON_KEY

Your Supabase anonymous key (same as in Netlify env vars).

---

## Workflows

### Deploy to Netlify (`deploy.yml`)
- **Triggers:** Push to `main`, Pull Requests, Manual
- **Actions:** Build Next.js app and deploy to Netlify

### Deploy Supabase Edge Functions (`deploy-supabase.yml`)
- **Triggers:** Push to `main` (when `supabase/functions/**` changes), Manual
- **Actions:** Deploy Edge Functions using Supabase CLI

---

## Edge Functions in this project

| Function | Description |
|----------|-------------|
| `fetch-news` | Fetches news from external sources |
| `pre-moderate-news` | AI pre-moderation of news content |
| `process-blog-post` | Processes and publishes blog posts |
| `process-news` | Processes and publishes news |
| `telegram-monitor` | Monitors Telegram channels |
| `telegram-scraper` | Scrapes content from Telegram |
| `telegram-webhook` | Handles Telegram bot webhooks |
| `test-youtube-auth` | Tests YouTube API authentication |

---

## Quick Setup Checklist

- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `SUPABASE_PROJECT_REF`
- [ ] `NETLIFY_AUTH_TOKEN`
- [ ] `NETLIFY_SITE_ID`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
