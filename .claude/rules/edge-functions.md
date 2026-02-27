# Edge Functions (Deno-based, 29 functions)

## Content Pipeline
| Function | Purpose | Trigger |
|----------|---------|---------|
| telegram-scraper | Telegram/RSS scraping (MTKruto) | Scheduled (10 min) |
| fetch-news | RSS feed fetching | Admin/Scheduled |
| fetch-rss-preview | RSS preview for monitoring | Admin panel |
| analyze-rss-article | AI relevance scoring (1-10) | After RSS fetch |
| process-rss-news | RSS -> News with AI rewrite | Admin/Telegram bot |
| pre-moderate-news | AI spam filtering (Azure OpenAI) | After scraper |
| process-news | AI translation EN/NO/UA | Telegram bot |
| process-blog-post | News -> Blog conversion | Telegram bot |

## Image Generation
| Function | Purpose |
|----------|---------|
| generate-image-prompt | AI image description (modes: variants, full, custom, extract_objects) |
| process-image | Image generation via Gemini/cascading providers |

## Social Media
| Function | Purpose |
|----------|---------|
| post-to-linkedin | LinkedIn publishing (native image upload via Assets API) |
| post-to-instagram | Instagram publishing (Facebook Graph API) |
| post-to-facebook | Facebook publishing |
| generate-social-teasers | Platform-specific AI content |

## Telegram Bot
| Function | Purpose |
|----------|---------|
| telegram-webhook | Bot callback handling (all inline buttons) |
| telegram-monitor | Bot health checks |
| resend-to-bot | Retry failed posts |
| resend-stuck-posts | Resend stuck approved posts |

## Comments & Communities
- comments-bot-webhook, sync-comments, generate-comment-reply, post-comment-reply, monitor-communities

## Utilities
- send-contact-email (Resend API), manage-sources, find-source-link, reprocess-videos, test-youtube-auth, auto-publish-news

## Shared Helpers (`_shared/`)
- youtube-helpers.ts: getAccessToken(), uploadVideoToYouTube()
- github-actions.ts: triggerVideoProcessing(), triggerLinkedInVideo()
- facebook-helpers.ts: Instagram/Facebook API, formatInstagramCaption()
- social-media-helpers.ts: wasAlreadyPosted() checks both 'posted' AND 'pending'

## Key Patterns
- Azure OpenAI deployment: `Jobbot-gpt-4.1-mini`
- AI prompts loaded from `ai_prompts` table with `prompt_type` key
- escapeHtml() exists in: telegram-webhook, telegram-scraper, analyze-rss-article, send-rss-to-telegram
- Version logging for deployment verification: `console.log('Function vYYYY-MM-DD-XX started')`

## Deploy
```bash
cd supabase
supabase functions deploy <function-name> --no-verify-jwt
# Deploy all:
for dir in functions/*/; do
  [ -d "$dir" ] && [ "$(basename $dir)" != "_shared" ] && supabase functions deploy $(basename $dir) --no-verify-jwt
done
```
