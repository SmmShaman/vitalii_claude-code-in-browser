-- Normalize all existing tags to lowercase and deduplicate
-- news table
UPDATE news
SET tags = (
  SELECT ARRAY(SELECT DISTINCT LOWER(t) FROM unnest(tags) AS t ORDER BY LOWER(t))
)
WHERE tags IS NOT NULL;

-- blog_posts table
UPDATE blog_posts
SET tags = (
  SELECT ARRAY(SELECT DISTINCT LOWER(t) FROM unnest(tags) AS t ORDER BY LOWER(t))
)
WHERE tags IS NOT NULL;

-- Trigger function to auto-normalize tags on insert/update
CREATE OR REPLACE FUNCTION normalize_tags_lowercase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tags IS NOT NULL THEN
    NEW.tags := (
      SELECT ARRAY(SELECT DISTINCT LOWER(t) FROM unnest(NEW.tags) AS t ORDER BY LOWER(t))
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to news table
DROP TRIGGER IF EXISTS trg_normalize_tags_news ON news;
CREATE TRIGGER trg_normalize_tags_news
  BEFORE INSERT OR UPDATE OF tags ON news
  FOR EACH ROW
  EXECUTE FUNCTION normalize_tags_lowercase();

-- Apply trigger to blog_posts table
DROP TRIGGER IF EXISTS trg_normalize_tags_blog ON blog_posts;
CREATE TRIGGER trg_normalize_tags_blog
  BEFORE INSERT OR UPDATE OF tags ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION normalize_tags_lowercase();
