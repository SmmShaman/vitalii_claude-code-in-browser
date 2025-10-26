-- ============================================
-- VITALII PORTFOLIO - NEWS & BLOG SYSTEM
-- Database Schema for Supabase
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. NEWS SOURCES TABLE
-- Stores RSS feeds and other news sources
-- ============================================
CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_url TEXT,
  source_type TEXT NOT NULL DEFAULT 'rss', -- 'rss', 'telegram', 'web'
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  fetch_interval INTEGER DEFAULT 3600, -- seconds
  last_fetched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 2. NEWS TABLE
-- Stores news articles with translations
-- ============================================
CREATE TABLE IF NOT EXISTS news (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES news_sources(id) ON DELETE CASCADE,

  -- Original content
  original_title TEXT,
  original_content TEXT,
  original_url TEXT UNIQUE,
  image_url TEXT,

  -- English version
  title_en TEXT,
  content_en TEXT,
  description_en TEXT,

  -- Norwegian version
  title_no TEXT,
  content_no TEXT,
  description_no TEXT,

  -- Ukrainian version
  title_ua TEXT,
  content_ua TEXT,
  description_ua TEXT,

  -- Metadata
  tags TEXT[],
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Status flags
  is_rewritten BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  views_count INTEGER DEFAULT 0
);

-- ============================================
-- 3. BLOG POSTS TABLE
-- Stores manually created blog posts
-- ============================================
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID, -- Will link to users table

  -- English version
  title_en TEXT NOT NULL,
  content_en TEXT NOT NULL,
  description_en TEXT,
  slug_en TEXT UNIQUE,

  -- Norwegian version
  title_no TEXT,
  content_no TEXT,
  description_no TEXT,
  slug_no TEXT UNIQUE,

  -- Ukrainian version
  title_ua TEXT,
  content_ua TEXT,
  description_ua TEXT,
  slug_ua TEXT UNIQUE,

  -- Media
  image_url TEXT,
  cover_image_url TEXT,

  -- Metadata
  tags TEXT[],
  category TEXT,
  reading_time INTEGER, -- minutes
  views_count INTEGER DEFAULT 0,

  -- Dates
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Status
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false
);

-- ============================================
-- 4. AI PROMPTS TABLE
-- Stores AI prompts for content rewriting
-- ============================================
CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL DEFAULT 'rewrite', -- 'rewrite', 'translate', 'summarize'
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. USERS TABLE (Admin users)
-- For authentication and authorization
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin', -- 'admin', 'editor', 'viewer'
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 6. TAGS TABLE
-- Centralized tag management
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL,
  name_no TEXT,
  name_ua TEXT,
  slug TEXT UNIQUE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES for better performance
-- ============================================

-- News indexes
CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_source_id ON news(source_id);
CREATE INDEX IF NOT EXISTS idx_news_is_published ON news(is_published);
CREATE INDEX IF NOT EXISTS idx_news_tags ON news USING GIN(tags);

-- Blog posts indexes
CREATE INDEX IF NOT EXISTS idx_blog_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_is_published ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_blog_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_slug_en ON blog_posts(slug_en);

-- News sources indexes
CREATE INDEX IF NOT EXISTS idx_news_sources_is_active ON news_sources(is_active);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public can read published news"
  ON news FOR SELECT
  USING (is_published = true);

CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

CREATE POLICY "Public can read active news sources"
  ON news_sources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Public can read tags"
  ON tags FOR SELECT
  USING (true);

-- Admin access (authenticated users)
CREATE POLICY "Authenticated users can manage news"
  ON news FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage blog posts"
  ON blog_posts FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage sources"
  ON news_sources FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage prompts"
  ON ai_prompts FOR ALL
  USING (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_news_updated_at
  BEFORE UPDATE ON news
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_news_sources_updated_at
  BEFORE UPDATE ON news_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default AI prompt for news rewriting
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type) VALUES (
  'News Rewriter - Multi-language',
  'Rewrites news articles in English, Norwegian, and Ukrainian',
  'You are a professional content rewriter and translator. Rewrite the following news article to avoid plagiarism while preserving the meaning and key facts.

Original Title: {title}
Original Content: {content}
Source URL: {url}

Requirements:
1. Rewrite the content in your own words to avoid plagiarism
2. Keep all important facts and information
3. Make it engaging and professional
4. Translate to English (en), Norwegian (no), and Ukrainian (ua)
5. Create a short description (max 150 characters) for each language
6. Maintain journalistic style

Return ONLY valid JSON in this exact format:
{
  "en": {
    "title": "Rewritten English title",
    "content": "Full rewritten content in English",
    "description": "Short description (max 150 chars)"
  },
  "no": {
    "title": "Norwegian title",
    "content": "Full content in Norwegian",
    "description": "Short description in Norwegian"
  },
  "ua": {
    "title": "Ukrainian title",
    "content": "Full content in Ukrainian",
    "description": "Short description in Ukrainian"
  }
}',
  'rewrite'
);

-- Insert test news sources
INSERT INTO news_sources (name, url, rss_url, source_type, category) VALUES
  ('TechCrunch', 'https://techcrunch.com', 'https://techcrunch.com/feed/', 'rss', 'tech'),
  ('Hacker News', 'https://news.ycombinator.com', 'https://news.ycombinator.com/rss', 'rss', 'tech'),
  ('Perplexity AI Discover', 'https://www.perplexity.ai/discover/tech', NULL, 'web', 'tech'),
  ('Telegram: Digital GPT-4', 'https://t.me/digital_gpt4_neyroseti', NULL, 'telegram', 'ai');

-- ============================================
-- VIEWS for easier querying
-- ============================================

-- Latest published news
CREATE OR REPLACE VIEW latest_news AS
SELECT
  n.id,
  n.title_en,
  n.title_no,
  n.title_ua,
  n.description_en,
  n.description_no,
  n.description_ua,
  n.image_url,
  n.original_url,
  n.tags,
  n.published_at,
  n.views_count,
  ns.name as source_name,
  ns.category as source_category
FROM news n
LEFT JOIN news_sources ns ON n.source_id = ns.id
WHERE n.is_published = true
ORDER BY n.published_at DESC;

-- Latest published blog posts
CREATE OR REPLACE VIEW latest_blog_posts AS
SELECT
  id,
  title_en,
  title_no,
  title_ua,
  description_en,
  description_no,
  description_ua,
  image_url,
  slug_en,
  slug_no,
  slug_ua,
  tags,
  category,
  reading_time,
  published_at,
  views_count,
  is_featured
FROM blog_posts
WHERE is_published = true
ORDER BY published_at DESC;

-- ============================================
-- DONE!
-- Next step: Copy this SQL and run in Supabase SQL Editor
-- ============================================
