# Admin Panel

## Access
- `/admin/login` -> `/admin/dashboard`
- Email + password auth via `users` table

## Dashboard Tabs (9 tabs with collapsible sidebar)
| Tab | Component | Description |
|-----|-----------|-------------|
| Overview | DashboardOverview | Telegram channels + RSS sources monitoring |
| Queue | NewsQueueManager | Pending news moderation queue |
| News | NewsManager | News CRUD |
| Blog | BlogManager | Blog posts management |
| Monitor | NewsMonitorManager | Real-time RSS feed monitoring (4 tiers) |
| Social | SocialMediaPostsManager | Social media posts tracking |
| Comments | SocialMediaCommentsManager | Social media comments |
| Skills | SkillsManager | Tech skills CRUD (drag & drop, localStorage) |
| Settings | 8 sub-tabs | Sources, AI Prompts, Images, API Keys, Accounts, Schedule, Automation, Debug |

## Key Settings Components
- **ImageProcessingSettings** (`components/admin/ImageProcessingSettings.tsx`): Image generation mode toggle (gemini_only/cascading), seasonal themes, provider API keys with Test buttons, custom prompts
- **APIKeysSettings** (`components/admin/APIKeysSettings.tsx`): GOOGLE_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN with test/save/copy
- **CronScheduleSettings**: ENABLE_PRE_MODERATION, ENABLE_AUTO_PUBLISH toggles
- **DebugSettings**: Toggle console logging (localStorage `vitalii_debug_mode`)

## Header Stats
Inline: `Total/Published | Total/Published`

## Image Generation Modes
- **Gemini Only**: gemini-2.5-flash-image, AI text on images, Critic Agent
- **Cascading**: Cloudflare FLUX -> Together AI -> Pollinations -> HuggingFace -> Gemini fallback, text via overlay

## Cascading Provider API Keys (TestButton pattern)
- Cloudflare: needs BOTH Account ID + AI Token, test via GET /accounts/{id}/ai/models/search
- Together AI: test via GET /v1/models
- HuggingFace: test via GET /api/whoami-v2
- Pollinations: no key needed
