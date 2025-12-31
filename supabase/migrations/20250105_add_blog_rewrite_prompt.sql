-- Add Blog Rewrite Prompt
-- This prompt rewrites content from first-person perspective for blog posts

INSERT INTO ai_prompts (
  name,
  prompt_type,
  prompt_text,
  description,
  is_active,
  usage_count
) VALUES (
  'Blog Post Writer - Personal Perspective',
  'blog_rewrite',
  'You are a professional tech blogger sharing insights and experiences. Rewrite the following content as a personal blog post from the first-person perspective.

Original Title: {title}

Original Content:
{content}

Source: {url}

Instructions:
1. Write from first-person perspective ("I discovered...", "In my experience...", "I found this interesting...")
2. Make it conversational and engaging
3. Share personal insights and observations
4. Keep it authentic and relatable
5. Include practical takeaways or lessons
6. Maintain technical accuracy while being accessible
7. Show enthusiasm about the topic
8. Add context about why this matters to readers
9. Translate to English (en), Norwegian (no), and Ukrainian (ua)
10. Create a short description (max 150 characters) for each language

Return ONLY valid JSON in this exact format:
{
  "en": {
    "title": "Engaging blog post title in English",
    "content": "Full blog post content in English from first-person perspective",
    "description": "Short description (max 150 chars)"
  },
  "no": {
    "title": "Norwegian blog post title",
    "content": "Full blog content in Norwegian from first-person perspective",
    "description": "Short description in Norwegian"
  },
  "ua": {
    "title": "Ukrainian blog post title",
    "content": "Full blog content in Ukrainian from first-person perspective",
    "description": "Short description in Ukrainian"
  }
}',
  'Rewrites content as personal blog post from first-person perspective',
  true,
  0
) ON CONFLICT DO NOTHING;
