-- Migration: Add RSS Article Support
-- This migration adds support for analyzing and publishing RSS articles through Telegram Bot

-- Add new fields to news table for RSS articles
ALTER TABLE news ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'telegram';
COMMENT ON COLUMN news.source_type IS 'Source type: telegram, rss, manual';

ALTER TABLE news ADD COLUMN IF NOT EXISTS rss_analysis JSONB;
COMMENT ON COLUMN news.rss_analysis IS 'AI analysis result for RSS articles (summary, relevance_score, category, key_points)';

ALTER TABLE news ADD COLUMN IF NOT EXISTS rss_source_url TEXT;
COMMENT ON COLUMN news.rss_source_url IS 'Original article URL for RSS sources';

-- Add index for efficient filtering by source_type
CREATE INDEX IF NOT EXISTS idx_news_source_type ON news(source_type);

-- Insert RSS Article Analysis prompt
INSERT INTO ai_prompts (name, prompt_type, prompt_text, is_active, usage_count)
VALUES (
  'RSS Article Analysis',
  'rss_article_analysis',
  'Ти експерт з аналізу новин. Проаналізуй цю статтю та поверни JSON:

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
  "skip_reason": "причина якщо recommended_action = skip"
}

Критерії оцінки relevance_score:
- 8-10: Важливі tech новини, AI, бізнес в Норвегії, стартапи
- 5-7: Загальні tech/business новини
- 1-4: Не релевантний контент, реклама, занадто вузька тема

recommended_action:
- "publish": relevance_score >= 6
- "needs_review": relevance_score 4-5
- "skip": relevance_score < 4 або реклама/спам',
  true,
  0
)
ON CONFLICT DO NOTHING;

-- Insert RSS News Summary Rewrite prompt (Summary style, not full rewrite)
INSERT INTO ai_prompts (name, prompt_type, prompt_text, is_active, usage_count)
VALUES (
  'RSS News Summary Rewrite',
  'rss_news_rewrite',
  'Ти професійний редактор новин. Створи короткий інформаційний огляд статті.

Оригінальний заголовок: {title}
Оригінальний контент: {content}
URL джерела: {url}

ВАЖЛИВО:
1. Напиши 3-4 абзаци (150-200 слів) про основну суть
2. Виділи 2-3 ключові факти
3. Не копіюй текст оригіналу - перекажи своїми словами
4. Стиль: нейтральний, інформаційний
5. НЕ додавай посилання на джерело в контент - воно буде додано автоматично

Поверни ТІЛЬКИ валідний JSON з такою структурою:
{
  "en": { "title": "English title", "content": "English content (3-4 paragraphs)", "description": "1-2 sentence summary" },
  "no": { "title": "Norwegian bokmål title", "content": "Norwegian content (3-4 paragraphs)", "description": "1-2 sentence summary" },
  "ua": { "title": "Ukrainian title", "content": "Ukrainian content (3-4 paragraphs)", "description": "1-2 sentence summary" },
  "tags": ["tag1", "tag2", "tag3"]
}

Використовуй Norwegian bokmål (не nynorsk).
Контент має бути унікальним для кожної мови, не просто переклад.',
  true,
  0
)
ON CONFLICT DO NOTHING;
