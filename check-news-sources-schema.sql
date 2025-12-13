-- Check news_sources table schema
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'news_sources';

-- Also show current sources
SELECT * FROM news_sources;
