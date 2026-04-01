import fs from 'fs';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const SYSTEM_PROMPT = `You are a creative copywriter for a tech portfolio. Write project descriptions in a LITERARY, ARTISTIC style that tells a story about what the project does for people.

RULES:
- Write as if telling a story to an intelligent non-technical person
- Focus on WHAT the project does, WHY it matters, WHO benefits
- Use vivid metaphors and engaging language
- DO NOT use framework names (no "React", "TypeScript", "Supabase", "Next.js", "PostgreSQL", "Deno", "Edge Functions" etc.)
- Instead of "AI-powered", describe what the AI actually DOES
- Keep "short" under 100 characters — punchy, memorable tagline
- Keep "full" at 200-400 characters — compelling narrative paragraph
- Norwegian text should be in Bokmål
- Ukrainian text should be natural, modern Ukrainian
- Output ONLY valid JSON, no markdown, no code fences, no explanation

OUTPUT FORMAT:
{
  "short_en": "...",
  "short_no": "...",
  "short_ua": "...",
  "full_en": "...",
  "full_no": "...",
  "full_ua": "..."
}`;

const projects = [
  {
    id: 'portfolio',
    context: 'Professional portfolio and automated news platform at vitalii.no. Automatically collects tech news from RSS/Telegram, AI rewrites in 3 languages (English, Norwegian, Ukrainian), auto-posts to LinkedIn/Instagram/Facebook. Has video production pipeline that creates news videos with AI voiceover. Admin dashboard with 10 tabs. 65 published engineering features, 20 automated workflows running 24/7.'
  },
  {
    id: 'jobbot',
    context: 'Job hunting automation for Norway. AI reads job postings and writes perfect cover letters in Norwegian. Browser robot fills application forms on 10+ Norwegian recruitment websites automatically. Telegram bot as interface — user gets job notifications and approves applications. Self-learning system that remembers form fields. Map showing all applied jobs. 45 published features. Multi-user system with isolated data per user.'
  },
  {
    id: 'project_23mai',
    context: 'Language learning platform for immigrants in Norway called Elvarika. Helps people from 8 countries (Arabic, Somali, Tigrinya speakers etc.) learn Norwegian through personalized audio playlists. Upload any PDF textbook — AI extracts vocabulary. Spaced repetition with voice commands. Text-to-speech that pronounces each word clearly (3 seconds per word). Stripe payments, HR dashboard for companies to track employee progress. 19 published features.'
  },
  {
    id: 'calendar_bot',
    context: 'Telegram bot for managing kids sports schedules. Connects to Spond (popular Norwegian sports app) with multiple accounts, syncs with Google Calendar. AI suggests optimal schedules. PIN-protected admin settings, public calendar view anyone can see. Validates events, finds venues via Google Places. 3 published features.'
  },
  {
    id: 'ghost_interviewer',
    context: 'AI interview preparation platform. Simulates real job interviews — asks questions, listens to answers, gives real-time feedback and scores. Practices in both Norwegian and English. Improved AI translation for more natural conversation flow. Helps immigrants prepare for Norwegian job market. 1 published feature.'
  },
  {
    id: 'eyeplus',
    context: 'Cloud platform for Eye+ security cameras. Real-time video from multiple cameras on one dashboard. Motion detection alerts, timeline playback to review events. Role-based access — different permissions for owners, guards, viewers. WebRTC for live streams, cloud storage for recordings.'
  },
  {
    id: 'lingleverika',
    context: 'AI platform that translates and understands video content. Automatic speech recognition transcribes audio, then translates to multiple languages with context awareness. Summarizes long videos, extracts key moments, creates searchable transcripts. Works with Norwegian, English, Arabic, Somali and more.'
  },
  {
    id: 'youtube_manager',
    context: 'Automated YouTube channel management system. Scheduled video uploads, metadata optimization for search. Integrates with video rendering engine (Remotion) to automatically create news videos from articles. Generates thumbnails, manages playlists, triggers cross-platform publishing to other social media.'
  },
  {
    id: 'boytasks',
    context: 'Parental educational control system for 3 boys (grades 3-7). Children complete daily tasks in 4 subjects: math, Norwegian reading, English reading, grammar. Each completed task reveals part of a numeric code. YouTube access unlocks ONLY when ALL children complete ALL tasks. Daily tasks emailed at 8 AM. Hosted at kids.vitalii.no. Fun gamification with rewards.'
  }
];

