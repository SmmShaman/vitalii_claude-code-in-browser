# 48 Mini-Cases — Vitalii Berbeha Portfolio

> Production: https://vitalii.no
> Stack: Next.js 15, Supabase, Deno Edge Functions, GSAP, Three.js, Remotion
> Each case is a real feature running in production

---

## CATEGORY 1: AI & Content Automation

### Case #1: AI Pre-Moderation — killing spam before it reaches my eyes

**Problem:** 6 Telegram channels + RSS feeds pump 50-80 articles per day. 70% is spam, ads, or irrelevant noise. Manual review was eating 2+ hours daily.

**Idea:** What if AI reads every article before I do? Not to publish — just to filter. A gatekeeper, not an editor. The key insight: I don't need perfect accuracy, I need to eliminate the obvious junk so I only review what matters.

**How it works:** Every scraped article hits an Azure OpenAI function (`Jobbot-gpt-4.1-mini`) with a custom prompt from the database. The prompt is editable through the admin panel — no redeploy needed. AI returns: approve, reject, or flag for review. Rejected articles never reach the Telegram bot.

**Result:** Review time dropped from 2 hours to 15 minutes. 1,234 commits later, the pre-moderation prompt has been refined 12+ times through the admin panel — each iteration learned from false positives.

---

### Case #2: AI Content Rewriting — one article, three languages, zero translators

**Problem:** Norway-based portfolio targeting three audiences: Norwegian locals, Ukrainian diaspora, international tech community. Every article needs to exist in EN, NO, and UA. Hiring translators for 5-10 articles per day? Unrealistic.

**Idea:** AI doesn't just translate — it rewrites. A Norwegian tech article about Equinor shouldn't read the same way in Ukrainian. The tone, context references, and even headline style should adapt to each audience.

**How it works:** The `process-news` Edge Function takes the original article and rewrites it three times using Azure OpenAI. Each language has its own prompt template (editable via admin panel). The AI preserves facts but adjusts style: formal for NO, conversational for UA, SEO-friendly for EN. All three versions share the same slug structure for cross-language linking.

**Result:** 3x content output with zero translation cost. The Ukrainian audience gets articles that feel native, not machine-translated. SEO benefits from unique content per language (not just translated meta tags).

---

### Case #3: Two-Stage AI Image Prompt System — because "generate an image for this article" never works

**Problem:** Giving an AI a full article and saying "make an image" produces generic, unusable results. Every image looked like a stock photo from 2015.

**Idea:** Split the problem into two stages. Stage 1: understand what the article is about (extract structured data). Stage 2: fill a proven visual template with that data. The classifier decides the category; the template decides the aesthetic.

**How it works:** Stage 1 (Classifier) uses Azure OpenAI to extract JSON: `{company, category, visual_concept, color_scheme}`. Seven categories: tech_product, marketing_campaign, ai_research, business_news, science, lifestyle, general. Stage 2 selects a template by category and fills `{placeholder}` values. Both prompts live in the `ai_prompts` table — editable without code changes.

**Result:** Image relevance jumped from ~30% to ~85%. The two-stage approach means I can improve classification and aesthetics independently. When a new visual trend emerges, I update one template — all future images follow.

---

### Case #4: AI Social Teasers — every platform speaks its own language

**Problem:** Posting the same text on LinkedIn, Instagram, and Facebook is a recipe for low engagement. LinkedIn wants professional insights. Instagram wants short hooks. Facebook wants conversation starters. Writing 3 versions manually for each article in 3 languages = 9 texts per article.

**Idea:** Let AI generate platform-specific teasers. But not generic — trained on what actually works on each platform. The prompts encode platform-specific rules: LinkedIn gets data points and takeaways, Instagram gets emoji-rich hooks, Facebook gets questions that invite comments.

**How it works:** Edge Function `generate-social-teasers` creates 9 variants (3 platforms x 3 languages) per article. Results are cached in the database (`social_teaser_{platform}_{lang}`). First click generates, subsequent clicks use cache. Each platform's prompt is independently editable.

**Result:** Engagement increased noticeably after switching from copy-paste to tailored teasers. The cache means generation happens once — no API costs on repeated views.

---

### Case #5: AI Comment Replies — sentiment-aware, never robotic

**Problem:** Social media comments need timely responses. But writing thoughtful replies to 20+ comments across 3 platforms daily is a time sink. Ignoring comments kills algorithm reach.

**Idea:** AI generates a suggested reply — but I always review before sending. The AI sees the original article context, the comment sentiment (positive/negative/neutral/question/spam), and the platform tone. The suggestion is a starting point, not an autopilot.

**How it works:** `sync-comments` fetches new comments from Facebook and Instagram every 30 minutes. Each comment gets sentiment analysis (-1 to +1 score). `generate-comment-reply` creates a contextual reply suggestion. The comments bot sends it to Telegram with buttons: Reply, Edit, Ignore. One tap to send, or edit first.

**Result:** Response time dropped from hours to minutes. Spam gets auto-flagged. Questions get thoughtful AI drafts. The human stays in the loop, but the heavy lifting is done.

---

### Case #6: AI Duplicate Detection — when six channels post the same story

**Problem:** Breaking news hits all 6 Telegram channels within minutes. Without detection, the same story gets scraped 6 times, creating 6 identical articles in the moderation queue. Reviewing duplicates wastes time and creates confusion.

**Idea:** Two-layer detection. Layer 1: fast title similarity check (cheap, catches obvious duplicates). Layer 2: AI semantic comparison (catches rephrased duplicates with different headlines). Run Layer 1 first; only invoke Layer 2 when Layer 1 is uncertain.

**How it works:** The scraper checks incoming titles against a 48-hour cache of recent titles. Exact or near-exact matches are auto-rejected. For uncertain cases, Azure OpenAI compares the full content semantically. Both layers run inside `pre-moderate-news` before the article enters the queue.

**Result:** Duplicate rate in moderation queue dropped from ~40% to under 3%. The two-layer approach keeps API costs low — most duplicates are caught by the free title comparison.

---

### Case #7: Multi-LLM Provider Support — never depend on one AI vendor

**Problem:** Azure OpenAI had a 4-hour outage in January. During that time, the entire content pipeline was dead. No pre-moderation, no rewrites, no image prompts. A single point of failure.

