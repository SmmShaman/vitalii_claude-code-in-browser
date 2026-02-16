-- Migration: Add Norway Detection for Auto-Publish
-- When auto-publishing, Norway-related articles will be published in Norwegian only

-- Add is_norway_related column to news table
ALTER TABLE news ADD COLUMN IF NOT EXISTS is_norway_related BOOLEAN DEFAULT false;
COMMENT ON COLUMN news.is_norway_related IS 'Whether article is related to Norway (auto-detected by AI analysis, domain, or keywords)';

-- Index for filtering Norway-related articles
CREATE INDEX IF NOT EXISTS idx_news_norway_related ON news(is_norway_related) WHERE is_norway_related = true;

-- Update rss_article_analysis prompt to include is_norway_related field
UPDATE ai_prompts
SET prompt_text = 'Ти експерт з аналізу новин. Проаналізуй цю статтю та поверни JSON:

Заголовок: {title}
Контент: {content}
URL: {url}

Проаналізуй та поверни ТІЛЬКИ валідний JSON:
{
  "summary": "2-3 речення українською про основну суть статті",
  "relevance_score": число від 1 до 10 (10 = дуже релевантна для tech/business аудиторії),
  "category": "tech_product|marketing_campaign|ai_research|business_news|science|lifestyle|other",
  "key_points": ["ключовий факт 1", "ключовий факт 2", "ключовий факт 3"],
  "recommended_action": "publish|skip|needs_review",
  "skip_reason": "причина якщо recommended_action = skip",
  "is_norway_related": true або false
}

Критерії оцінки relevance_score:
- 8-10: Важливі tech новини, AI, бізнес в Норвегії, стартапи
- 5-7: Загальні tech/business новини
- 1-4: Не релевантний контент, реклама, занадто вузька тема

recommended_action:
- "publish": relevance_score >= 6
- "needs_review": relevance_score 4-5
- "skip": relevance_score < 4 або реклама/спам

is_norway_related:
- true: стаття стосується Норвегії — норвезькі компанії, стартапи, люди, уряд, закони, податки, міста (Oslo, Bergen, Trondheim, Stavanger тощо), регіони, або бізнес безпосередньо пов''язаний з Норвегією
- false: загальні міжнародні новини без прямого зв''язку з Норвегією',
  updated_at = NOW()
WHERE prompt_type = 'rss_article_analysis'
  AND is_active = true;
