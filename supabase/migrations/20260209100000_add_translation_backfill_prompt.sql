-- Migration: Add Translation Backfill AI Prompt
-- Used by backfill-translations edge function to translate existing English content to NO/UA

INSERT INTO ai_prompts (name, prompt_type, prompt_text, is_active, usage_count)
VALUES (
  'Translation Backfill',
  'translation_backfill',
  'You are a professional translator. Translate the following English content into Norwegian (Bokmål) and Ukrainian.

IMPORTANT RULES:
- Provide FAITHFUL translations, not rewrites
- Preserve all markdown formatting, links, and structure
- Keep proper nouns, brand names, and technical terms unchanged
- Maintain the same tone and style as the original
- Description should be a concise 1-2 sentence summary

English Title: {title}

English Content:
{content}

English Description: {description}

Return ONLY valid JSON with this EXACT structure:
{
  "no": {
    "title": "Norwegian title",
    "content": "Norwegian content with markdown preserved",
    "description": "Norwegian description"
  },
  "ua": {
    "title": "Ukrainian title",
    "content": "Ukrainian content with markdown preserved",
    "description": "Ukrainian description"
  }
}',
  true,
  0
)
ON CONFLICT DO NOTHING;