**Idea:** Abstract the LLM layer. Every function that calls an AI should be able to fall back to an alternative provider. Not just for reliability — different models excel at different tasks. Gemini is better at visual descriptions. Groq is faster for simple translations.

**How it works:** The system supports Azure OpenAI, Google Gemini, Grok (XAI), and Groq. Image generation uses cascading fallback: Grok -> Gemini. Translation experimented with multi-LLM quality comparison via `regenerate-translations`. Each provider's key is stored in `api_settings` — switchable from the admin panel.

**Result:** Zero downtime during subsequent provider outages. The cascading approach also improved image quality — Grok produces better creative images, Gemini handles technical illustrations. Best of both worlds.

---

## CATEGORY 2: Video Production Pipeline

### Case #8: Remotion Video Rendering — turning text articles into broadcast-ready video

**Problem:** Video content gets 5-10x more reach on social media than text. But producing even a simple news video manually takes 30-60 minutes: script, voiceover, editing, subtitles, export. With 5-10 articles per day, manual video production is impossible.

**Idea:** What if the entire video pipeline was code? Script generation, voiceover, subtitle timing, visual composition — all programmatic. Remotion (React for video) makes this possible. The human approves; the machine produces.

**How it works:** Article text -> Azure OpenAI generates a broadcast script -> Zvukogram Neural TTS creates voiceover with word-level timestamps -> Remotion renders the final video with animated subtitles, blurred background, and progress bar. Two templates: Vertical (1080x1920 for Reels) and Horizontal (1920x1080 for YouTube). If any step fails, the system gracefully falls back to raw video upload.

**Result:** Video production time: from 45 minutes to 3 minutes (mostly approval time). Output: broadcast-quality videos with synced subtitles, professional voiceover, and consistent branding. Toggle `SKIP_REMOTION=true` when raw video is preferred.

---

### Case #9: Visual Director — AI decides what you see, frame by frame

**Problem:** Auto-generated videos looked monotonous. Same background, same text animation, same feel for every article. A story about a tech product launch shouldn't look the same as a geopolitical analysis.

**Idea:** Create a "Visual Director" — an AI layer that analyzes each phrase of the script and assigns visual effects based on meaning. Words about technology get data-dashboard overlays. Words about nature get Ken Burns photo transitions. Words about conflict get glitch effects.

**How it works:** The script is split into phrases. For each phrase, the Visual Director runs keyword analysis and assigns one of 8 effect types: blur-text, particles, glitch, globe (Three.js), data-dashboard, perlin-waves, photo-native, or infographic. Each effect has its own Remotion component. The system also searches Pexels/Google for contextual images per phrase.

**Result:** Every video feels unique. The Visual Director turns a script about Nordic energy policy into a visually different experience than a script about Silicon Valley AI startups. Same pipeline, different soul.

---

### Case #10: Daily News Video Digest — the morning show that makes itself

**Problem:** A daily video compilation of top stories is the gold standard of news channels. But curating, scripting, and producing a multi-segment video daily is a full-time job for a team of 3-5 people.

**Idea:** Let the AI be the editor-in-chief. Every morning, it ranks all approved articles from the past 24 hours by relevance. Top 3-5 become segments. Each gets its own script, voiceover, and visual treatment. The compilation renders as one continuous video with transitions between segments.

**How it works:** `daily-video-bot` Edge Function triggers daily. LLM ranks articles by relevance/importance. `generate-script.js` creates per-segment scripts. `generate-voiceover.js` records per-segment TTS. `daily-compilation.js` stitches everything with Remotion: Headlines Roundup cold open, segment transitions, end card. Max 10 segments, respecting YouTube attention spans.

**Result:** A daily news show produced in under 10 minutes of compute time. Telegram bot sends it for approval. One click to publish on YouTube. Consistent quality, consistent schedule, zero burnout.

---

### Case #11: AI Thumbnail Generation — 4 options, one click

**Problem:** YouTube thumbnails make or break click-through rates. But designing unique thumbnails per video is a creative bottleneck. Generic auto-thumbnails from video frames perform poorly.

**Idea:** Generate 4 distinct thumbnail variants using AI, send them to Telegram for quick selection. The moderator picks the best one in seconds. Background music with audio ducking (voice stays clear, music adds mood) completes the package.

**How it works:** `generate-ai-thumbnail.js` sends article context to Gemini to create 4 stylistically different thumbnail concepts. Each emphasizes different hooks: data point, emotional face, contrast, question. Telegram bot displays all 4 as inline images. Moderator taps one. Background music auto-ducks during voiceover sections.

**Result:** Thumbnail selection takes 5 seconds instead of 15 minutes of design work. A/B testing through variety — the 4-option approach naturally surfaces what works for different content types.

---

### Case #12: Neural TTS — the voice that doesn't sound like a robot

**Problem:** Standard TTS (Google, AWS Polly) sounds robotic. Professional voiceover artists cost $50-200 per video. For 5-10 videos daily, that's $250-2000/day. Unsustainable.

**Idea:** Neural TTS has reached human-quality levels. The key is word-level timestamp alignment — without it, subtitles drift and the video feels broken. Zvukogram offers neural voices with precise timing data.

**How it works:** The script goes to Zvukogram API (replaced earlier OpenAI TTS for better quality). Returns audio file + JSON with per-word start/end timestamps. Remotion's `AnimatedSubtitles` component uses these timestamps for pixel-perfect subtitle synchronization. Each word highlights exactly when spoken.

**Result:** Voiceover quality indistinguishable from human at scale. Word-level sync means subtitles feel like professional captioning, not auto-generated afterthought. Cost: fraction of human voiceover.

---

### Case #13: Cross-Platform Video Distribution — one render, four platforms

**Problem:** YouTube wants 16:9. Instagram Reels wants 9:16. LinkedIn wants MP4 under 200MB. Facebook wants its own upload. Each platform has different format requirements, aspect ratios, and upload APIs.

**Idea:** Render both vertical and horizontal from the same Remotion composition. Upload natively to each platform via their APIs. Use GitHub Actions for heavy processing (Edge Functions have memory limits).

