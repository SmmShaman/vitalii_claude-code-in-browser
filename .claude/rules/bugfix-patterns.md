# Common Bug Patterns & Solutions

## AI Prompt Selection (Dec 2024)
**Problem:** Multiple prompts with same prompt_type -> random one selected
**Fix:** Always use `.order('updated_at', { ascending: false }).limit(1)` when querying ai_prompts

## Azure OpenAI Deployment (Dec 2024)
**Problem:** Pre-moderation used wrong deployment name 'gpt-4' -> DeploymentNotFound
**Fix:** Use `Jobbot-gpt-4.1-mini` deployment (same as all other functions)

## LinkedIn URL Format (Dec 2024)
**Problem:** URLs had language prefix /no/news/slug -> 404
**Fix:** Remove language prefix. URL is always `https://vitalii.no/news/{slug}` (language is client-side)

## Social Media Duplicates (Jan 2025)
**Problem:** Race condition - wasAlreadyPosted() only checked 'posted', not 'pending'
**Fix:** Check BOTH statuses: `.in('status', ['posted', 'pending'])`

## Instagram Links (Jan 2025)
**Problem:** Instagram doesn't support clickable links in captions
**Fix:** Use short text "Читати на vitalii.no" instead of full URL

## Blog Post Video Data (Dec 2024)
**Problem:** video_url and video_type not saved when converting news to blog
**Fix:** Include video_url and video_type in INSERT query

## Supabase Integration Graceful Degradation (Dec 2025)
**Fix:** isSupabaseConfigured() check - return empty arrays when credentials missing

## Telegram Scraper - Posts Not Processing
**Symptom:** Posts found but not processed (date filter issue)
**Debug:** Check logs for date range, filter bounds, missing datetime attributes
**Fix:** Added detailed logging for each filtering stage

## Edge Function Not Updating After Deploy
**Symptom:** GitHub Actions shows success but old code runs
**Cause:** Supabase CLI uses checksums - comment-only changes may not trigger redeploy
**Fix:** Change actual code (add version log), or manual deploy

## 100vh Issue on Mobile Safari
**Fix:** Use `100dvh` (dynamic viewport height) with `100vh` fallback
