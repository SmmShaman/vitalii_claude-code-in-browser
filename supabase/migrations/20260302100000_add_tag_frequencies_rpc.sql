-- RPC function to count tag frequencies from actual article data
CREATE OR REPLACE FUNCTION get_tag_frequencies(content_type text DEFAULT 'all')
RETURNS TABLE(tag_name text, article_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF content_type = 'news' THEN
    RETURN QUERY
      SELECT LOWER(unnest(n.tags)) AS tag_name, COUNT(*) AS article_count
      FROM news n
      WHERE n.is_published = true AND n.tags IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC, 1 ASC;
  ELSIF content_type = 'blog' THEN
    RETURN QUERY
      SELECT LOWER(unnest(bp.tags)) AS tag_name, COUNT(*) AS article_count
      FROM blog_posts bp
      WHERE bp.is_published = true AND bp.tags IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC, 1 ASC;
  ELSE
    RETURN QUERY
      SELECT combined.t AS tag_name, SUM(combined.c)::bigint AS article_count
      FROM (
        SELECT LOWER(unnest(n.tags)) AS t, COUNT(*) AS c
        FROM news n
        WHERE n.is_published = true AND n.tags IS NOT NULL
        GROUP BY 1
        UNION ALL
        SELECT LOWER(unnest(bp.tags)) AS t, COUNT(*) AS c
        FROM blog_posts bp
        WHERE bp.is_published = true AND bp.tags IS NOT NULL
        GROUP BY 1
      ) combined
      GROUP BY 1
      ORDER BY 2 DESC, 1 ASC;
  END IF;
END;
$$;
