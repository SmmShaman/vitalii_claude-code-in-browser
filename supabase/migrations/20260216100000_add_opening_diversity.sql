-- Migration: Add opening diversity rules to AI prompts
-- Date: 2026-02-16
-- Purpose: Prevent repetitive openings ("А ви знаєте:", "Did you know", etc.)
-- Appends anti-repetition rules to existing prompt text (does NOT replace)

-- Update news_rewrite prompt (RSS news)
UPDATE ai_prompts
SET prompt_text = prompt_text || '

OPENING DIVERSITY (CRITICAL):
- ЗАБОРОНЕНО починати з: "А ви знаєте", "Чи знали ви", "Виявляється", "Цікаво що"
- FORBIDDEN openings: "Did you know", "It turns out", "Have you ever wondered", "Interestingly"
- FORBUDT: "Visste du", "Det viser seg", "Har du noen gang lurt på"
- Each article MUST start differently. Follow the OPENING STYLE DIRECTIVE appended below.',
    updated_at = now()
WHERE prompt_type = 'news_rewrite' AND is_active = true;

-- Update telegram_news_rewrite prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

OPENING DIVERSITY (CRITICAL):
- ЗАБОРОНЕНО починати з: "А ви знаєте", "Чи знали ви", "Виявляється", "Цікаво що"
- FORBIDDEN openings: "Did you know", "It turns out", "Have you ever wondered", "Interestingly"
- FORBUDT: "Visste du", "Det viser seg", "Har du noen gang lurt på"
- Each article MUST start differently. Follow the OPENING STYLE DIRECTIVE appended below.',
    updated_at = now()
WHERE prompt_type = 'telegram_news_rewrite' AND is_active = true;

-- Update blog_rewrite prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

OPENING DIVERSITY (CRITICAL):
- ЗАБОРОНЕНО: "А ви знаєте", "Чи знали ви", "Виявляється", "Цікаво що"
- FORBIDDEN: "Did you know", "It turns out", "Have you ever wondered"
- FORBUDT: "Visste du", "Det viser seg"
- NEVER use formulaic question openings across any language
- Follow the OPENING STYLE DIRECTIVE appended below for this specific article.',
    updated_at = now()
WHERE prompt_type = 'blog_rewrite' AND is_active = true;

-- Update social_teaser_linkedin prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

ЗАБОРОНЕНІ ПОЧАТКИ (всі мови): "А ви знаєте", "Виявляється", "Чи знали ви", "Did you know", "Visste du", "It turns out", "Det viser seg"
Дотримуйся OPENING STYLE DIRECTIVE нижче — вона вказує конкретний стиль початку для цього посту!',
    updated_at = now()
WHERE prompt_type = 'social_teaser_linkedin' AND is_active = true;

-- Update social_teaser_facebook prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

ЗАБОРОНЕНІ ПОЧАТКИ (всі мови): "А ви знаєте", "Виявляється", "Чи знали ви", "Did you know", "Visste du", "It turns out", "Det viser seg"
Дотримуйся OPENING STYLE DIRECTIVE нижче — вона вказує конкретний стиль початку для цього посту!',
    updated_at = now()
WHERE prompt_type = 'social_teaser_facebook' AND is_active = true;

-- Update social_teaser_instagram prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

ЗАБОРОНЕНІ ПОЧАТКИ (всі мови): "А ви знаєте", "Виявляється", "Чи знали ви", "Did you know", "Visste du", "It turns out", "Det viser seg"
Дотримуйся OPENING STYLE DIRECTIVE нижче — вона вказує конкретний стиль початку для цього посту!',
    updated_at = now()
WHERE prompt_type = 'social_teaser_instagram' AND is_active = true;

-- Update social_teaser_twitter prompt
UPDATE ai_prompts
SET prompt_text = prompt_text || '

ЗАБОРОНЕНІ ПОЧАТКИ (всі мови): "А ви знаєте", "Виявляється", "Чи знали ви", "Did you know", "Visste du", "It turns out", "Det viser seg"
Дотримуйся OPENING STYLE DIRECTIVE нижче — вона вказує конкретний стиль початку для цього посту!',
    updated_at = now()
WHERE prompt_type = 'social_teaser_twitter' AND is_active = true;
