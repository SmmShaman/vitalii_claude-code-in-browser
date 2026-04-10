-- Portfolio Features table
-- Stores portfolio feature data for AI-powered custom video generation
-- Seeded from data/portfolioFeatures.ts via scripts/seed-portfolio-features.js

CREATE TABLE IF NOT EXISTS portfolio_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT UNIQUE NOT NULL,
  project_id TEXT DEFAULT 'portfolio',
  category TEXT NOT NULL,

  -- Multilingual content
  title_en TEXT,
  title_no TEXT,
  title_ua TEXT,

  short_description_en TEXT,
  short_description_no TEXT,
  short_description_ua TEXT,

  problem_en TEXT,
  problem_no TEXT,
  problem_ua TEXT,

  solution_en TEXT,
  solution_no TEXT,
  solution_ua TEXT,

  result_en TEXT,
  result_no TEXT,
  result_ua TEXT,

  -- Metadata
  tech_stack TEXT[] DEFAULT '{}',
  hashtags TEXT[] DEFAULT '{}',

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category-based queries
CREATE INDEX IF NOT EXISTS idx_portfolio_features_category ON portfolio_features (category);
CREATE INDEX IF NOT EXISTS idx_portfolio_features_active ON portfolio_features (is_active) WHERE is_active = true;
