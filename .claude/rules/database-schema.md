# Database Schema (Supabase PostgreSQL)

## Main Tables

### `news`
- `id` UUID PK, `source_id` FK -> news_sources
- Multilingual: `title_en/no/ua`, `content_en/no/ua`, `description_en/no/ua`, `slug_en/no/ua`
- Media: `image_url`, `processed_image_url` (custom uploaded), `video_url`, `video_type` (youtube|telegram_embed|direct_url)
- Moderation: `pre_moderation_status` (pending|approved|rejected), `rejection_reason`
- AI: `image_generation_prompt`, `prompt_generated_at`, `is_rewritten`
- Social: `linkedin_post_id/posted_at/language`, `instagram_post_id/posted_at/language`, `facebook_post_id`
- Teasers: `social_teaser_{linkedin|facebook|instagram|twitter}_{en|no|ua}`, `teasers_generated_at`
- Image variants: `image_prompt_variants` (JSONB), `creative_builder_state` (JSONB)
- Cascading: `image_provider_used`, `image_model_used`
- Video: `original_video_url` (for LinkedIn native upload), `video_processing_error`
- Other: `tags` TEXT[], `source_link`, `views_count`, `images` TEXT[]

### `blog_posts`
- Same multilingual structure as news
- Additional: `author_id` FK -> users, `source_news_id` FK -> news, `category`, `reading_time`, `is_featured`

### `news_sources`
- `name`, `url`, `rss_url`, `source_type` (rss|telegram|web), `is_active`, `fetch_interval`, `last_fetched_at`

### `ai_prompts`
- `name`, `prompt_type`, `prompt_text`, `description`, `is_active`, `usage_count`
- Types: pre_moderation, news_rewrite, blog_rewrite, image_generation, image_classifier, image_template_*, social_teaser_*
- Always query with `.order('updated_at', { ascending: false }).limit(1)` to get latest

### `api_settings`
- `key_name` UNIQUE, `key_value`, `description`, `is_active`
- Keys: GOOGLE_API_KEY, LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN, IMAGE_GENERATION_MODE, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_AI_TOKEN, TOGETHER_API_KEY, HUGGINGFACE_TOKEN

### `social_media_posts`
- `platform`, `post_id`, `post_url`, `language`, `status` (pending|posted|failed)
- Duplicate prevention: check both 'posted' AND 'pending' statuses

### `image_provider_usage`
- `provider_name`, `model_name`, `usage_date` DATE, `request_count`, `success_count`, `failure_count`
- UNIQUE(provider_name, usage_date)

### `creative_elements`
- 6 categories x 6 options for Creative Builder image generation

### Other tables
- `users` (admin auth), `tags`, `contact_forms`, `daily_images` (background cache)
