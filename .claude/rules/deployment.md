# Deployment & CI/CD

## GitHub Actions Workflows (11 total)
| Workflow | Trigger | Purpose |
|----------|---------|---------|
| deploy.yml | Push to main | Netlify deployment |
| deploy-supabase.yml | Changes in supabase/** | Edge Functions + migrations |
| realtime-scraper.yml | Every 10 min | Telegram scraping (round-robin 6 channels) |
| rss-monitor.yml | Scheduled | RSS feed monitoring |
| process-video.yml | Every 30 min | Batch video upload to YouTube |
| linkedin-video.yml | Repository dispatch | LinkedIn native video |
| instagram-video.yml | Repository dispatch | Instagram Reels |
| facebook-video.yml | Repository dispatch | Facebook video |
| reprocess-videos.yml | Manual | Batch video cleanup |
| monitor-communities.yml | Scheduled | Community posts |
| sync-social-comments.yml | Scheduled | Sync social comments |

## Netlify
- Auto-builds DISABLED (stop_builds: true) - deployment only via GitHub Actions
- This prevents env var issues with Netlify auto-build

## Supabase Deployment
```bash
# ALWAYS run from PROJECT ROOT, not from supabase/ subdirectory
supabase link --project-ref YOUR_PROJECT_REF
supabase db push                    # Apply migrations
supabase functions deploy <name> --no-verify-jwt
supabase secrets set KEY="value"
supabase functions logs <name>      # View logs
```

## Migration Tips
- Files in supabase/migrations/*.sql (14-digit timestamp: YYYYMMDDHHmmss)
- If "No change found" on deploy: change actual code (not just comments) to change checksum
- Use Management API fallback for direct SQL: POST /v1/projects/{ref}/database/query

## Deployment Verification
- Add version logging: `console.log('Function vYYYY-MM-DD-XX started')`
- Check Supabase Function Logs for version string
- GitHub Actions logs: look for "Deploying Function" vs "No change found"

## Environment Variables
- Token locations: ~/.config/supabase/access-token or ~/.supabase/access-token
- Supabase project ref: uchmopqiylywnemvjttl

## Troubleshooting
- Edge Function not updating: check GitHub Actions logs, verify checksum changed, manual deploy
- LinkedIn token: expires 60 days, check person URN format
- Instagram Error #10: missing instagram_content_publish scope
- Video processing: check MTKruto credentials, YouTube OAuth refresh token
- Telegram bot: verify webhook URL in BotFather, check Edge Function logs
