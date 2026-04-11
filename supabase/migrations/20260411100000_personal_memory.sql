-- Personal memory system for video generation context
-- Stores structured personal data that gets auto-included in AI prompts

CREATE TABLE IF NOT EXISTS personal_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- profile, family, work, dreams, events, preferences, values, context
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personal_memory_category ON personal_memory(category);
CREATE INDEX IF NOT EXISTS idx_personal_memory_active ON personal_memory(is_active);

-- Seed initial personal context
INSERT INTO personal_memory (category, title, content, sort_order) VALUES
  ('profile', 'Basic Profile', 'Vitalii Berbeha (Віталій Берbeга), based in Bergen, Norway. Ukrainian-born entrepreneur, marketer, and full-stack developer. 20+ years of experience in marketing and analytics. Builds products with code. Fluent in Ukrainian, English, and Norwegian.', 1),
  ('family', 'Family', 'Family is central to everything. Wife and children. Values quality time, education, and shared experiences. Making decisions always considering family impact.', 2),
  ('work', 'Professional', 'Creator of Elvarika (language learning platform), Portfolio & News Platform (vitalii.no), JobBot Norway, and 6+ other projects. Specializes in AI automation, content pipelines, Telegram bots, and modern web development. Tech stack: React, TypeScript, Next.js, Supabase, Deno, Remotion, Claude AI, Gemini.', 3),
  ('dreams', 'Dreams & Aspirations', 'Dreams of living near the ocean with family. Wants to travel the world while building useful products. Believes in combining technology with personal freedom. Aspires to create tools that help others learn and grow.', 4),
  ('events', 'Key Life Events', 'Moved to Norway for new opportunities. Built multiple startups and SaaS products. Created an AI-powered content automation system that processes 50+ articles daily across 3 languages.', 5),
  ('preferences', 'Preferences & Style', 'Loves minimalism, clean design, ocean views, and efficient code. Prefers practical solutions over theoretical ones. Enjoys photography, travel, and exploring new technologies. Communication style: direct, honest, with humor.', 6),
  ('values', 'Core Values', 'Family first. Freedom and independence. Creating value for others. Continuous learning. Work-life balance. Authenticity — never pretending to be someone else.', 7),
  ('context', 'Video Context', 'Blog vitalii.no is personal — all videos are first-person narrative by Vitalii. Videos should feel authentic and personal, not corporate. Use real experiences and specific details. Mention family when relevant. Always genuine, never AI-generic.', 8)
ON CONFLICT DO NOTHING;
