# Social Media Integration

## LinkedIn
- OAuth 2.0 UGC Post API: `POST /v2/ugcPosts`
- Native image upload via Assets API: `POST /v2/assets?action=registerUpload`
- Post types: IMAGE (with uploaded asset) or ARTICLE (link preview fallback)
- Token expires after 60 days -> regenerate
- Person URN format: `urn:li:person:xxxxx`
- Scope: `w_member_social`
- URL format: `https://vitalii.no/news/{slug}` (NO language prefix in URL, language is client-side)
- Native video upload via GitHub Actions (scripts/linkedin-video/)

## Instagram
- Facebook Graph API (Business accounts only)
- Required scopes: instagram_basic, instagram_content_publish, pages_read_engagement, pages_manage_posts
- IMAGE posts (native upload) or REELS (video via GitHub Actions)
- Reels API: Create container (REELS) -> poll status -> publish
- Instagram does NOT support clickable links in captions -> use short text "Читати на vitalii.no"
- Error #10: Missing instagram_content_publish scope
- Error #190: Token expired

## Facebook
- Similar to Instagram (shares codebase via _shared/facebook-helpers.ts)
- Facebook Page API

## AI Social Teasers
- Platform-specific content generation per language
- Cached in DB fields: social_teaser_{platform}_{lang}
- Generated on-demand (first click), cached for subsequent

## Duplicate Prevention
- `social_media_posts` table tracks all posts
- `wasAlreadyPosted()` checks BOTH 'posted' AND 'pending' statuses
- Race condition fix: create 'pending' record BEFORE actual posting

## Video Processing (GitHub Actions)
- MTKruto downloads from Telegram (bypasses 20MB Bot API limit, supports up to 2GB)
- Workflows: process-video.yml (->YouTube), linkedin-video.yml, instagram-video.yml, facebook-video.yml
- YouTube: unlisted upload for site embeds
- Fallback: telegram_embed type when YouTube unavailable
- Supabase Edge Function /tmp limits: Free 256MB, Pro 512MB
