## New Database Tables

### `api_settings` - API Keys Storage

**Міграція:** `20251220_add_api_settings.sql`

```sql
CREATE TABLE api_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name        TEXT UNIQUE NOT NULL,
  key_value       TEXT,
  description     TEXT,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Default keys
INSERT INTO api_settings (key_name, description) VALUES
  ('GOOGLE_API_KEY', 'Google API Key for Gemini image processing'),
  ('LINKEDIN_ACCESS_TOKEN', 'LinkedIn OAuth2 access token'),
  ('LINKEDIN_PERSON_URN', 'LinkedIn Person URN');
```

**RLS:** Authenticated users read, service role manages.

### `daily_images` - Background Images Cache

**Міграція:** `20250102000000_create_daily_images.sql`

```sql
CREATE TABLE daily_images (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date            DATE UNIQUE NOT NULL,
  title           TEXT,
  description     TEXT,
  image_url       TEXT NOT NULL,
  thumbnail_url   TEXT,
  source          TEXT,                    -- 'bing', 'nasa', 'unsplash'
  colors          JSONB,                   -- Vibrant.js color palette
  theme           TEXT,                    -- 'winter', 'space', 'nature', 'abstract'
  effect          TEXT,                    -- 'snow', 'rain', 'stars', 'sparkles'
  fetch_duration_ms INTEGER,
  last_viewed_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

**Use Case:** Динамічні фони з детекцією теми та екстракцією кольорів.

### New Columns

**`images` array (news table):**
```sql
ALTER TABLE news ADD COLUMN images TEXT[];
```
Підтримка кількох зображень на пост (Telegram albums).

---

