-- Migration: Add professional image prompt templates based on awesome-nanobanana-pro methodology
-- Date: 2026-01-22
-- Purpose: Replace creative AI generation with structured template-based approach
-- Repo reference: https://github.com/ZeroLu/awesome-nanobanana-pro

-- ============================================================================
-- STEP 1: IMAGE CLASSIFIER PROMPT
-- Extracts structured data from article (company, features, category, visual elements)
-- ============================================================================

INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '🔍 Image Prompt Classifier',
  'Extracts structured data from article for image generation. Returns JSON with company, category, visual elements.',
  'Analyze this article and extract structured data for infographic image generation.

ARTICLE:
Title: {title}
Content: {content}

EXTRACT THE FOLLOWING (respond ONLY with valid JSON, no markdown):
{
  "company_name": "exact company/product name mentioned (e.g. Higgsfield, Icelandair, OpenAI)",
  "company_domain": "website domain if mentioned (e.g. higgsfield.ai, icelandair.com)",
  "category": "one of: tech_product | marketing_campaign | ai_research | business_news | science | lifestyle | general",
  "product_type": "what is it (e.g. AI Platform, Airline, Software, Service)",
  "key_features": ["feature1", "feature2", "feature3"],
  "visual_elements": ["concrete visual object 1", "concrete visual object 2", "concrete visual object 3"],
  "visual_concept": "one sentence describing the main visual idea",
  "color_scheme": "suggested colors based on brand/topic (e.g. electric blue, corporate navy)",
  "style_hint": "visual style suggestion (e.g. tech infographic, travel poster, scientific diagram)"
}

RULES:
- company_name: Extract EXACT name, not description
- key_features: List 3-5 specific features/benefits from the article
- visual_elements: List CONCRETE objects that can be visualized (not abstract concepts)
- visual_concept: Describe what the image should show in ONE sentence
- Be factual, do not invent information not in the article',
  'image_classifier',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 2: CATEGORY-SPECIFIC TEMPLATES
-- Based on awesome-nanobanana-pro structure with adaptations for news content
-- ============================================================================

-- Template: Tech Product / SaaS Platform (like Higgsfield, HeyGen, etc.)
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '🖥️ Tech Product Infographic Template',
  'Template for tech/SaaS product announcements. Shows product interface, features, logo.',
  'Professional tech infographic poster with EXACT text and branding.

HEADER:
- Logo: Bold modern wordmark "{company_name}" in white uppercase sans-serif font (Inter Black style)
- Tagline: "{product_type}" in lighter weight below logo

CENTRAL VISUAL:
{visual_concept}
- Show {visual_elements} as concrete 3D rendered elements
- Include floating UI panels with feature indicators

INFO BLOCKS (grid layout):
Left column - FEATURES:
{key_features_formatted}

Right column - WORKFLOW/BENEFITS:
- Step-by-step visual flow if applicable
- Key statistics or capabilities

BOTTOM BAR:
- Website: "{company_domain}" in accent color
- Badge: Key differentiator or tagline

STYLE:
- Dark mode: Background #0B1120
- Primary accent: {color_primary}
- Secondary: {color_secondary}
- Clean tech aesthetic like Vercel/Linear marketing
- 4:5 aspect ratio for social media

CRITICAL: Render all text EXACTLY as specified. The word "{company_name}" must be perfectly legible and spelled correctly. Use clean typography with no distortions.',
  'image_template_tech_product',
  true
)
ON CONFLICT DO NOTHING;

-- Template: Marketing Campaign (like Icelandair, brand activations)
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '📢 Marketing Campaign Poster Template',
  'Template for marketing campaigns, brand activations, promotional events.',
  'Professional marketing campaign poster with brand identity.

HEADER:
- Logo: "{company_name}" brand wordmark prominently displayed
- Campaign tagline or event name below

CENTRAL VISUAL:
{visual_concept}
- Main visual elements: {visual_elements}
- Human silhouettes or figures for scale and engagement
- Dynamic composition with visual tension/contrast

CAMPAIGN INFO:
- Key message or question that creates curiosity
- Location/event details if applicable
- Call-to-action: "{cta_text}"

VISUAL STORYTELLING:
- Split-screen or comparison layout if relevant
- Before/after or real/digital contrast if applicable
- Emotional hook through composition

STYLE:
- Color palette: {color_scheme}
- Premium advertising aesthetic
- National Geographic meets modern brand campaign
- High contrast, attention-grabbing
- 4:5 aspect ratio

BOTTOM:
- Website URL: "{company_domain}"
- Brand logo repeated smaller
- Event date/location badge if applicable

CRITICAL: "{company_name}" logo must be perfectly legible. Create visual that makes viewers stop scrolling.',
  'image_template_marketing_campaign',
  true
)
ON CONFLICT DO NOTHING;

-- Template: AI Research / Technology Announcement
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '🤖 AI Research Infographic Template',
  'Template for AI research announcements, model releases, technology breakthroughs.',
  'Professional AI/ML research announcement infographic.

HEADER:
- Organization/Company: "{company_name}" logo or wordmark
- Research title or model name prominently displayed

CENTRAL VISUAL:
{visual_concept}
- Abstract but meaningful visualization of the AI concept
- Neural network patterns, data flows, or model architecture
- Visual elements: {visual_elements}

TECHNICAL INFO PANEL:
- Key capabilities: {key_features_formatted}
- Performance metrics or benchmarks if mentioned
- Model specifications or parameters

COMPARISON/CONTEXT:
- Before/after visualization if applicable
- Comparison with previous technology
- Real-world application examples

