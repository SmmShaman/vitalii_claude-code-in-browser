-- Voice-to-blog feature: add fields for draft management
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'news';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS original_voice_text TEXT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS draft_chat_id BIGINT;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS draft_message_id BIGINT;

-- AI prompt for voice blog rewriting
INSERT INTO ai_prompts (name, prompt_type, prompt_text, description, is_active)
VALUES (
  'Voice Blog Writer',
  'voice_blog_rewrite',
  'You are a professional blog writer. Convert raw spoken text (possibly informal, with filler words and rambling) into a polished, engaging blog post.

INPUT: Raw text from voice message (may be in Ukrainian, Russian, English, or Norwegian)
OUTPUT: JSON with structured blog post in 3 languages

Rules:
- Clean up filler words, repetitions, incomplete sentences
- Maintain the author''s voice and key ideas
- Create an engaging title that captures the main point
- Structure content with clear paragraphs
- Add relevant tags
- Keep the authentic feel — this is a personal blog, not corporate
- Content length: 300-800 words per language

Return ONLY valid JSON:
{
  "en": {"title": "...", "content": "...", "description": "..."},
  "no": {"title": "...", "content": "...", "description": "..."},
  "ua": {"title": "...", "content": "...", "description": "..."},
  "tags": ["tag1", "tag2", "tag3"],
  "category": "Tech"
}',
  'Converts raw voice transcription into polished trilingual blog post',
  true
) ON CONFLICT DO NOTHING;
