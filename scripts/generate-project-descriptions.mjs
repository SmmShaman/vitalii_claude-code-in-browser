import fs from 'fs';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const SYSTEM_PROMPT = `You are a creative copywriter for a tech portfolio. Generate structured project descriptions.

OUTPUT FORMAT (strict JSON, no markdown):
{
  "short_en": "tagline 60-90 chars",
  "short_no": "...",
  "short_ua": "...",
  "intro_en": "Artistic narrative paragraph, 500-800 chars. No tech jargon. Storytelling style.",
  "intro_no": "Norwegian translation, native feel",
  "intro_ua": "Ukrainian translation, native feel",
  "highlights_en": [
    {"emoji": "🤖", "title": "Feature Name", "desc": "One sentence what it does for the user"},
    ...
  ],
  "highlights_no": [...same structure in Norwegian...],
  "highlights_ua": [...same structure in Ukrainian...]
}

RULES:
- intro: artistic, storytelling, vivid metaphors, NO framework names
- highlights: 5-8 items based on REAL features provided in context
- highlight titles: catchy but accurate, 3-5 words
- highlight desc: practical benefit in one sentence, no jargon
- Emojis should match the feature type (🤖 AI, 📰 content, 🎬 video, 🔒 security, 📊 analytics, 🌐 multilingual, 📱 mobile, 🔄 automation, etc.)
- Norwegian must feel native (Bokmål), not translated
- Ukrainian must feel native literary language`;

const projects = [
  {
    id: 'portfolio',
    context: 'Professional portfolio and news platform at vitalii.no. Auto-collects tech news from 20+ RSS/Telegram sources every 10 min. AI moderates, rewrites in 3 languages, auto-posts to social media. Video pipeline: news→script→voiceover→animated video→YouTube. Admin dashboard, BentoGrid UI with animations. 65 features, 20 workflows.',
    features: 'ai_automation: Social Auto-Publisher, AI Social Teasers, Multi-LLM Provider Support, AI Commit Miner, AI Duplicate Detection, AI Comment Replies, AI Pre-Moderation; media_production: Remotion Video Pipeline, AI Voiceover, Animated Subtitles, Image Generation (Nano Banana); bot_scraping: Telegram Scraper (MTKruto), RSS Monitor; frontend_ux: BentoGrid with GSAP/Three.js, Modal System, Multilingual SEO; devops_infra: 20 GitHub Actions, Auto-Deploy'
  },
  {
    id: 'jobbot',
    context: 'Job hunting automation for Norway. AI reads job postings, writes cover letters in Norwegian. Browser robot fills forms on 10+ platforms. Telegram bot interface. Self-learning form memory. Job map + analytics. 45 features.',
    features: 'ai_automation: AI Cover Letter in 8s, PDF to JSON in 12s, AI Job Analyzer, MetaClaw Form AI, Job Aura; bot_scraping: Skyvern Auto-Recovery, Form Memory, Pocket Job Card, Multi-Platform Navigator, FINN.no Scraper; frontend_ux: Job Map (Leaflet), Analytics Dashboard, Application Timeline; devops_infra: CI/CD Pipeline, Auto-Retry System'
  },
  {
    id: 'project_23mai',
    context: 'Elvarika — language learning for immigrants in Norway. 8 languages supported. PDF→vocabulary extraction. Spaced repetition with voice. Dual SYNC TTS (3s/word). Stripe payments, HR dashboard, master courses. 19 features.',
    features: 'ai_automation: AI Vocabulary Extraction, Spaced Repetition Engine, Voice Command Recognition, Dual SYNC TTS, Pronunciation Checker, Adaptive Learning Path; frontend_ux: PDF Upload & Preview, Study Cards UI, Progress Dashboard; devops_infra: Stripe Integration, HR Analytics; other: Master Courses, Multi-language NLP'
  },
  {
    id: 'calendar_bot',
    context: 'Telegram bot for kids sports schedules in Norway. Spond multi-account, Google Calendar sync, AI scheduling. PIN-protected admin, public calendar view. 3 features.',
    features: 'ai_automation: Spond Multi-Account AI & Geo-Magic; bot_scraping: Calendar Bot Google Auth Decoupling; frontend_ux: PIN-Protected Admin Tabs'
  },
  {
    id: 'ghost_interviewer',
    context: 'AI interview prep for Norwegian job market. Simulates interviews, real-time feedback, Norwegian + English. For immigrants. 1 feature.',
    features: 'ai_automation: Real-time AI Translation Overhaul'
  },
  {
    id: 'eyeplus',
    context: 'Cloud platform for Eye+ security cameras. Multi-camera dashboard, motion detection, timeline playback, role-based access. WebRTC live streams.',
    features: 'No published features yet — describe based on project context'
  },
  {
    id: 'lingleverika',
    context: 'Lingva AI — video translation platform. Speech recognition, context-aware translation, video summarization, key moment extraction, searchable transcripts. Norwegian, English, Arabic, Somali.',
    features: 'No published features yet — describe based on project context'
  },
  {
    id: 'youtube_manager',
    context: 'Automated YouTube channel management. OAuth, scheduled uploads, metadata optimization, Remotion integration, thumbnail generation, playlist management, cross-platform publishing.',
    features: 'No published features yet — describe based on project context'
  },
  {
    id: 'boytasks',
    context: 'Parental educational control for 3 boys (grades 3-7). Daily tasks in 4 subjects at 8 AM. Complete tasks → get code fragments. YouTube unlocks only when ALL children complete ALL tasks. kids.vitalii.no.',
    features: 'No published features yet — describe based on project context'
  }
];

async function generateForProject(project) {
  const userPrompt = 'Write structured description for "' + project.id + '".\nContext: ' + project.context + '\nReal features: ' + project.features + '\n\nReturn ONLY valid JSON.';

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + GOOGLE_API_KEY, {
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
          const introLen = parsed.intro_en?.length || 0;
          const hlCount = parsed.highlights_en?.length || 0;
          console.log('[' + project.id + '] intro: ' + introLen + ' chars, highlights: ' + hlCount + (introLen >= 400 && hlCount >= 3 ? ' ✓' : ' ✗ RETRY'));
          if (introLen >= 400 && hlCount >= 3) return { id: project.id, ...parsed };
          continue;
        }
      }
      console.error('[' + project.id + '] No JSON (attempt ' + (attempt+1) + ')');
    } catch (e) {
      console.error('[' + project.id + '] Error:', e.message);
    }
  }
  return null;
}

async function main() {
  console.log('Generating structured descriptions...\n');
  const results = [];
  for (let i = 0; i < projects.length; i += 3) {
    const batch = projects.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(p => generateForProject(p)));
    results.push(...batchResults);
    if (i + 3 < projects.length) await new Promise(r => setTimeout(r, 2000));
  }
  const output = results.filter(Boolean);
  console.log('\nGenerated ' + output.length + '/' + projects.length);
  fs.writeFileSync('/mnt/c/Users/stuar/Projects/vitalii_claude-code-in-browser/scripts/project-descriptions.json', JSON.stringify(output, null, 2));
  console.log('Saved');
  for (const r of output) {
    console.log('\n=== ' + r.id + ' ===');
    console.log('short:', r.short_en);
    console.log('intro:', r.intro_en?.length, 'chars');
    console.log('highlights:', r.highlights_en?.length, 'items');
    r.highlights_en?.forEach(h => console.log('  ' + h.emoji + ' ' + h.title));
  }
}

main().catch(console.error);
