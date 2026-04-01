import fs from 'fs';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const SYSTEM_PROMPT = `You are a creative copywriter for a tech portfolio website. Write project descriptions in a LITERARY, ARTISTIC style that tells a compelling story about what the project does for people.

STRICT RULES:
- "short": punchy memorable tagline, 60-90 characters
- "full": MINIMUM 1000 characters, MAXIMUM 1500 characters. This is CRITICAL — count carefully!
- Write as if telling a story to an intelligent non-technical person
- Focus on WHAT the project does, WHY it matters, WHO benefits, HOW it changes their life
- Use vivid metaphors, sensory language, and engaging narrative
- DO NOT use framework names (no "React", "TypeScript", "Supabase", "Node.js", "PostgreSQL" etc.)
- Instead of "AI-powered", describe what the intelligence actually DOES in human terms
- Include specific details about functionality but expressed through metaphors and storytelling
- Each description should feel like the opening paragraph of a novel about that product
- Norwegian translations should feel native, not translated — use idiomatic Norwegian (Bokmål)
- Ukrainian translations should feel native — use natural Ukrainian literary language
- Output ONLY valid JSON, no markdown, no explanation, no code blocks

OUTPUT FORMAT (strict JSON):
{
  "short_en": "...",
  "short_no": "...",
  "short_ua": "...",
  "full_en": "... (1000-1500 chars) ...",
  "full_no": "... (1000-1500 chars) ...",
  "full_ua": "... (1000-1500 chars) ..."
}`;

const projects = [
  {
    id: 'portfolio',
    context: 'Professional portfolio and automated news platform at vitalii.no. Automatically collects tech news from 20+ RSS feeds and Telegram channels every 10 minutes. AI pre-moderates content (filters spam/ads), then rewrites articles in 3 languages (English, Norwegian, Ukrainian). Auto-posts to LinkedIn, Instagram, Facebook with platform-specific AI-generated teasers. Video production pipeline: collects news → AI writes script → generates voiceover → renders video with animated subtitles → uploads to YouTube. Admin dashboard with 10 tabs for managing everything. BentoGrid UI with GSAP/Three.js particle animations. 65 published engineering features. 20 automated GitHub Actions workflows running 24/7. Contact form with 3-tier spam protection. Multilingual SEO with JSON-LD schemas.'
  },
  {
    id: 'jobbot',
    context: 'Job hunting automation for the Norwegian market. AI reads job postings from FINN.no, NAV, LinkedIn and writes perfect cover letters in Norwegian tailored to each position. Browser robot (Skyvern) automatically fills application forms on 10+ Norwegian recruitment platforms (Webcruiter, Easycruit, Teamtailor, Workday). Telegram bot as main interface — user gets notifications about matching jobs, previews AI-written letters, approves with one tap. Self-learning form memory system — remembers which fields go where on each platform. Interactive map showing all applied jobs with status colors. Analytics dashboard with charts (applications per week, response rates). Multi-user system with completely isolated data per user. 45 published features.'
  },
  {
    id: 'project_23mai',
    context: 'Language learning platform called Elvarika, designed specifically for immigrants in Norway. Helps people from 8 countries (Arabic, Somali, Tigrinya, Dari, Pashto speakers etc.) learn Norwegian through personalized audio playlists. Upload any PDF textbook — AI extracts vocabulary and creates study cards. Spaced repetition system with voice commands — say the word and it checks pronunciation. Revolutionary Dual SYNC TTS that pronounces each word clearly in 3 seconds (vs 220 seconds with standard TTS). Stripe payments for individual learners. HR dashboard for Norwegian companies to track employee language progress. Master courses system with structured learning paths. 19 published features.'
  },
  {
    id: 'calendar_bot',
    context: 'Telegram bot for managing children sports schedules in Norway. Connects to Spond (the most popular Norwegian sports app) with support for multiple accounts (multiple children in different teams). Syncs everything with Google Calendar automatically. AI analyzes schedule conflicts and suggests optimal arrangements. PIN-protected admin settings that only parents can access, while a public calendar view is available for grandparents, coaches etc. Event validation ensures no double-bookings. Google Places integration finds venues and shows directions. 3 published features.'
  },
  {
    id: 'ghost_interviewer',
    context: 'AI interview preparation platform specifically for the Norwegian job market. Simulates real job interviews — asks industry-specific questions, listens to spoken answers via microphone, provides real-time scoring and detailed feedback. Practices in both Norwegian and English — critical for immigrants who need to interview in Norwegian. AI translation engine ensures natural conversational flow in both languages. Tracks progress across multiple practice sessions. Specifically designed to help immigrants overcome the cultural and language barriers of Norwegian workplace interviews. 1 published feature.'
  },
  {
    id: 'eyeplus',
    context: 'Cloud platform for Eye+ security cameras. Real-time video streaming from multiple cameras displayed on a single dashboard. Intelligent motion detection with instant push alerts — knows the difference between a person and a cat. Timeline playback to review past events with fast-forward and frame-by-frame. Role-based access control — building owners see everything, security guards see their zones, tenants see only their entrance. WebRTC technology for zero-latency live streams. Cloud storage for weeks of recordings with smart compression.'
  },
  {
    id: 'lingleverika',
    context: 'AI platform called Lingva AI that translates and deeply understands video content. Automatic speech recognition transcribes audio in real-time. Context-aware translation — understands idioms, cultural references, technical terms. Supports Norwegian, English, Arabic, Somali and more. Summarizes 2-hour videos into 5-minute highlights. Extracts key moments with timestamps — jump directly to important parts. Creates fully searchable transcripts — find any word spoken in any video. Designed for multicultural environments where people speak different languages.'
  },
  {
    id: 'youtube_manager',
    context: 'Automated YouTube channel management system. Full OAuth 2.0 authentication with token refresh. Scheduled video uploads — set time and forget. Metadata optimization for YouTube search (titles, descriptions, tags). Integrates with Remotion video rendering engine — automatically transforms news articles into polished videos with AI voiceover and animated subtitles. Automatic thumbnail generation from video frames. Playlist management — auto-categorize videos. Cross-platform publishing triggers — when a YouTube video is published, automatically create posts on LinkedIn, Instagram, Facebook. Analytics dashboard tracking views, subscribers, engagement.'
  },
  {
    id: 'boytasks',
    context: 'Parental educational control system designed for a family with 3 boys (grades 3-7). Every morning at 8 AM, each child receives an email with daily tasks in 4 subjects: math problems, Norwegian reading comprehension, English reading, and grammar exercises. When a child completes a task group, they receive a 4-digit code fragment. The genius twist: YouTube access is locked behind a master code that requires ALL children to complete ALL their tasks. The code changes daily. Children must collaborate — if one brother skips his math, nobody watches YouTube. Hosted at kids.vitalii.no with Google OAuth for parent access. Fun gamification with streaks, badges, and daily challenges.'
  }
];

