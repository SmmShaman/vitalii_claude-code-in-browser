-- Add SEO slug fields to news table
-- These fields will be used for creating SEO-friendly URLs like /news/my-article-title

ALTER TABLE news
ADD COLUMN IF NOT EXISTS slug_en TEXT,
ADD COLUMN IF NOT EXISTS slug_no TEXT,
ADD COLUMN IF NOT EXISTS slug_ua TEXT;

-- Create unique indexes on slug fields to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS news_slug_en_idx ON news(slug_en) WHERE slug_en IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS news_slug_no_idx ON news(slug_no) WHERE slug_no IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS news_slug_ua_idx ON news(slug_ua) WHERE slug_ua IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN news.slug_en IS 'SEO-friendly URL slug in English (e.g., "my-article-title")';
COMMENT ON COLUMN news.slug_no IS 'SEO-friendly URL slug in Norwegian (e.g., "min-artikkel-tittel")';
COMMENT ON COLUMN news.slug_ua IS 'SEO-friendly URL slug in Ukrainian (e.g., "moya-stattya")';
