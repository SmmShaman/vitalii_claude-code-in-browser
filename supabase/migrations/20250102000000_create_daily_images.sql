-- Create table for daily images cache
CREATE TABLE IF NOT EXISTS daily_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source TEXT NOT NULL, -- 'bing', 'nasa', 'unsplash'
  copyright TEXT,

  -- Color analysis data
  colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: { "vibrant": "#FF5733", "darkVibrant": "#C70039", "lightVibrant": "#FFC300", "muted": "#DAF7A6", "darkMuted": "#581845", "lightMuted": "#C5E1A5" }

  -- Theme detection
  theme TEXT, -- 'winter', 'space', 'nature', 'abstract', etc.
  effect TEXT, -- 'snow', 'rain', 'stars', 'sparkles', 'particles'

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Performance tracking
  fetch_duration_ms INTEGER,
  last_viewed_at TIMESTAMPTZ
);

-- Index for quick date lookups
CREATE INDEX IF NOT EXISTS idx_daily_images_date ON daily_images(date DESC);

-- Index for source queries
CREATE INDEX IF NOT EXISTS idx_daily_images_source ON daily_images(source);

-- Enable Row Level Security
ALTER TABLE daily_images ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access
CREATE POLICY "Allow public read access on daily_images"
  ON daily_images
  FOR SELECT
  TO public
  USING (true);

-- Policy: Allow service role to insert/update
CREATE POLICY "Allow service role to manage daily_images"
  ON daily_images
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER daily_images_updated_at
  BEFORE UPDATE ON daily_images
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_images_updated_at();

-- Comments for documentation
COMMENT ON TABLE daily_images IS 'Stores daily images from various APIs with color analysis and theme detection';
COMMENT ON COLUMN daily_images.colors IS 'JSON object containing color palette from Vibrant.js analysis';
COMMENT ON COLUMN daily_images.theme IS 'Detected theme based on image analysis (winter, space, nature, etc.)';
COMMENT ON COLUMN daily_images.effect IS 'Visual effect to apply (snow, rain, stars, sparkles, particles)';
