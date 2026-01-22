## AI Social Media Teasers (January 2025)

### Опис

Генерація унікальних тизерів для кожної соцмережі (LinkedIn, Facebook, Instagram, Twitter) замість копіювання повного тексту статті. Кожна платформа отримує контент, оптимізований під її аудиторію та формат.

### Файли

```
├── supabase/functions/generate-social-teasers/index.ts  # Edge Function для генерації тизерів
├── supabase/migrations/20250118000003_add_social_teasers.sql    # Поля для тизерів в БД
├── supabase/migrations/20250118000004_add_social_teaser_prompts.sql  # AI промпти для платформ
```

### Workflow

```
User clicks LinkedIn button → post-to-linkedin
  → Checks DB for cached teaser
  → If not cached: calls generate-social-teasers(linkedin, {lang})
  → AI generates unique teaser
  → Saves to DB for future use
  → Posts teaser + link to LinkedIn

User clicks Twitter button → telegram-webhook
  → Same flow for Twitter teaser
  → Creates Twitter Intent with teaser
```

### Database Fields

**Таблиці `news` та `blog_posts`:**
```sql
-- LinkedIn teasers
social_teaser_linkedin_en TEXT
social_teaser_linkedin_no TEXT
social_teaser_linkedin_ua TEXT

-- Facebook teasers
social_teaser_facebook_en TEXT
social_teaser_facebook_no TEXT
social_teaser_facebook_ua TEXT

-- Instagram teasers (with hashtags)
social_teaser_instagram_en TEXT
social_teaser_instagram_no TEXT
social_teaser_instagram_ua TEXT

-- Twitter teasers (max 250 chars)
social_teaser_twitter_en TEXT
social_teaser_twitter_no TEXT
social_teaser_twitter_ua TEXT

teasers_generated_at TIMESTAMPTZ  -- Час генерації
```

### AI Prompts (в таблиці `ai_prompts`)

| prompt_type | Платформа | Особливості |
|-------------|-----------|-------------|
| `social_teaser_linkedin` | LinkedIn | Професійний тон, 2+ абзаци, 2-3 емодзі, CTA |
| `social_teaser_facebook` | Facebook | Дружній тон, curiosity gap, 3-5 емодзі |
| `social_teaser_instagram` | Instagram | Візуальний стиль, 5-7 емодзі, хештеги |
| `social_teaser_twitter` | Twitter/X | Короткий (max 250 символів), провокативний |

### Приклад результату

**Оригінальна стаття:**
> Meta Unveils SAM Audio: A Breakthrough in AI Sound Processing...

**LinkedIn тизер:**
> 🎵 **Революція в обробці звуку вже тут**
>
> Meta тихо випустила SAM Audio — AI модель, яка робить те, що здавалося неможливим: розділяє будь-який трек на інструменти в реальному часі.
>
> 🔗 Читати повністю →

**Twitter тизер:**
> 🔥 Meta тихо убила всіх конкурентів в AI-аудіо
>
> SAM Audio розділяє БУДЬ-ЯКИЙ трек на інструменти в реальному часі. Безкоштовно. Open source.

### Кешування

Тизери генеруються **on-demand** (при натисканні кнопки) і зберігаються в БД. При повторному натисканні тієї ж кнопки повертається кешований тизер.

### Deploy

```bash
cd supabase
supabase functions deploy generate-social-teasers
supabase functions deploy post-to-linkedin
supabase functions deploy telegram-webhook
```

---
