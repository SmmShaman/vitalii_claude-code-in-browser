# Video Processor for GitHub Actions

Downloads videos from Telegram channels and uploads to YouTube.

## Setup GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions**

Add these secrets:

### Telegram MTProto
| Secret | Value |
|--------|-------|
| `TELEGRAM_API_ID` | Your Telegram API ID (from my.telegram.org) |
| `TELEGRAM_API_HASH` | Your Telegram API Hash |
| `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |

### YouTube OAuth
| Secret | Value |
|--------|-------|
| `YOUTUBE_CLIENT_ID` | OAuth Client ID from Google Cloud Console |
| `YOUTUBE_CLIENT_SECRET` | OAuth Client Secret |
| `YOUTUBE_REFRESH_TOKEN` | Refresh token (from OAuth flow) |

### Supabase
| Secret | Value |
|--------|-------|
| `SUPABASE_URL` | `https://uchmopqiylywnemvjttl.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NOT anon key!) |

### GitHub Token (for triggering from Edge Functions)
| Secret | Value |
|--------|-------|
| `GH_PAT` | Personal Access Token with `repo` scope |

## Usage

### Manual Trigger (Actions tab)

1. Go to **Actions → Process Telegram Video**
2. Click **Run workflow**
3. Choose mode:
   - `single` - Process specific news by ID
   - `batch` - Process next N pending videos

### Automatic Batch Processing

Runs every 30 minutes via cron, processes 10 videos per run.

### Trigger from Edge Function

```typescript
await fetch('https://api.github.com/repos/OWNER/REPO/dispatches', {
  method: 'POST',
  headers: {
    'Authorization': `token ${GH_PAT}`,
    'Accept': 'application/vnd.github.v3+json',
  },
  body: JSON.stringify({
    event_type: 'process-video',
    client_payload: {
      news_id: 'uuid-here',
      mode: 'single',
    },
  }),
});
```

## Flow

```
Telegram Bot → User clicks "📰 В новини"
                    ↓
           Edge Function triggers GitHub Action
                    ↓
           GitHub Action downloads video from Telegram
                    ↓
           Uploads to YouTube (unlisted)
                    ↓
           Updates Supabase: video_type = 'youtube'
                    ↓
           Video ready on site!
```