STYLE:
- Dark gradient background (#0a0a1a to #1a1a2e)
- Accent colors: Electric cyan #00E5FF, AI purple #7C3AED
- Scientific visualization aesthetic
- Clean data presentation like research papers
- Futuristic but professional

BOTTOM:
- Source: "{company_domain}"
- Publication date
- "Research" or "Announcement" badge

CRITICAL: All text must be perfectly legible. Scientific accuracy in visual representation.',
  'image_template_ai_research',
  true
)
ON CONFLICT DO NOTHING;

-- Template: Business News / Corporate Announcement
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '📊 Business News Infographic Template',
  'Template for business news, corporate announcements, industry reports.',
  'Professional business news infographic with corporate aesthetic.

HEADER:
- Company: "{company_name}" corporate logo
- Headline summarizing the news

CENTRAL VISUAL:
{visual_concept}
- Business-appropriate imagery: {visual_elements}
- Charts, graphs, or data visualization if relevant
- Corporate photography style elements

KEY POINTS:
- Bullet points with key facts: {key_features_formatted}
- Financial figures or statistics if mentioned
- Timeline or milestone markers if applicable

CONTEXT PANEL:
- Industry context or market position
- Competitive landscape hints
- Future implications

STYLE:
- Clean white or light gray background
- Corporate blue (#0066CC) and professional accents
- Bloomberg/Financial Times aesthetic
- Serif headlines, sans-serif body
- Professional and trustworthy

BOTTOM:
- Source attribution
- Date stamp
- "{company_domain}" reference

CRITICAL: Professional, credible appearance. "{company_name}" must be exact.',
  'image_template_business_news',
  true
)
ON CONFLICT DO NOTHING;

-- Template: Science / Education Content
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '🔬 Science Education Infographic Template',
  'Template for scientific discoveries, educational content, research findings.',
  'Educational science infographic with clear visual explanations.

HEADER:
- Topic or discovery name prominently displayed
- Institution/Source: "{company_name}" if applicable

CENTRAL VISUAL:
{visual_concept}
- Scientific illustration style
- Visual elements: {visual_elements}
- Diagram or process visualization
- Labels and annotations for clarity

EXPLANATION PANELS:
- Step-by-step breakdown if process-based
- Key findings: {key_features_formatted}
- "Did you know?" facts or statistics

VISUAL AIDS:
- Numbered steps or sequence
- Comparison scales
- Microscopic or macroscopic context
- Cross-sections or cutaway views if relevant

STYLE:
- Clean educational aesthetic
- White/cream background with color accents
- Nature/Science magazine quality
- Infographic icons and visual metaphors
- Accessible to general audience

BOTTOM:
- Source: "{company_domain}" or research institution
- "Learn more" call-to-action
- Credit line

CRITICAL: Educational clarity is paramount. Complex concepts made visually simple.',
  'image_template_science',
  true
)
ON CONFLICT DO NOTHING;

-- Template: Lifestyle / Culture / Travel
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '✨ Lifestyle Culture Poster Template',
  'Template for lifestyle, culture, travel, entertainment content.',
  'Engaging lifestyle/culture poster with emotional appeal.

HEADER:
- Brand/Event: "{company_name}" stylized
- Catchy headline or tagline

CENTRAL VISUAL:
{visual_concept}
- Aspirational lifestyle imagery
- Visual elements: {visual_elements}
- Human connection and emotion
- Beautiful composition with depth

ATMOSPHERE:
- Mood-setting through lighting and color
- Texture and detail that invites exploration
- Story-telling through visual narrative

INFO OVERLAY:
- Key highlights: {key_features_formatted}
- Location or event details
- Experience description

STYLE:
- Color palette: {color_scheme}
- Magazine editorial quality
- Condé Nast Traveler / Vogue aesthetic
- Rich colors, beautiful typography
- Inspirational and aspirational

BOTTOM:
- Call-to-action
- "{company_domain}" subtle placement
- Social sharing prompt

CRITICAL: Emotional resonance is key. Create desire and curiosity.',
  'image_template_lifestyle',
  true
)
ON CONFLICT DO NOTHING;

-- Template: General News (fallback)
INSERT INTO ai_prompts (name, description, prompt_text, prompt_type, is_active)
VALUES (
  '📰 General News Infographic Template',
  'Universal fallback template for any news type.',
  'Clean, professional news infographic.

HEADER:
- Main subject: "{company_name}" or topic name
- News headline in bold

CENTRAL VISUAL:
{visual_concept}
- Key visual elements: {visual_elements}
- Clear focal point
- Supporting imagery around main subject

KEY INFORMATION:
- Main points: {key_features_formatted}
- Context and background
- Why it matters

STRUCTURE:
- Clear visual hierarchy
- Easy-to-scan layout
- Icons for quick understanding

STYLE:
- Professional news aesthetic
- Neutral background (white or dark gray)
- Accent color based on topic: {color_primary}
- Modern sans-serif typography
- AP/Reuters quality standard

BOTTOM:
- Source reference
- Date
- "{company_domain}" if applicable

CRITICAL: Clarity and professionalism. All text perfectly legible.',
  'image_template_general',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: UPDATE EXISTING image_generation PROMPT
-- Keep it but mark as legacy, new system uses classifier + templates
-- ============================================================================

UPDATE ai_prompts
SET
  name = '🎨 [LEGACY] Creative Image Description',
  description = 'Legacy creative prompt. New system uses classifier + templates for professional infographics.',
  is_active = false
WHERE prompt_type = 'image_generation';

-- Add comment for documentation
COMMENT ON TABLE ai_prompts IS 'AI prompts for various purposes. Image generation now uses two-step process: image_classifier extracts data, then image_template_* generates structured prompt.';