**How it works:** Remotion renders two versions: NewsVideo (1080x1920) and NewsVideo (1920x1080). GitHub Actions workflows handle the heavy lifting: `process-video.yml` (YouTube), `linkedin-video.yml` (LinkedIn native), `instagram-video.yml` (Reels), `facebook-video.yml` (Facebook). MTKruto downloads source videos from Telegram (up to 2GB, bypassing Bot API's 20MB limit). Fallback: if any upload fails, Telegram embed is used.

**Result:** One article → one video → four platforms → maximum reach. Fully automated. The GitHub Actions approach avoids Edge Function /tmp limits (256MB free, 512MB pro) for large video files.

---

## CATEGORY 3: Social Media Integration

### Case #14: LinkedIn Native Image Upload — because link previews don't cut it

**Problem:** LinkedIn's auto-generated link previews are small, blurry, and uncontrollable. Posts with native images get 2-3x more impressions than link posts. But the LinkedIn API's native upload process is complex: register asset, get upload URL, upload binary, get asset URN, then create post.

**Idea:** Implement the full native upload flow. The extra API complexity pays off in engagement. Also: always use the wide (16:9) processed image, not the original square — LinkedIn's feed favors landscape.

**How it works:** `post-to-linkedin` Edge Function: 1) Check duplicates via `wasAlreadyPosted()` (checks both 'posted' AND 'pending' — race condition fix from Jan 2025). 2) Create 'pending' record. 3) Register upload with Assets API. 4) Download source image. 5) Upload binary to LinkedIn. 6) Create UGC post with asset URN. 7) Update status to 'posted'. Fallback: if image upload fails, falls back to ARTICLE type (link preview).

**Result:** Average impressions per post increased after switching to native uploads. The duplicate prevention system (checking both statuses) eliminated the double-posting bug that plagued the first version.

---

### Case #15: Instagram Publishing — the platform that hates developers

**Problem:** Instagram's API is notoriously restrictive. No clickable links in captions. Business account required. Aspect ratio must be between 4:5 and 1.91:1 (or post gets rejected). Reels require a multi-step container creation → polling → publish flow. Error messages are cryptic (#10, #24, #100, #190).

**Idea:** Build comprehensive error handling with human-readable troubleshooting. Pre-validate aspect ratios before upload. Use short CTA text ("Читати на vitalii.no") instead of URLs. For Reels: implement polling with max 5-minute timeout.

