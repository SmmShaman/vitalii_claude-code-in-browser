/**
 * generate-clickbait.js
 *
 * AI-powered clickbait title + description generator for YouTube daily news videos.
 * Uses LLM (NVIDIA NIM / Gemini) to create engaging Norwegian titles and descriptions.
 */

import { callLLMJson } from './llm-helper.js';

function formatDateNorwegian(dateStr) {
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember',
  ];
  const d = new Date(dateStr);
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Generate clickbait title, description, and tags for a daily news video.
 *
 * @param {Array} articles - News articles from Supabase
 * @param {string} dateStr - Target date (YYYY-MM-DD)
 * @param {Object} draft - Draft data with segment_scripts, article_headlines
 * @returns {Promise<{title: string, description: string, tags: string[]}>}
 */
export async function generateClickbaitMeta(articles, dateStr, draft) {
  const displayDate = formatDateNorwegian(dateStr);

  const headlines = articles.map((a, i) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    const tags = (a.tags || []).slice(0, 3).join(', ');
    const slug = a.slug_en || '';
    return `${i + 1}. "${title}" [${tags}]${slug ? ` → https://vitalii.no/news/${slug}` : ''}`;
  }).join('\n');

  // Reconstruct timecodes from draft segment data
  const timecodes = buildTimecodes(articles, draft);
  const timecodesStr = timecodes.map(tc => `${tc.timestamp} ${tc.label}`).join('\n');

  const systemPrompt = `You are a Norwegian YouTube content optimization expert for a daily tech news channel "vitalii.no".
Create an IRRESISTIBLE clickbait title and a professional description for today's news compilation video.

TITLE RULES (max 95 characters):
- Use numbers: "${articles.length} nyheter som endrer alt"
- Use emotional hooks: "sjokkerende", "utrolig", "endelig", "dette visste du ikke"
- Create curiosity gaps: highlight the most interesting story, leave something unsaid
- Use urgency: "i dag", "akkurat nå", "dette skjer nå"
- NEVER use generic titles like "Daglig Nyhetsoppdatering"
- Can use ONE emoji at start
- Language: Norwegian Bokmaal
- Pick the 1-2 most exciting headlines and weave them into the title
- Examples of good titles:
  - "🔥 ${articles.length} tech-nyheter du MÅ se — dette endrer alt"
  - "Sjokkerende AI-avsløring og ${articles.length} andre nyheter du ikke kan gå glipp av"
  - "DETTE skjer med norsk tech i dag — ${articles.length} nyheter"

DESCRIPTION RULES:
- First 2 lines (visible without "show more"): catchy hook + value proposition
- Then: timecodes (YouTube chapters format, start from 0:00)
- Then: numbered article list with links
- Then: subscribe CTA + website
- Then: 10-15 hashtags
- Language: Norwegian Bokmaal

Return JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...]
}`;

  const userPrompt = `Date: ${displayDate}
${articles.length} articles:

${headlines}

Timecodes:
${timecodesStr}

Generate clickbait title + description.`;

  const result = await callLLMJson(systemPrompt, userPrompt, { maxTokens: 2000, temperature: 0.8 });

  // Safety: truncate title to YouTube limit
  result.title = (result.title || '').substring(0, 100);

  console.log(`✅ Clickbait title: ${result.title}`);
  return result;
}

/**
 * Build estimated timecodes from draft data.
 */
function buildTimecodes(articles, draft) {
  const timecodes = [];
  let currentTime = 0;

  // Intro ~5s
  timecodes.push({ timestamp: formatTimestamp(currentTime), label: 'Intro' });
  currentTime += 5;

  // Roundup (if >10 articles) ~articles.length * 1.5s
  if (articles.length > 10) {
    timecodes.push({ timestamp: formatTimestamp(currentTime), label: 'Dagens overskrifter' });
    currentTime += Math.ceil(articles.length * 1.5);
  }

  // Segments
  const segmentScripts = draft?.segment_scripts || [];
  const maxDetailed = Math.min(articles.length, 10);

  for (let i = 0; i < maxDetailed; i++) {
    // Divider ~3.5s
    currentTime += 3.5;
    const title = articles[i]?.title_no || articles[i]?.title_en || `Sak ${i + 1}`;
    timecodes.push({ timestamp: formatTimestamp(currentTime), label: title.substring(0, 60) });

    // Segment duration: estimate from script word count or default 15s
    const script = segmentScripts[i]?.scriptNo || '';
    const wordCount = script.split(/\s+/).length;
    const segDuration = wordCount > 5 ? wordCount / 2.0 : 15;
    currentTime += segDuration;
  }

  // Outro ~5s
  timecodes.push({ timestamp: formatTimestamp(currentTime), label: 'Outro' });

  return timecodes;
}

function formatTimestamp(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