async function generateWithNvidia(project, userPrompt) {
  if (!NVIDIA_API_KEY) return null;

  // Try multiple model names
  const models = [
    'mistralai/mistral-small-24b-instruct-2501',
    'mistralai/mistral-small-4-119b-2603',
    'mistralai/mistral-small-latest'
  ];

  for (const model of models) {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NVIDIA_API_KEY}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log(`  [${project.id}] NVIDIA (${model}) OK`);
          return JSON.parse(jsonMatch[0]);
        }
      }
      if (data.error) {
        console.error(`  [${project.id}] NVIDIA ${model} error:`, data.error.message?.substring(0, 100));
        continue;
      }
    } catch (e) {
      console.error(`  [${project.id}] NVIDIA ${model} failed:`, e.message);
      continue;
    }
  }
  return null;
}

async function generateWithGemini(project, userPrompt) {
  if (!GOOGLE_API_KEY) return null;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4000, responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();

    // Collect text from all parts
    const parts = data.candidates?.[0]?.content?.parts || [];
    let fullText = parts.map(p => p.text || '').join('');

    if (fullText) {
      // Try direct parse first
      try {
        const parsed = JSON.parse(fullText);
        console.log(`  [${project.id}] Gemini OK`);
        return parsed;
      } catch {
        // Try extracting JSON object
        const jsonMatch = fullText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log(`  [${project.id}] Gemini OK (extracted)`);
            return parsed;
          } catch (e2) {
            // Try fixing truncated JSON by closing it
            let fixed = jsonMatch[0];
            // Count open/close braces
            const openBraces = (fixed.match(/\{/g) || []).length;
            const closeBraces = (fixed.match(/\}/g) || []).length;
            if (openBraces > closeBraces) {
              // Find last complete value
              const lastQuote = fixed.lastIndexOf('"');
              if (lastQuote > 0) {
                fixed = fixed.substring(0, lastQuote + 1) + '}';
                try {
                  const parsed = JSON.parse(fixed);
                  console.log(`  [${project.id}] Gemini OK (repaired)`);
                  return parsed;
                } catch { /* fall through */ }
              }
            }
            console.error(`  [${project.id}] Gemini JSON parse failed:`, e2.message);
            console.error(`  [${project.id}] Raw text (last 200):`, fullText.substring(fullText.length - 200));
          }
        }
      }
    }

    // Check for safety/block reasons
    const finishReason = data.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      console.error(`  [${project.id}] Gemini finishReason: ${finishReason}`);
    }

    if (!fullText) {
      console.error(`  [${project.id}] Gemini no content:`, JSON.stringify(data).substring(0, 300));
    }
  } catch (e) {
    console.error(`  [${project.id}] Gemini failed:`, e.message);
  }
  return null;
}

async function generateForProject(project) {
  const userPrompt = `Write descriptions for project "${project.id}".
Context: ${project.context}

Return ONLY JSON with short_en, short_no, short_ua, full_en, full_no, full_ua.`;

  // Try NVIDIA first, fallback to Gemini
  let result = await generateWithNvidia(project, userPrompt);
  if (!result) {
    result = await generateWithGemini(project, userPrompt);
  }

  if (result) {
    return { id: project.id, ...result };
  }
  return null;
}

async function main() {
  console.log('Generating descriptions for', projects.length, 'projects...');
  console.log('NVIDIA:', NVIDIA_API_KEY ? 'available' : 'missing');
  console.log('Gemini:', GOOGLE_API_KEY ? 'available' : 'missing');
  console.log('');

  // Process in batches of 3 to avoid rate limits
  const results = [];
  for (let i = 0; i < projects.length; i += 3) {
    const batch = projects.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map(p => generateForProject(p)));
    results.push(...batchResults);

    if (i + 3 < projects.length) {
      // Small delay between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const output = results.filter(Boolean);
  console.log(`\nGenerated ${output.length}/${projects.length} descriptions\n`);

  // Write results to JSON file
  const outputPath = '/mnt/c/Users/stuar/Projects/vitalii_claude-code-in-browser/scripts/project-descriptions.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('Saved to scripts/project-descriptions.json');

  // Print each result summary
  for (const r of output) {
    console.log(`\n=== ${r.id} ===`);
    console.log('short_en:', r.short_en);
    console.log('short_ua:', r.short_ua);
    console.log('full_en:', r.full_en?.substring(0, 150) + '...');
  }
}

main().catch(console.error);
