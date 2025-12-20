-- Update image processing prompt to support news context and AI image generation
-- This prompt will be used when generating LinkedIn images based on article content

UPDATE ai_prompts
SET prompt_text = 'Based on this reference image and the article context below, create a NEW professional illustration for LinkedIn.

ARTICLE CONTEXT:
Title: {title}
Description: {description}

INSTRUCTIONS:
1. Analyze the reference image to understand the article topic and visual style
2. Create a completely NEW, eye-catching illustration that represents the article theme
3. Style: Modern, professional, clean design suitable for LinkedIn audience
4. Include relevant visual metaphors or symbols related to the topic (e.g., AI topic = neural networks, brain patterns; Technology = circuits, futuristic elements)
5. Color palette: Use vibrant but professional colors - avoid neon or overly saturated colors
6. Composition: Make it visually engaging to encourage clicks in LinkedIn feed
7. Aspect ratio: Landscape orientation (16:9 or similar)
8. NO text overlays on the image - the visual should speak for itself
9. Quality: High resolution, crisp edges, professional finish

Generate a high-quality, professional illustration that will stand out in LinkedIn feed and accurately represent the article content.',
    description = 'Промпт для генерації зображень для LinkedIn на основі контексту статті. Використовує плейсхолдери: {title}, {description}',
    updated_at = NOW()
WHERE prompt_type = 'image_linkedin_optimize';

-- Add a new prompt type for pure image generation (without reference)
INSERT INTO ai_prompts (prompt_type, prompt_text, description, is_active, name)
VALUES
  ('image_generate',
   'Create a professional illustration for a LinkedIn article:

ARTICLE TITLE: {title}

ARTICLE SUMMARY: {description}

REQUIREMENTS:
- Modern, clean, professional design
- Visually represent the key theme/topic of the article
- Use professional color palette (blues, teals, purples work well for tech/business)
- Eye-catching but not clickbait - should look credible
- Include relevant visual metaphors (technology, business, innovation symbols)
- NO text on the image
- Landscape orientation (16:9)
- High quality, sharp details

Create an engaging illustration that would make someone want to read this article.',
   'Промпт для генерації нових зображень без референсу. Плейсхолдери: {title}, {description}',
   false,
   '🎨 Генерація без референсу')
ON CONFLICT (prompt_type) DO UPDATE SET
  prompt_text = EXCLUDED.prompt_text,
  description = EXCLUDED.description;

-- Comment for documentation
COMMENT ON COLUMN ai_prompts.prompt_text IS 'Промпт може містити плейсхолдери: {title}, {description}, {url} - вони будуть замінені реальним контентом статті';