async function generateForProject(project) {
  const userPrompt = `Write descriptions for project "${project.id}".
Context: ${project.context}

CRITICAL: The "full" description MUST be between 1000 and 1500 characters. Count carefully. This is a hard requirement.
Return ONLY valid JSON with short_en, short_no, short_ua, full_en, full_no, full_ua.`;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 8000, thinkingConfig: { thinkingBudget: 0 } }
        })
      });
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const enLen = parsed.full_en?.length || 0;
          console.log(`[${project.id}] full_en: ${enLen} chars ${enLen >= 900 ? '✓' : '✗ TOO SHORT'}`);
          if (enLen >= 900) return { id: project.id, ...parsed };
          console.log(`[${project.id}] Retrying (attempt ${attempt + 2})...`);
          continue;
        }
      }
      console.error(`[${project.id}] No valid JSON in response (attempt ${attempt + 1})`);
    } catch (e) {
      console.error(`[${project.id}] Error:`, e.message);
    }
  }
  return null;
}

async function main() {
  console.log('Generating 1000+ char descriptions for', projects.length, 'projects...\n');

  // Run 3 at a time to avoid rate limits
  const results = [];
  for (let i = 0; i < projects.length; i += 3) {
    const batch = projects.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(p => generateForProject(p)));
    results.push(...batchResults);
    if (i + 3 < projects.length) await new Promise(r => setTimeout(r, 2000));
  }

  const output = results.filter(Boolean);
  console.log(`\nGenerated ${output.length}/${projects.length} descriptions\n`);

  fs.writeFileSync(
    '/mnt/c/Users/stuar/Projects/vitalii_claude-code-in-browser/scripts/project-descriptions.json',
    JSON.stringify(output, null, 2)
  );
  console.log('Saved to scripts/project-descriptions.json');

  for (const r of output) {
    console.log(`\n=== ${r.id} === (en:${r.full_en?.length} no:${r.full_no?.length} ua:${r.full_ua?.length})`);
    console.log('short_en:', r.short_en);
  }
}

main().catch(console.error);