**How it works:** `post-to-instagram` creates a media container, polls status every 10 seconds (max 30 attempts), then publishes. Aspect ratio pre-validation via binary header parsing catches bad images before they hit the API. Instagram errors get mapped to fix instructions (Error #10 → "regenerate token with instagram_content_publish scope"). Caption formatter respects the 2,200 char limit.

**Result:** Instagram publishing went from a 40% failure rate (API rejections) to under 5%. The error-to-fix mapping means every failure is self-diagnosable — no more digging through Facebook's documentation.

---

### Case #16: Social Analytics Dashboard — building my own Shield App

**Problem:** Shield App charges $25/month/profile for LinkedIn analytics. I already have all the data flowing through my system — posts, engagement, timestamps. I just wasn't collecting metrics from the platforms.

**Idea:** Build a Shield-like analytics dashboard inside the existing admin panel. The database already has `likes_count`, `comments_count`, `shares_count`, `views_count` columns — they were just never populated. Add API calls to fetch metrics, add Recharts for visualization, and the analytics layer builds itself on existing infrastructure.

**How it works:** New Edge Function `sync-social-metrics` runs every 6 hours. Fetches post insights from Facebook Graph API and Instagram Media API. Tracks follower counts in `follower_history` table. Aggregates daily snapshots. Dashboard shows: summary cards with % changes, engagement-over-time charts, top posts ranking, platform comparison, follower growth, posting frequency. CSV export for reporting.

**Result:** Full analytics dashboard at zero recurring cost. Real-time engagement tracking for Facebook and Instagram. LinkedIn pending API approval — when it arrives, it's just filling in one function stub.

---

### Case #17: Race Condition-Proof Duplicate Prevention — the bug that posted everything twice

**Problem:** In January 2025, articles were being posted twice to LinkedIn. The duplicate check (`wasAlreadyPosted()`) only looked for status='posted'. But between the check and the actual posting, there's a ~3 second window where another request could also pass the check and start posting.

**Idea:** Classic race condition. The fix: check for BOTH 'posted' AND 'pending' statuses. Create a 'pending' record BEFORE the actual API call. If another request tries to create the same pending record, PostgreSQL's UNIQUE constraint throws error code 23505 — caught and returned as `raceCondition: true`.

**How it works:** `createSocialPost()` inserts a pending record with UNIQUE(content_id, platform, language). If the insert fails with 23505, it means another process already started posting. The function returns `{isNew: false, raceCondition: true}` and the caller aborts. After successful posting, status updates to 'posted'.

**Result:** Zero duplicate posts since the fix. The pattern is now used across all three social platforms. A 3-line database constraint replaced what would have been complex distributed locking.

---

## CATEGORY 4: Telegram Bot Ecosystem

### Case #18: 9-Step Moderation Workflow — from raw scrape to published article in 4 taps

**Problem:** Content moderation needed a workflow that's fast on mobile (Telegram), supports complex branching (image selection, language choice, platform selection), and handles 50+ articles per day without overwhelming the moderator.

**Idea:** Build a sequential Telegram workflow where each step shows only what's needed. Step 1: image decision. Step 2: publish target. Step 3: social platforms. Step 4: confirmation with links. Video posts skip image steps entirely. Every callback must fit in 64 bytes (Telegram Bot API limit — UUID is 36 chars, leaving 28 for the prefix).

**How it works:** `telegram-webhook` Edge Function handles all inline button callbacks. Pattern: `action_prefix_${newsId}`. The bot edits the same message at each step (no message spam). Image priority: `processed_image_url > image_url > null`. For video posts, the workflow detects `videoUrl && videoType` and jumps straight to publish buttons.

**Result:** Average moderation time per article: 8 seconds (4 taps). The 64-byte callback constraint forced elegant prefix design. Message editing (vs sending new messages) keeps the chat clean even with 50+ articles per day.

---

### Case #19: Creative Builder — Telegram as an image prompt IDE

**Problem:** AI-generated images sometimes need creative direction. "Make it more corporate" or "use warmer colors" doesn't translate well to structured prompts. The moderator needs to influence the visual output without writing complex prompts.

**Idea:** Build an interactive prompt constructor inside Telegram. 7 categories of creative elements (style, mood, composition, color, technique, subject, background), each with 6 options. The moderator taps to select elements. The system combines selections into a structured prompt.

**How it works:** `cb_hub_${uuid}` shows the 7 categories. `cb_c_XX_${uuid}` selects a category. `cb_s_XX_N_${uuid}` selects an option within it. `cb_gen_${uuid}` triggers generation with all selected elements. `cb_rst_${uuid}` resets all choices. Creative elements stored in `creative_elements` table (6 categories x 6 options). The final prompt combines selections with the article's AI-extracted metadata.

**Result:** Non-technical content moderators can influence image generation through an intuitive tap-based interface. No prompt engineering knowledge needed. The constraint of 6x6 options prevents choice paralysis while covering the most common creative directions.

---

### Case #20: Auto-Publish Pipeline — the system that runs itself

**Problem:** Even with Telegram moderation, the pipeline had manual steps: tap to generate image, tap to rewrite, tap to publish, tap to post socially. For high-volume periods (10+ articles), these taps add up.

**Idea:** Create a fully autonomous mode. AI generates image variants → auto-selects the best one → generates full prompt → creates image → rewrites in 3 languages → publishes to website → posts to all social platforms. The moderator only intervenes for rejections.

**How it works:** `auto-publish-news` Edge Function orchestrates the entire pipeline. Telegram messages reduced to 4 in auto mode (from 8+ in manual). Per-source toggle: some sources get full auto, others stay manual. Auto-advance with configurable delays between steps. `schedule-publisher` manages timing windows and rate limiting.

**Result:** Publication latency dropped from 15 minutes (manual) to 2 minutes (auto). The moderator's role shifted from "process every article" to "review exceptions." Output capacity: unlimited, constrained only by API rate limits.

---

### Case #21: MTKruto — downloading 2GB videos through Telegram's back door

**Problem:** Telegram Bot API has a strict 20MB file download limit. News videos from Telegram channels are often 50-200MB. Some investigative reports are 500MB+. The Bot API simply can't handle them.

**Idea:** Use MTKruto (MTProto client library) instead of Bot API. MTProto is the same protocol Telegram's official apps use — no file size limits. It requires API_ID and API_HASH from my.telegram.org, but the investment pays off immediately.

**How it works:** MTKruto connects as a Telegram client (not a bot). Downloads happen via MTProto protocol, supporting files up to 2GB. The downloaded file is then uploaded to YouTube (unlisted) for web embedding, or directly to LinkedIn/Instagram/Facebook via their respective APIs. GitHub Actions handle the heavy lifting (Edge Functions have /tmp size limits: 256MB free, 512MB pro).

**Result:** No more "video too large" failures. Even hour-long documentary clips get processed. The MTProto approach also gives access to channel metadata and message history that Bot API can't reach.

---

### Case #22: RSS-to-Telegram Bridge — 32 sources, one moderation queue

**Problem:** Content comes from diverse sources: 6 Telegram channels, 26 RSS feeds. Each has different formats, update frequencies, and quality levels. The moderator needs a single, unified queue — not 32 separate inboxes.

**Idea:** Normalize everything into one format. Regardless of whether the source is Telegram, RSS, or web scraping — every article enters the same moderation pipeline. The Telegram bot becomes the universal interface.

**How it works:** `realtime-scraper.yml` runs every 10 minutes for Telegram channels (round-robin to avoid rate limits). `rss-monitor-v2.yml` runs every 30 minutes for RSS feeds (batched: 8 sources per batch, 4 batches). Both routes funnel articles through `pre-moderate-news` (AI filtering), then into the Telegram bot queue. The `news_sources` table tracks each source's type, fetch interval, and last fetch time.

**Result:** 32 sources, 1 moderation queue, 1 workflow. The round-robin approach prevents hitting Telegram's rate limits. Batch processing for RSS keeps GitHub Actions runtime under 10 minutes. Source management is fully configurable from the admin panel.

---

## CATEGORY 5: Content Management

### Case #23: 43 Edge Functions — a serverless backend that scales to zero

**Problem:** Traditional backend servers cost money 24/7 whether you use them or not. For a portfolio/news site with variable traffic, paying for always-on infrastructure is wasteful. But the backend logic is complex: 43 distinct operations from scraping to AI processing to social posting.

**Idea:** Each operation becomes a standalone Deno Edge Function on Supabase. They scale to zero when idle, scale up under load, and deploy independently. No server management, no Docker containers, no load balancers.

**How it works:** 43 functions in `supabase/functions/`, each with its own `index.ts`. Shared helpers in `_shared/` (10 files: YouTube, GitHub Actions, Facebook, social media, slugs, duplicates, Telegram formatting, etc.). Deploy: `supabase functions deploy <name> --no-verify-jwt`. Each function has version logging for deployment verification.

**Result:** Backend cost: $0/month on Supabase free tier (upgrading to pro only for /tmp storage on video processing). Cold start: <500ms. Deployment: individual function redeploy in ~10 seconds. The serverless approach means I never pay for idle time — which is 95% of the day.

---

### Case #24: Cascading Image Providers — when Plan A fails, there's always Plan E

**Problem:** AI image generation is unreliable. Grok has rate limits. Gemini sometimes returns inappropriate content. Together AI has quality inconsistencies. Depending on a single provider means accepting their failure rate.

**Idea:** Chain providers in priority order. Try the best one first. If it fails, automatically try the next. Log which provider succeeded for analytics. Make the chain configurable from the admin panel.

**How it works:** Cascading order: Grok (XAI) -> Gemini (Google). Previous extended chain also included: Cloudflare FLUX -> Together AI -> Pollinations -> HuggingFace. Each provider has a 40-second timeout. `image_provider_usage` table tracks success/failure rates per provider per day. The admin panel shows provider statistics and allows reordering.

**Result:** Image generation success rate: 98%+ (up from ~75% with a single provider). Provider selection is data-driven — the admin panel shows which providers are performing best, enabling informed decisions about the cascade order.

---

### Case #25: Scheduled Publishing — the art of not flooding your audience

**Problem:** Auto-publishing 10 articles at once creates a wall of content that followers can't digest. Social media algorithms penalize rapid-fire posting. But holding articles for manual scheduling defeats the purpose of automation.

**Idea:** Implement a scheduling engine with configurable windows and rate limiting. Articles queue up and release at optimal intervals. Content weight classification (breaking news gets priority, evergreen content can wait).

**How it works:** `schedule-publisher` runs every 5 minutes via GitHub Actions. It checks for queued content, respects minimum 1-minute gaps between posts, and classifies content weight. Publishing windows prevent late-night posts. Sequential publish queue ensures LinkedIn, Instagram, and Facebook get their posts with proper spacing.

**Result:** Consistent posting rhythm without manual intervention. Followers see content at digestible intervals. Algorithm-friendly posting patterns. The weight classification ensures breaking news doesn't wait behind a listicle.

---

### Case #26: 3-Tier Spam Protection — because contact forms attract bots like honey

**Problem:** The contact form on vitalii.no received 50+ spam submissions per day within the first week. Classic spam: SEO offers, casino links, crypto scams. CAPTCHA adds friction for real users.

**Idea:** Invisible protection in three layers. Layer 1: honeypot field (hidden, bots fill it, humans don't). Layer 2: timestamp check (form submitted in <3 seconds = definitely a bot). Layer 3: IP rate limiting (max 3 submissions per IP per 10 minutes). No CAPTCHA, no friction for real users.

**How it works:** `send-contact-email` Edge Function checks all three layers before processing. Honeypot: a hidden field named something attractive to bots. If filled = rejected. Timestamp: form render time is stored, submission time is compared. <3 seconds between render and submit = rejected. Rate limit: IP tracked in-memory with 10-minute window.

**Result:** Spam dropped from 50+/day to 0-1/day. Zero false positives reported. Real users never see a CAPTCHA. The three layers catch different bot types: simple scrapers (honeypot), form-filling tools (timestamp), and persistent attackers (rate limit).

---

## CATEGORY 6: Frontend UI/UX

### Case #27: BentoGrid Layout — six windows into one portfolio

**Problem:** Traditional portfolio websites are linear scrolls. Visitors see sections in the developer's order, not their own order of interest. A recruiter wants to see projects first. A designer wants to see skills. A potential client wants services.

**Idea:** A 6-section grid where every section is a portal. Hover over any section and it comes alive — background color shifts, hero text transforms, section-specific animations trigger. The visitor explores, not scrolls. Each section is a teaser that invites deeper interaction.

**How it works:** 6 sections (About, Services, Projects, Skills, News, Blog) in a CSS Grid. Each section has a unique color pair: background (40% opacity, 700ms transition) and hero text contrast. Hover triggers: HeroTextAnimation with liquid wave fill effect, section-specific child animations. 3+ second hover on Projects triggers an explosion grid. Touch-friendly on mobile via BentoGridMobile with bottom navigation.

**Result:** Average session duration is significantly higher than typical portfolio sites. The non-linear exploration keeps visitors engaged. The color system creates visual identity — each section has its own personality while maintaining cohesion.

---

### Case #28: Liquid Fill Animation — text that flows like water

**Problem:** Standard text animations (fade in, slide up) are everywhere. They don't create memorable first impressions. The hero text needs to feel alive, not just appear.

**Idea:** What if text fills up like a glass of water? A wave animation that rises through the letters, revealing color as it climbs. The wave has a sinusoidal surface — not a straight line — creating an organic, fluid feel.

**How it works:** SVG polygon clip-path with dynamically calculated sinusoidal wave. `requestAnimationFrame` drives smooth 60fps animation. The wave offset creates the illusion of liquid surface. Fill speed: 8% per frame with easing. Glass baseline: transparent text with 0.5px stroke. Once filled: solid color with 400ms transition. Debounced: 150ms for subtitle (RTL), 300ms for description (LTR).

**Result:** Every first-time visitor notices it. The animation is subtle enough for professional context but distinctive enough to be memorable. The debounced timing means it responds to hover without flickering during quick mouse movements.

---

### Case #29: Projects Explosion Grid — hover for 3 seconds and everything changes

**Problem:** A project carousel shows one project at a time. Visitors have to click through to discover all projects. Most won't click more than 2-3 times. The full portfolio remains hidden.

**Idea:** Reward patient exploration. If a visitor hovers over the Projects section for 3+ seconds, the section explodes into a grid showing all projects simultaneously. The transition is dramatic — cards burst outward with staggered timing and bounce easing. It's a surprise that makes exploration fun.

**How it works:** 3-second hover threshold tracked with timer. When triggered: GSAP timeline animates cards from center outward. Grid sizes adapt: 2x2 for 4 projects, 3x3 for 9, up to 4x4. Each card staggers by `index * 0.05` seconds with `backOut` easing (slight bounce). Neon gradient backgrounds per card (5 color schemes). Progress bar shows carousel position before explosion.

**Result:** Visitors who discover the explosion effect spend more time exploring projects. The 3-second threshold prevents accidental triggers while rewarding genuine interest. The bounce easing gives a playful, premium feel.

---

### Case #30: Three.js Particle Background — 200 particles, zero performance cost

**Problem:** Static backgrounds feel dead. But animated backgrounds often kill performance — especially on mobile. Previous attempts with full particle systems (1000+ particles) caused frame drops on mid-range phones.

**Idea:** 200 particles with aggressive optimization. Low-power GPU preference. Pixel ratio capped at 1.5x (even on 3x Retina displays). Alpha rendering for seamless integration. Mouse tracking for interactivity — particles subtly respond to cursor movement.

**How it works:** Three.js with `powerPreference: 'low-power'`, `antialias: true`, `alpha: true`. 200 particles (tested as the sweet spot between visual density and performance). `devicePixelRatio` capped at `Math.min(window.devicePixelRatio, 1.5)`. Mouse position tracked for interactive parallax effect. `prefers-reduced-motion` media query disables the effect entirely for accessibility.

**Result:** Consistent 60fps on all tested devices (including 5-year-old Android phones). The 200-particle count creates enough visual texture without computational waste. Mouse interaction adds a "living" quality that visitors notice subconsciously.

---

### Case #31: Mobile App-Style Layout — a website that feels like an app

**Problem:** Mobile portfolio websites typically shrink the desktop layout. This creates tiny text, cramped sections, and frustrating navigation. The BentoGrid approach doesn't work on a 375px screen.

**Idea:** Build a completely different component for mobile. Not responsive CSS — a different React component. Bottom navigation (like native apps). Swipe gestures for carousels. Safe area insets for notched phones. Glassmorphism navigation bar.

**How it works:** `BentoGridMobile` component with 7 screens: Home (typewriter), About (word explosion), Services (rotating icons), Projects (swipe carousel, 50px threshold), Skills (category filter + grid), News (horizontal scroll), Blog (horizontal scroll). Glassmorphism bottom nav: `backdrop-filter: blur(10px)`, semi-transparent. `env(safe-area-inset-bottom)` for iPhone notch. `useIsMobile()` hook (SSR-safe: initial false, update on mount).

**Result:** Mobile experience feels native, not adapted. Swipe gestures feel natural. Bottom navigation provides instant access to any section. Safe area handling means no content hidden behind notches or home indicators.

---

### Case #32: Next.js Parallel Routes Modal — seamless article browsing

**Problem:** Clicking a news article on the homepage should show the article without leaving the page. But the article also needs its own URL for sharing and SEO. These are conflicting requirements: modal behavior (stay on page) vs page behavior (own URL).

**Idea:** Next.js 14+ parallel routes solve this perfectly. The `@modal` slot intercepts navigation to `/news/[slug]` when you're on the homepage, rendering the article in a modal. Direct URL navigation renders the full page. Same component, same URL, different context.

**How it works:** `app/@modal/(.)news/[slug]/page.tsx` intercepts the route with `(.)` prefix. When the homepage is the previous route, the article renders as an overlay modal with dark backdrop, close button, and scroll prevention. When navigated directly (pasted URL, search engine), the regular `app/news/[slug]/page.tsx` renders a full page. The article component is shared between both.

**Result:** Visitors browse articles without losing their place on the homepage. Shared URLs work as full pages. SEO crawlers see full pages with proper metadata. The best of both worlds — no JavaScript routing hacks, just framework-native behavior.

---

### Case #33: Advanced Search — masonry grid with intelligent filtering

**Problem:** As the content library grew to 200+ articles, finding specific content became painful. Simple text search wasn't enough — users needed to filter by tags, date ranges, and content types simultaneously.

**Idea:** Build a search page that feels like a discovery tool, not just a filter. Masonry grid for visual variety. Clickable hashtags that work as filters. YouTube video thumbnails with play overlays. Tag cloud showing content density.

**How it works:** Full-text search with 300ms debounce. Multi-filter: query + tags (multi-select) + date range + content type. Masonry grid layout with natural image dimensions. YouTube detection: `getYouTubeVideoId()` parses multiple URL formats, `getYouTubeThumbnail()` fetches hqdefault quality with play overlay. Tag cloud sized by frequency. Header search icon expands right-to-left, overlaying language buttons.

**Result:** Search page became a content discovery surface. Tag cloud reveals content patterns. Masonry grid makes browsing visually engaging. The expandable header search saves screen real estate while staying accessible.

---

### Case #34: Glassmorphism Design System — consistency through transparency

**Problem:** Admin panel components were growing organically. Each developer (me, at different times) used slightly different card styles, shadows, and opacities. The result looked inconsistent.

**Idea:** Establish a glassmorphism design language and apply it everywhere. One card style: `bg-white/10 backdrop-blur-lg rounded-xl border border-white/20`. One button active state: `bg-purple-600 text-white`. One hover: `hover:bg-white/5`. Consistency beats creativity for admin UIs.

**How it works:** Every admin component follows the established pattern. Cards: `bg-white/10 backdrop-blur-lg rounded-xl border border-white/20`. Buttons: `motion.button` with `whileHover={{ scale: 1.05 }}`. Platform colors: `#0A66C2` LinkedIn, `#1877F2` Facebook, `#E4405F` Instagram. Loading: `Loader2 animate-spin`. Error: `bg-red-500/10 border-red-500/30`. All via Tailwind utility classes — no custom CSS files.

**Result:** 17 admin components with zero visual inconsistency. New components copy-paste the pattern and look native immediately. The glassmorphism aesthetic is distinctive yet professional — dark backgrounds with translucent cards create depth without distraction.

---

## CATEGORY 7: SEO & Analytics

### Case #35: Multilingual SEO — one site, three search engines

**Problem:** Content exists in 3 languages but search engines need explicit signals about language relationships. Without proper hreflang tags and language-specific sitemaps, Google might index the Norwegian version for English queries, or miss the Ukrainian version entirely.

**Idea:** Full multilingual SEO implementation: hreflang tags linking all language versions, multilingual sitemap with alternates, language-specific canonical URLs, and separate JSON-LD schemas per language.

**How it works:** `app/sitemap.ts` generates dynamic sitemap with hreflang alternates for every article in 3 languages. Each article page has `<link rel="alternate" hreflang="en|no|uk">` tags. Canonical URLs prevent duplicate content penalties. JSON-LD schemas (BlogPosting, NewsArticle) include `inLanguage` property. Open Graph `og:locale` set per language version.

**Result:** Search engines correctly index and serve language-appropriate versions. Norwegian articles appear in Norwegian Google results. Ukrainian articles surface in Ukrainian searches. No duplicate content penalties despite 3x content volume.

---

### Case #36: Dynamic OG Images — every share looks professional

**Problem:** Shared links on social media default to a generic site image or no image at all. Custom OG images per article dramatically improve click-through rates, but manually creating them is unfeasible for 5-10 articles daily.

**Idea:** Generate OG images server-side on demand. When a social media crawler requests the OG image URL, Next.js generates a 16:9 branded image with the article title, category, and site logo. No manual design work needed.

**How it works:** `app/opengraph-image.tsx` uses Next.js OG Image generation (built on Satori). Each article gets a dynamically rendered image with: article title (truncated to 2 lines), category badge, vitalii.no branding, and gradient background matching the section color. Images are cached after first generation.

**Result:** Every shared link has a professional, branded image. Social media engagement on shared articles increased. Zero manual effort — the image exists the moment the article is published.

---

### Case #37: GTM Integration Hub — one tag, all analytics

**Problem:** Four analytics platforms needed: GA4 (traffic), Meta Pixel (Facebook/Instagram ads), LinkedIn Insight Tag (audience insights), and custom event tracking. Installing each separately creates a maintenance nightmare and slows page load.

**Idea:** Route everything through Google Tag Manager. GTM loads once, manages all four platforms. Custom events (article_view, share, language_change, section_click) fire once to GTM's dataLayer — GTM distributes to each platform based on rules configured in the GTM console.

**How it works:** `@next/third-parties` GoogleTagManager component (ID: GTM-5XBL8L8S). `TrackingContext` provides hooks: `trackPageView` (automatic on route change), `trackArticleView`, `trackShare`, `trackLanguageChange`, `trackSectionClick`. Events pushed to `(window as any).dataLayer` to avoid Next.js type conflicts. Cookie consent gates analytics activation.

**Result:** Single script load for 4 analytics platforms. Event tracking is centralized — add one `dataLayer.push()` call and all platforms receive the data. GTM's console allows real-time debugging without code changes.

---

### Case #38: Cookie Consent — Norwegian law, zero friction

**Problem:** Norwegian ekomloven requires explicit consent for analytics cookies. GDPR adds complexity. But aggressive cookie banners destroy user experience. Most visitors click "accept all" without reading — the consent is meaningless but legally required.

**Idea:** Minimal, honest consent UI. Banner explains what we track (analytics only, no ads). Two buttons: Accept and Reject. No dark patterns (no pre-checked boxes, no "legitimate interest" loopholes). Analytics only activate after explicit consent.

**How it works:** `CookieConsentContext` manages state. Banner appears on first visit. Choice persisted in localStorage. Analytics (`TrackingContext`) checks consent before any tracking call. `/informasjonskapsler` page provides full cookie policy in Norwegian. GTM only fires tags when consent is granted.

**Result:** Legal compliance with minimal UX impact. Banner shown once, never again after choice. Visitors who reject cookies get the full site experience minus analytics. The Norwegian-language policy page shows respect for the local audience.

---

## CATEGORY 8: DevOps & CI/CD

### Case #39: 20 GitHub Actions Workflows — the invisible workforce

**Problem:** The project has 43 Edge Functions, scheduled scraping every 10 minutes, video processing that takes 5+ minutes per video, and social media posting that needs retry logic. Manual deployment and triggering is unsustainable.

**Idea:** Every repeating task gets a GitHub Actions workflow. Deployment is automatic on push. Scheduled tasks run on cron. Video processing runs on repository_dispatch (triggered by Edge Functions). Every workflow has retry logic and error reporting.

**How it works:** 20 workflows covering: deployment (2), content scraping (4), video processing (3), social media video (4), content management (5), utilities (2). Patterns: `MAX_RETRIES=3, RETRY_DELAY=15`, only retry on 5xx errors. Concurrency groups prevent parallel runs of the same scraper. Round-robin selection for channel scraping. Batch processing for RSS (8 sources per batch).

**Result:** The system operates 24/7 without human intervention. Telegram channels are checked every 10 minutes. RSS feeds every 30 minutes. Videos process every 30 minutes. Social comments sync every 30 minutes. Metrics sync every 6 hours. One developer, zero ops team.

---

### Case #40: Netlify via Actions Only — why auto-build is disabled

**Problem:** Netlify's auto-build triggers on every push to main. But environment variables in Netlify's build environment sometimes differed from local, causing subtle bugs. A push to fix an Edge Function would trigger an unnecessary Netlify rebuild.

**Idea:** Disable auto-builds entirely (`stop_builds: true` in netlify.toml). Deploy only through GitHub Actions, which has all secrets properly configured and only triggers when frontend code actually changes.

**How it works:** `deploy.yml` runs on push to main. It builds Next.js, then deploys to Netlify using `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. `deploy-supabase.yml` runs only when files in `supabase/**` change — it handles Edge Function deployment and migrations. The two workflows are independent.

**Result:** No more phantom builds from Edge Function changes. Environment variables are consistent (GitHub Actions is the single source of truth). Build time saved on non-frontend changes. Deployment is predictable and debuggable.

---

### Case #41: Round-Robin Scraping — 6 channels, 10 minutes, zero rate limits

**Problem:** Scraping all 6 Telegram channels every 10 minutes could trigger Telegram's rate limits. Batch scraping (all at once) also risks timeout — each channel might have 10+ new posts to process.

**Idea:** Scrape one channel per run, rotating through them. Run 1: channel A. Run 2: channel B. Run 6: channel F. Run 7: back to channel A. Each channel gets checked every 60 minutes, but the system runs every 10 minutes.

**How it works:** `realtime-scraper.yml` calculates the source index: `INDEX = (minute / 10) % sourceCount`. Concurrency group `telegram-scraper` with `cancel-in-progress: false` ensures only one run at a time — the next waits for the current to finish. Each run processes only one source, keeping execution time under 2 minutes.

**Result:** Zero rate limit hits from Telegram. Each channel is checked every ~60 minutes (with 6 channels). Execution time is predictable and short. The concurrency guard prevents overlapping runs during slow network conditions.

---

### Case #42: Retry Logic Pattern — because APIs fail on Tuesdays

**Problem:** External APIs (Supabase Edge Functions, social media APIs, AI providers) occasionally return 5xx errors. A single failure shouldn't break the entire pipeline.

**How it works:** Standardized across all workflows: 3 attempts maximum, 15-second delay between retries, only retry on 5xx errors (4xx are client errors — retrying won't help). `curl -w "\n%{http_code}"` captures both body and status code. Response parsed with `jq` for structured error reporting.

**Result:** Transient API failures are handled automatically. The 5xx-only retry policy prevents infinite loops on permanent errors. 15-second delay gives the remote service time to recover. 95%+ of retried requests succeed on the second attempt.

---

## CATEGORY 9: Admin Panel

### Case #43: 10-Tab Dashboard — command center for one-person media operations

**Problem:** Managing a multi-platform content operation requires jumping between: Telegram (moderation), Supabase (database), GitHub (deployments), LinkedIn/Facebook/Instagram (social), and multiple AI services. Context switching kills productivity.

**Idea:** One dashboard to rule them all. Every operation accessible from the admin panel. No need to open Supabase Studio, GitHub Actions, or social media apps. The admin panel IS the command center.

**How it works:** 10 tabs: Overview (stats + monitoring), Queue (pending moderation), News (CRUD), Blog (CRUD), Monitor (4-tier RSS), Social (post tracking), Analytics (engagement metrics), Comments (cross-platform), Skills (drag & drop), Settings (9 sub-tabs for sources, prompts, images, API keys, accounts, scheduling, automation, tags, debug).

**Result:** All daily operations happen in one browser tab. Morning routine: check Overview for overnight activity, scan Queue for pending articles, glance at Analytics for engagement trends. The collapsible sidebar maximizes screen real estate. Each tab loads independently — no monolithic data fetch.

---

### Case #44: 4-Tier RSS Monitor — not all sources are created equal

**Problem:** 26+ RSS feeds have wildly different qualities and publication frequencies. Treating them equally means high-value sources (Reuters, TechCrunch) compete for attention with low-quality content mills.

**Idea:** Tier system. Tier 1 (Critical): breaking news sources, checked most frequently. Tier 2 (High): major tech publications. Tier 3 (Medium): niche industry blogs. Tier 4 (Low): general aggregators. Each tier has its own monitoring cadence and alert priority.

**How it works:** `NewsMonitorManager` component with 4 color-coded tier columns (Red, Orange, Yellow, Gray). Drag-and-drop sources between tiers. `monitor-rss-sources` Edge Function processes tiers with different batch sizes and priorities. Tier 1 sources are always in the first batch. Admin can toggle pre-moderation per source. Real-time article previews within each tier column.

**Result:** High-value content surfaces immediately. Low-priority sources don't create noise. The drag-and-drop interface makes tier management intuitive. New sources start at Tier 4 and graduate upward based on content quality.

---

### Case #45: Skills Manager — your tech stack, your order

**Problem:** Portfolio skills section needs to be easily reorderable. Different contexts call for different skill ordering — when applying for a React job, React should be first. For a DevOps role, cloud skills should lead.

**Idea:** Drag-and-drop skill management with instant visual feedback. Each skill shows its icon from SimpleIcons CDN, colored by category. Order persists in localStorage — no database round-trip for a cosmetic preference.

**How it works:** Framer Motion `Reorder` component for smooth drag animations. 6 category colors: development (green), UI (purple), automation (blue), AI (orange), marketing (pink), integration (cyan). SimpleIcons CDN for tech logos (`cdn.simpleicons.org/[name]`). localStorage key: `vitalii_skills_list`. No authentication needed — it's the visitor's own portfolio view customization.

**Result:** Skill reordering takes 2 seconds of dragging. Icons provide instant recognition. Category colors group related skills visually. The localStorage approach means zero API calls for this purely presentational feature.

---

## CATEGORY 10: Internationalization

### Case #46: 3-Language Content Pipeline — one article enters, three emerge

**Problem:** The portfolio serves three distinct audiences: international tech community (English), Norwegian professionals (Norwegian), and Ukrainian diaspora (Ukrainian). Each audience expects native-quality content, not machine translations.

**Idea:** AI rewriting (not translating) per language. Each language gets its own prompt template that defines tone, style, and cultural context. English is SEO-focused. Norwegian is formal and concise. Ukrainian is conversational and community-oriented.

**How it works:** Database stores separate fields per language: `title_en/no/ua`, `content_en/no/ua`, `description_en/no/ua`, `slug_en/no/ua`. `process-news` Edge Function rewrites the original article using language-specific prompts from `ai_prompts` table. `TranslationContext` on the frontend manages language state with 143+ translation keys. Hreflang tags connect all three versions for SEO. Language selector in header with flag indicators.

**Result:** Three complete content ecosystems from one editorial effort. Each language version reads naturally — not like a translated document. The shared slug structure (`slug_en`, `slug_no`, `slug_ua`) enables cross-language navigation without URL hacks.

---

### Case #47: Auto Norway Detection — the algorithm that knows what Norwegians want

**Problem:** Some RSS sources publish Norwegian-focused articles (Equinor news, Oslo tech scene, Nordics policy). These should be published in Norwegian first, not English. But manually detecting which articles are "Norwegian relevant" adds another decision to the moderation pipeline.

**Idea:** AI detection of Norway-relevant content. If an article mentions Norwegian companies, cities, policies, or cultural references, auto-flag it for Norwegian-first publication. The moderator still approves, but the language suggestion is pre-set.

**How it works:** During pre-moderation, the AI checks for Norway-relevant signals: company names (Equinor, Telenor, DNB), locations (Oslo, Bergen, Stavanger, Tromsoe), policy references (Stortinget, NAV, arbeidsmiljoloven), and cultural markers. When detected, the article is pre-flagged as `language_suggestion: 'no'`. Telegram bot shows "Norwegian detected" badge and pre-selects NO language for publishing.

**Result:** Norwegian-relevant content is identified and published in the right language automatically. The Norwegian audience sees relevant content faster. The AI detection catches subtle Norway connections that keyword matching would miss.

---

### Case #48: Social Analytics Dashboard — Shield App for free

**Problem:** Shield App ($25/month) tracks LinkedIn analytics: impressions, engagement rates, follower growth, content performance. I already have all the posting data flowing through my system. Paying $25/month for charts on data I already own feels wrong.

**Idea:** Build the same dashboard inside the existing admin panel. The database already has engagement columns (they were just zeros). Add API calls to fetch metrics from Facebook/Instagram. Recharts for visualizations. LinkedIn analytics will auto-connect when API access is approved.

**How it works:** `sync-social-metrics` Edge Function fetches post insights from Facebook Graph API (`/{post_id}/insights`) and Instagram Media API (`/{media_id}/insights`). Metrics: impressions, reach, likes, comments, shares, saves. `follower_history` table tracks daily follower counts. `analytics_snapshots` table aggregates daily metrics. Dashboard: 6 summary cards with % changes, engagement-over-time line chart, top posts ranking (sortable), platform comparison bars, follower growth chart, posting frequency bars, CSV export.

**Result:** Full analytics dashboard at $0/month. Currently tracking Facebook and Instagram with real data. LinkedIn stubbed for when Community Management API access arrives. Period comparison (7D/30D/90D/YTD) shows trends. CSV export provides data for external reporting.

---

## Summary

**48 production mini-cases** across 10 categories:
- 7 AI & Content Automation
- 6 Video Production Pipeline
- 5 Social Media Integration (including race condition fix)
- 5 Telegram Bot Ecosystem
- 4 Content Management (serverless, cascading, scheduling, spam)
- 8 Frontend UI/UX (BentoGrid, animations, mobile, modals, search, design system)
- 4 SEO & Analytics
- 4 DevOps & CI/CD
- 3 Admin Panel
- 2 Internationalization

**Total project stats:** 1,234 commits | 43 Edge Functions | 20 GitHub Actions | 76 UI components | 15+ API integrations | 3 languages | 66 DB migrations
