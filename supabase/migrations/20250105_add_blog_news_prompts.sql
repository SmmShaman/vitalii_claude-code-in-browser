-- Add AI prompts for news and blog rewriting
-- These prompts can be edited via admin panel

-- News rewrite prompt (objective journalistic style)
INSERT INTO ai_prompts (
  name,
  prompt_type,
  prompt_text,
  description,
  is_active,
  usage_count
) VALUES (
  'News Article Rewriter',
  'news_rewrite',
  'You are a professional news editor. Please rewrite the following news content in an objective, factual, and engaging journalistic style.

Original Title: {title}

Original Content:
{content}

Source URL: {url}

Instructions:
- Maintain factual accuracy
- Use clear, concise language
- Follow AP/Reuters style guidelines
- Make it engaging for readers
- Keep important details and context
- Remove any promotional language
- Ensure proper grammar and spelling',
  'Rewrites news content in professional journalistic style',
  true,
  0
) ON CONFLICT DO NOTHING;

-- Blog post rewrite prompt (first-person perspective)
INSERT INTO ai_prompts (
  name,
  prompt_type,
  prompt_text,
  description,
  is_active,
  usage_count
) VALUES (
  'Blog Post Writer',
  'blog_rewrite',
  'You are a professional tech blogger sharing insights and experiences. Please rewrite the following content as a personal blog post from the first-person perspective.

Original Title: {title}

Original Content:
{content}

Source: {url}

Instructions:
- Write from first-person perspective ("I discovered...", "In my experience...", "I found this interesting...")
- Make it conversational and engaging
- Share personal insights and observations
- Keep it authentic and relatable
- Include practical takeaways or lessons
- Maintain technical accuracy while being accessible
- Show enthusiasm about the topic
- Add context about why this matters to readers',
  'Rewrites content as personal blog post from first-person perspective',
  true,
  0
) ON CONFLICT DO NOTHING;
