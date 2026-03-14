/**
 * Daily News Compilation Video Generator
 *
 * Runs once per day (via GitHub Actions cron), fetches all published news
 * from the previous day, and generates a single compilation video
 * with Claude AI as the show director.
 *
 * Output: Norwegian-language daily news summary video
 * Target: ~2-5 minutes depending on article count
 *
 * Pipeline:
 *  1. Fetch yesterday's published news from Supabase
 *  2. Claude AI writes the show script (Norwegian)
 *  3. TTS generates Norwegian voiceover
 *  4. Download all article images
 *  5. Remotion renders multi-segment video
 *  6. Upload to YouTube
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { generateVoiceover } from './generate-voiceover.js';
import { generateClickbaitMeta } from './generate-clickbait.js';
import { generateAIThumbnail } from './generate-ai-thumbnail.js';
import { generateAllAvatarClips } from './generate-avatar.js';
import { downloadPexelsMedia } from './pexels-media.js';
import { scrapeAllArticleImages } from './scrape-article-images.js';

// ── Config ──

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
);
oauth2Client.setCredentials({
  refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
});
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

const LANGUAGE = process.env.LANGUAGE || 'no';
const FORMAT = process.env.FORMAT || 'horizontal'; // vertical or horizontal

// ── Helpers ──

/**
 * Get target date boundaries in UTC.
 * Uses TARGET_DATE env var if set, otherwise defaults to yesterday.
 */
function getTargetDateRange() {
  const targetDateEnv = process.env.TARGET_DATE;
  let target;

  if (targetDateEnv && /^\d{4}-\d{2}-\d{2}$/.test(targetDateEnv)) {
    target = new Date(targetDateEnv + 'T00:00:00Z');
    console.log(`📅 Using custom target date: ${targetDateEnv}`);
  } else {
    target = new Date();
    target.setDate(target.getDate() - 1);
  }

  const start = new Date(target);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(target);
  end.setUTCHours(23, 59, 59, 999);

  return { start: start.toISOString(), end: end.toISOString(), dateStr: target.toISOString().split('T')[0] };
}

/**
 * Format date for display (Norwegian style).
 */
function formatDateNorwegian(dateStr) {
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember',
  ];
  const d = new Date(dateStr);
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Fetch yesterday's published news from Supabase.
 */
async function fetchYesterdayNews() {
  const { start, end, dateStr } = getTargetDateRange();
  console.log(`📅 Fetching news from ${dateStr} (${start} → ${end})`);

  const { data, error } = await supabase
    .from('news')
    .select('id, title_en, title_no, original_title, original_content, content_en, content_no, description_en, description_no, image_url, processed_image_url, video_url, video_type, original_video_url, tags, created_at, published_at, slug_en, source_link, source_links, images, original_url')
    .eq('is_published', true)
    .gte('published_at', start)
    .lte('published_at', end)
    .order('published_at', { ascending: true });

  if (error) throw new Error(`Failed to fetch news: ${error.message}`);
  return data || [];
}

/**
 * AI directs the daily show — writes a full Norwegian script
 * and plans the visual structure using Azure OpenAI.
 */
const MAX_DETAILED = 10;

async function directDailyShow(articles, dateStr) {
  const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
  const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'Jobbot-gpt-4.1-mini';

  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    console.log('⚠️ No Azure OpenAI credentials, using template show script');
    return templateShowScript(articles, dateStr);
  }

  console.log('🎬 AI Director: planning daily show...');

  const hasOverflow = articles.length > MAX_DETAILED;
  const detailedCount = Math.min(articles.length, MAX_DETAILED);
  const overflowCount = hasOverflow ? articles.length - MAX_DETAILED : 0;

  // Build article summaries
  const articleSummaries = articles.map((a, i) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    const content = a.content_no || a.content_en || a.original_content || '';
    const marker = i >= MAX_DETAILED ? ' [OVERFLOW — no detailed segment needed]' : '';
    const hasVideo = a.video_url && a.video_type;
    const videoMarker = hasVideo ? ' [HAS VIDEO — write 40-60 word script for this story, more detailed narration]' : '';
    return `ARTICLE ${i + 1}${marker}${videoMarker}:\nTitle: ${title}\nContent: ${content.substring(0, 500)}`;
  }).join('\n\n');

  // ~15 seconds per detailed article + 12s intro/outro + roundup if needed
  const roundupDuration = hasOverflow ? Math.min(articles.length * 1.5, 25) : 0;
  const overflowDurationEst = hasOverflow ? 4 : 0;
  const targetDuration = detailedCount * 15 + 12 + roundupDuration + overflowDurationEst;
  const wordTarget = Math.round(targetDuration * 2);

  const wordsPerArticle = Math.round(wordTarget / (detailedCount + 2)); // +2 for intro/outro

  const roundupPromptBlock = hasOverflow ? `
2. "roundupScript" — quick teaser listing ALL ${articles.length} headlines (~${Math.round(roundupDuration)} seconds). Format: "I dag dekker vi ${articles.length} nyheter. Blant annet: [headline 1], [headline 2], ..." Name each story in 3-5 words. This is a FAST-PACED cold open preview.` : '';

  const overflowPromptBlock = hasOverflow ? `
${hasOverflow ? '5' : '4'}. "overflowScript" — brief CTA mentioning ${overflowCount} additional stories (~4 seconds). Example: "Du finner ${overflowCount} flere nyheter på vitalii punkt no."` : '';

  const segmentCountNote = hasOverflow
    ? `Write detailed scripts ONLY for the first ${detailedCount} articles. Articles ${detailedCount + 1}-${articles.length} are overflow — mention them briefly in the roundupScript only.`
    : '';

  const systemPrompt = `You are a professional Norwegian news anchor writing a daily news summary video script.

The video is a compilation of ${articles.length} news stories from ${dateStr}.${hasOverflow ? ` Only the first ${detailedCount} get detailed coverage; the rest are mentioned in the headlines roundup.` : ''}
Target duration: ~${Math.round(targetDuration)} seconds. There is NO maximum length — take the time needed to cover each story properly.
${segmentCountNote}

You must write SEPARATE scripts for each part of the show:
1. "introScript" — personal opening greeting (~4-5 seconds, ~${wordsPerArticle} words). Start with "Hei, jeg er Vitalii fra vitalii punkt no." then a brief mention of today's news count (${articles.length} saker).${roundupPromptBlock}
${hasOverflow ? '3' : '2'}. "segmentScripts" — one narration script for each of the ${detailedCount} detailed articles (~12-18 seconds each, ~${wordsPerArticle * 2} words each)
${hasOverflow ? '4' : '3'}. "outroScript" — closing with subscribe CTA (~4-5 seconds, ~${wordsPerArticle} words). End with "Abonner på kanalen og trykk liker-knappen! Vi ses i morgen."${overflowPromptBlock}
${hasOverflow ? '6' : '4'}. "segments" — visual metadata for each of the ${detailedCount} detailed stories

SCRIPT RULES:
- introScript: Must start with "Hei, jeg er Vitalii fra vitalii punkt no." followed by greeting and news count.${hasOverflow ? '\n- roundupScript: Quick-fire listing of ALL headlines. Each story name 3-5 words. Fast pace, building anticipation.' : ''}
- Each segmentScript: transition + 3-5 sentences covering key points. Natural conversational tone. Don't rush.
- outroScript: Must include "Abonner på kanalen og trykk liker-knappen!" (subscribe and like CTA).${hasOverflow ? '\n- overflowScript: Brief mention that more stories are on the website.' : ''}
- Each script is a SEPARATE voiceover audio — they must stand alone (no references to "previous" or "next")
- Write at a calm, natural pace — ikke hastverk. Use natural pauses between sentences.

LANGUAGE QUALITY:
- Write in clean Norwegian Bokmål (NOT Nynorsk). AVOID English loanwords when a Norwegian equivalent exists.
- Use "kunstig intelligens" not "AI", "programvare" not "software", "nettside" not "website", "bruker" not "user", "oppdatering" not "update", "selskap" not "company" (when contextually appropriate).
- Technical terms with no established Norwegian equivalent (like "blockchain", "API", "GPU") may remain in English.
- The text will be read aloud by TTS — write phonetically clear Norwegian that sounds natural when spoken.
- Avoid complex compound sentences. Use short, clear sentences with natural pauses.

SEGMENTS array — one object per article with VISUAL DIRECTIVES:
{
  "headline": "Norwegian headline (5-10 words)",
  "keyQuote": "Most impactful sentence from the CORRESPONDING segmentScript (Norwegian)",
  "category": "tech|business|ai|startup|science|politics|crypto|health|news",
  "accentColor": "#hex (warm orange tones preferred: #FF7A00, #FF8C42, #FF6B35; match category mood)",
  "mood": "urgent|energetic|positive|analytical|serious|contemplative|lighthearted|cautionary",
  "transition": "fade|wipeLeft|wipeRight|slideUp|slideDown|zoomIn|zoomOut",
  "textReveal": "default|typewriter|splitFade|splitScale"
}

MOOD GUIDE (choose based on story tone):
- "urgent": breaking news, crises → fast animations
- "energetic": startups, launches, achievements → quick & lively
- "positive": good news, growth → balanced pace
- "analytical": research, data, reports → measured & steady
- "serious": politics, legal, regulation → formal pacing
- "contemplative": opinion, human interest → slow & thoughtful
- "lighthearted": entertainment, culture, fun → playful bounce
- "cautionary": warnings, risks, security → measured tension

TRANSITION GUIDE (how the segment enters):
- "fade": calm, default transition
- "wipeLeft": forward momentum (launches, growth stories)
- "slideUp": data-heavy, stats-focused pieces
- "zoomIn": breaking news, urgent stories
- Use "fade" if unsure

TEXT REVEAL GUIDE (how headline text appears):
- "default": word-by-word spring punch (most stories)
- "typewriter": character-by-character typing (building tension, breaking news)
- "splitFade": words fade up one by one (thoughtful, analytical)
- "splitScale": words scale in (energetic, startup news)

RULES:
- Write in clean Norwegian Bokmål (NOT Nynorsk), avoid unnecessary anglicisms
- Each script must be plain text — no [brackets], timestamps, or stage directions
- segmentScripts array length MUST equal ${detailedCount} (one per detailed article, same order)
- segments array length MUST equal ${detailedCount}
- Be engaging, professional, conversational — like a modern news podcast
- If an article has notable numbers/stats, mention them
- Each segment MUST include mood, transition, and textReveal fields
- Take your time with each story — don't compress information unnecessarily

Return valid JSON with this structure:
{
  "introScript": "Hei, jeg er Vitalii fra vitalii punkt no...",${hasOverflow ? '\n  "roundupScript": "I dag dekker vi N nyheter. Blant annet: ...",' : ''}
  "segmentScripts": ["La oss starte med...", "Videre til...", ...],
  "outroScript": "Det var dagens nyheter...",${hasOverflow ? '\n  "overflowScript": "Du finner N flere nyheter på vitalii punkt no.",' : ''}
  "segments": [{headline, keyQuote, category, accentColor, mood, transition, textReveal}, ...],
  "showTitle": "Daglig Nyhetsoppdatering"
}`;

  try {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Write the daily news show script for ${dateStr}:\n\n${articleSummaries}` },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Azure OpenAI error: ${response.status} ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('Empty AI response');

    const plan = JSON.parse(content);

    if (!plan.segmentScripts || !plan.segments || plan.segments.length === 0) {
      throw new Error('Invalid show plan structure');
    }

    // Backward compat: build showScript from parts for fallback
    plan.showScript = [plan.introScript, plan.roundupScript, ...plan.segmentScripts, plan.overflowScript, plan.outroScript].filter(Boolean).join(' ');
    plan.hasOverflow = hasOverflow;
    plan.overflowCount = overflowCount;

    const usage = data.usage;
    if (usage) {
      console.log(`💰 Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
    }

    const totalWords = plan.showScript.split(/\s+/).length;
    console.log(`📝 Script: ${totalWords} words (${plan.segmentScripts.length} segments)`);
    console.log(`📊 Segments: ${plan.segments.length}${hasOverflow ? ` + ${overflowCount} overflow` : ''}`);
    if (plan.roundupScript) console.log(`📋 Roundup script: ${plan.roundupScript.split(/\s+/).length} words`);
    if (plan.overflowScript) console.log(`📋 Overflow script: ${plan.overflowScript.split(/\s+/).length} words`);

    return plan;

  } catch (error) {
    console.error(`⚠️ AI Director failed: ${error.message}`);
    return templateShowScript(articles, dateStr);
  }
}

/**
 * Fallback: generate a template show script without Claude.
 */
function templateShowScript(articles, dateStr) {
  console.log('📋 Using template show script');

  const hasOverflow = articles.length > MAX_DETAILED;
  const detailedArticles = articles.slice(0, MAX_DETAILED);
  const overflowCount = hasOverflow ? articles.length - MAX_DETAILED : 0;

  const segments = detailedArticles.map((a) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    return {
      headline: title.substring(0, 60),
      keyQuote: '',
      category: 'news',
      accentColor: '#FF7A00',
      mood: 'positive',
      transition: 'fade',
      textReveal: 'default',
    };
  });

  const introScript = `Hei, jeg er Vitalii — vibecoder og utvikler av språkplattformen Elvarika. Her kommer en ny nyhetsoppdatering for dagen som gikk. Jeg presenterer et utvalg av de mest interessante nyhetene innen business, teknologi og startups. Vi har ${articles.length} saker i dag.`;

  const roundupScript = hasOverflow
    ? `I dag dekker vi ${articles.length} nyheter. Blant annet: ${articles.map(a => (a.title_no || a.title_en || '').substring(0, 40)).join(', ')}.`
    : '';

  const segmentScripts = detailedArticles.map((a, i) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    const desc = a.description_no || a.description_en || '';
    return `Sak nummer ${i + 1}. ${title}. ${desc}`;
  });

  const overflowScript = hasOverflow
    ? `Du finner ${overflowCount} flere nyheter på vitalii punkt no.`
    : '';

  const outroScript = 'Det var alt for i dag. Abonner på kanalen og trykk liker-knappen! Vi ses i morgen.';

  const showScript = [introScript, roundupScript, ...segmentScripts, overflowScript, outroScript].filter(Boolean).join(' ');

  return {
    introScript,
    roundupScript,
    segmentScripts,
    overflowScript,
    outroScript,
    showScript,
    segments,
    showTitle: 'Daglig Nyhetsoppdatering',
    hasOverflow,
    overflowCount,
  };
}

/**
 * Download an image from URL to local file.
 */
async function downloadImage(url, destPath) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image download failed: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(destPath, buffer);
  return buffer.length;
}

/**
 * Download a video file from URL and return file size.
 */
async function downloadVideo(url, destPath) {
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Video download failed: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  await fs.writeFile(destPath, buffer);
  return buffer.length;
}

/**
 * Get video duration in seconds using ffprobe.
 */
async function getVideoDuration(filePath) {
  try {
    const result = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();
    const duration = parseFloat(result);
    return isNaN(duration) ? 0 : duration;
  } catch (e) {
    console.log(`  ⚠️ ffprobe failed: ${e.message}`);
    return 0;
  }
}

/**
 * Upload video to YouTube.
 */
async function uploadToYouTube(filePath, title, description, tags) {
  console.log(`📤 Uploading to YouTube: ${title}`);

  const fileSize = (await fs.stat(filePath)).size;
  console.log(`📁 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description || '',
        categoryId: '25', // News & Politics
        defaultLanguage: 'no',
        tags: tags || ['nyheter', 'norge', 'daglig oppdatering', 'tech', 'vitalii.no'],
      },
      status: {
        privacyStatus: process.env.YOUTUBE_PRIVACY || 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: (await import('fs')).createReadStream(filePath),
    },
  });

  const videoId = response.data.id;
  console.log(`✅ Uploaded! Video ID: ${videoId}`);
  console.log(`🔗 https://youtube.com/watch?v=${videoId}`);

  return { videoId, watchUrl: `https://youtube.com/watch?v=${videoId}` };
}

/**
 * Load an approved draft from the database (3-step Telegram flow).
 * Returns { articles, plan, dateStr, displayDate } in the same format
 * as the regular pipeline would produce.
 */
async function loadFromDraft(draftId) {
  console.log(`📋 Loading draft: ${draftId}`);

  const { data: draft, error } = await supabase
    .from('daily_video_drafts')
    .select('*')
    .eq('id', draftId)
    .single();

  if (error || !draft) throw new Error(`Draft not found: ${draftId}`);

  const dateStr = draft.target_date;
  const displayDate = formatDateNorwegian(dateStr);

  // Fetch articles
  const { data: articles, error: artError } = await supabase
    .from('news')
    .select('id, title_en, title_no, original_title, original_content, content_en, content_no, description_en, description_no, image_url, processed_image_url, video_url, video_type, original_video_url, tags, created_at, slug_en, source_link, source_links, images, original_url')
    .in('id', draft.article_ids)
    .order('created_at', { ascending: true });

  if (artError || !articles) throw new Error(`Failed to fetch articles: ${artError?.message}`);

  // Build plan from draft data
  const segmentScripts = (draft.segment_scripts || []).map(s => s.scriptNo || s);
  const visualSegments = draft.visual_scenario || [];

  const hasOverflow = articles.length > MAX_DETAILED;
  const overflowCount = hasOverflow ? articles.length - MAX_DETAILED : 0;

  const plan = {
    introScript: draft.intro_script || '',
    roundupScript: draft.roundup_script || '',
    segmentScripts,
    overflowScript: draft.overflow_script || '',
    outroScript: draft.outro_script || '',
    showScript: [draft.intro_script, draft.roundup_script, ...segmentScripts, draft.overflow_script, draft.outro_script].filter(Boolean).join(' '),
    segments: visualSegments.length > 0
      ? visualSegments
      : articles.slice(0, MAX_DETAILED).map(a => ({
          headline: a.title_no || a.title_en || '',
          keyQuote: '',
          category: 'news',
          accentColor: '#FF7A00',
        })),
    showTitle: 'Daglig Nyhetsoppdatering',
    hasOverflow,
    overflowCount,
  };

  console.log(`✅ Draft loaded: ${articles.length} articles, ${segmentScripts.length} scripts`);
  return { articles, plan, dateStr, displayDate };
}

/**
 * Dispatch 4-variant thumbnail generation to the Telegram bot.
 */
async function dispatchThumbnailGeneration(dateStr, clickbaitTitle) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL not set');

  // Save clickbait title to draft for the bot to use
  const supabaseResp = await fetch(`${SUPABASE_URL}/rest/v1/daily_video_drafts?target_date=eq.${dateStr}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ clickbait_title: clickbaitTitle }),
  });
  if (!supabaseResp.ok) {
    console.log(`⚠️ Failed to save clickbait title: ${supabaseResp.status}`);
  }

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/daily-video-bot?action=generate_thumbnails`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ target_date: dateStr }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Bot dispatch failed: ${resp.status} ${errText.substring(0, 200)}`);
  }
  console.log('📺 Thumbnail generation dispatched to bot');
}

/**
 * Send direct Telegram notification (for cron/manual runs without DRAFT_ID).
 */
async function notifyTelegramDirect(dateStr, youtubeUrl) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log('⚠️ Telegram credentials not set, skipping notification');
    return;
  }

  try {
    const text = `🎬 <b>Дайджест за ${dateStr} готовий!</b>\n\n📺 <a href="${youtubeUrl}">Дивитись на YouTube</a>`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });
    console.log('📺 Telegram notification sent');
  } catch (e) {
    console.log(`⚠️ Failed to send Telegram notification: ${e.message}`);
  }
}

/**
 * Notify the daily-video-bot that rendering is complete.
 */
async function notifyBotComplete(dateStr, youtubeUrl) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL) { console.log('⚠️ SUPABASE_URL not set, skipping bot notification'); return; }
  if (!youtubeUrl) { console.log('⚠️ No YouTube URL, skipping bot notification'); return; }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/daily-video-bot?action=notify_complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_date: dateStr, youtube_url: youtubeUrl }),
    });
    const body = await resp.text();
    if (!resp.ok) {
      console.log(`⚠️ Bot notification failed (${resp.status}): ${body}`);
    } else {
      console.log(`📺 Bot notified of completion: ${body}`);
    }
  } catch (e) {
    console.log(`⚠️ Failed to notify bot: ${e.message}`);
  }
}

// ── Main ──

async function main() {
  console.log('🎬 Daily News Compilation Generator');
  console.log(`🌐 Language: ${LANGUAGE}`);
  console.log(`📐 Format: ${FORMAT}`);

  const DRAFT_ID = process.env.DRAFT_ID;
  let articles, plan, dateStr, displayDate;

  if (DRAFT_ID) {
    // ── Draft mode: load from 3-step Telegram approval flow ──
    console.log(`📋 Draft mode: ${DRAFT_ID}`);
    const draft = await loadFromDraft(DRAFT_ID);
    articles = draft.articles;
    plan = draft.plan;
    dateStr = draft.dateStr;
    displayDate = draft.displayDate;
  } else {
    // ── Normal mode: fetch + AI ──
    articles = await fetchYesterdayNews();
    console.log(`📰 Found ${articles.length} articles from yesterday`);

    if (articles.length === 0) {
      console.log('✅ No articles yesterday, skipping video generation');
      return;
    }

    if (articles.length < 2) {
      console.log('⚠️ Only 1 article, need at least 2 for a compilation');
      return;
    }

    const range = getTargetDateRange();
    dateStr = range.dateStr;
    displayDate = formatDateNorwegian(dateStr);

    console.log('\n🎬 Step 1: Directing the show...');
    plan = await directDailyShow(articles, displayDate);
  }

  // Step 3: Generate per-article voiceovers (Norwegian)
  console.log('\n🎙️ Step 2: Generating per-segment voiceovers...');
  const hasTTS = process.env.ZVUKOGRAM_TOKEN && process.env.ZVUKOGRAM_EMAIL;
  if (!hasTTS) throw new Error('Missing TTS credentials');

  // Generate TTS for intro script
  let introVoiceover = null;
  if (plan.introScript) {
    console.log('\n  🎙️ Intro voiceover...');
    introVoiceover = await generateVoiceover(plan.introScript, LANGUAGE);
  }

  // Generate TTS for roundup script (cold open)
  let roundupVoiceover = null;
  if (plan.roundupScript) {
    console.log('\n  🎙️ Roundup voiceover...');
    roundupVoiceover = await generateVoiceover(plan.roundupScript, LANGUAGE);
  }

  // Generate TTS for each segment script separately
  const segmentVoiceovers = [];
  const segmentScripts = plan.segmentScripts || [];
  for (let i = 0; i < segmentScripts.length; i++) {
    console.log(`\n  🎙️ Segment ${i + 1}/${segmentScripts.length}...`);
    const vo = await generateVoiceover(segmentScripts[i], LANGUAGE);
    segmentVoiceovers.push(vo);
  }

  // Generate TTS for overflow script
  let overflowVoiceover = null;
  if (plan.overflowScript) {
    console.log('\n  🎙️ Overflow voiceover...');
    overflowVoiceover = await generateVoiceover(plan.overflowScript, LANGUAGE);
  }

  // Generate TTS for outro script
  let outroVoiceover = null;
  if (plan.outroScript) {
    console.log('\n  🎙️ Outro voiceover...');
    outroVoiceover = await generateVoiceover(plan.outroScript, LANGUAGE);
  }

  // Step 4: Download images + prepare Remotion assets
  console.log('\n📥 Step 3: Downloading images...');
  const remotionProjectDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../remotion-video');
  const publicDir = path.join(remotionProjectDir, 'public');
  await fs.mkdir(publicDir, { recursive: true });

  // Track all audio files for cleanup
  const audioFiles = [];

  // Copy intro audio file
  let introAudioFilename = '';
  if (introVoiceover) {
    introAudioFilename = `daily_vo_intro_${Date.now()}.mp3`;
    await fs.copyFile(introVoiceover.audioPath, path.join(publicDir, introAudioFilename));
  }

  // Copy roundup audio file
  let roundupAudioFilename = '';
  if (roundupVoiceover) {
    roundupAudioFilename = `daily_vo_roundup_${Date.now()}.mp3`;
    await fs.copyFile(roundupVoiceover.audioPath, path.join(publicDir, roundupAudioFilename));
  }

  // Copy per-segment audio files
  for (let i = 0; i < segmentVoiceovers.length; i++) {
    const audioFilename = `daily_vo_seg${i}_${Date.now()}.mp3`;
    await fs.copyFile(segmentVoiceovers[i].audioPath, path.join(publicDir, audioFilename));
    audioFiles.push(audioFilename);
  }

  // Copy overflow audio file
  let overflowAudioFilename = '';
  if (overflowVoiceover) {
    overflowAudioFilename = `daily_vo_overflow_${Date.now()}.mp3`;
    await fs.copyFile(overflowVoiceover.audioPath, path.join(publicDir, overflowAudioFilename));
  }

  // Copy outro audio file
  let outroAudioFilename = '';
  if (outroVoiceover) {
    outroAudioFilename = `daily_vo_outro_${Date.now()}.mp3`;
    await fs.copyFile(outroVoiceover.audioPath, path.join(publicDir, outroAudioFilename));
  }

  // Download images and videos for detailed segments only (max MAX_DETAILED)
  const detailedArticles = articles.slice(0, MAX_DETAILED);
  const segments = [];
  for (let i = 0; i < detailedArticles.length; i++) {
    const article = detailedArticles[i];
    const segment = plan.segments[i] || { headline: article.title_no || article.title_en || '', category: 'news', accentColor: '#FF7A00' };

    const imageUrl = article.processed_image_url || article.image_url;
    let imageFilename = '';

    if (imageUrl) {
      imageFilename = `daily_img_${i}_${Date.now()}.jpg`;
      try {
        const size = await downloadImage(imageUrl, path.join(publicDir, imageFilename));
        console.log(`  📸 Article ${i + 1}: ${(size / 1024).toFixed(0)} KB`);
      } catch (e) {
        console.log(`  ⚠️ Article ${i + 1}: image download failed: ${e.message}`);
        imageFilename = '';
      }
    }

    // Download article video if available (direct_url or youtube with original_video_url)
    let videoFilename = '';
    let videoDurationSec = 0;
    const videoUrl = article.original_video_url || (article.video_type === 'direct_url' ? article.video_url : null);
    if (videoUrl) {
      videoFilename = `daily_vid_${i}_${Date.now()}.mp4`;
      try {
        const size = await downloadVideo(videoUrl, path.join(publicDir, videoFilename));
        console.log(`  🎬 Article ${i + 1}: video ${(size / 1024 / 1024).toFixed(1)} MB`);
        videoDurationSec = await getVideoDuration(path.join(publicDir, videoFilename));
        if (videoDurationSec > 0) {
          console.log(`     ⏱️ Video duration: ${videoDurationSec.toFixed(1)}s`);
        }
        // Validate: skip if too small (<50KB) or too large (>200MB)
        if (size < 50 * 1024) {
          console.log(`     ⚠️ Video too small (${size} bytes), skipping`);
          videoFilename = '';
          videoDurationSec = 0;
        } else if (size > 200 * 1024 * 1024) {
          console.log(`     ⚠️ Video too large (${(size / 1024 / 1024).toFixed(0)} MB), skipping`);
          await fs.unlink(path.join(publicDir, videoFilename)).catch(() => {});
          videoFilename = '';
          videoDurationSec = 0;
        }
      } catch (e) {
        console.log(`  ⚠️ Article ${i + 1}: video download failed: ${e.message}`);
        videoFilename = '';
      }
    }

    // Duration: voiceover-driven — each segment lasts as long as its narration
    const vo = segmentVoiceovers[i];
    const voDurationRaw = vo ? Number(vo.durationSeconds) : 0;
    const voDuration = (voDurationRaw > 0 ? voDurationRaw : 10) + 1;
    let segDuration;
    if (videoFilename && videoDurationSec > 0) {
      // Video segment: use voiceover duration (not video duration!) — video plays as background, clipped to voice
      segDuration = voDuration;
      console.log(`     📐 Segment duration: ${segDuration.toFixed(1)}s (voice: ${voDuration.toFixed(1)}s, video: ${videoDurationSec.toFixed(1)}s — clipped to voice)`);
    } else {
      segDuration = Math.max(voDuration, 8);
      console.log(`     📐 Segment ${i} duration: ${segDuration.toFixed(1)}s (voice: ${voDuration.toFixed(1)}s)`);
    }

    segments.push({
      headline: segment.headline || article.title_no || article.title_en || '',
      imageSrc: imageFilename,
      videoSrc: videoFilename || undefined,
      keyQuote: segment.keyQuote || '',
      category: segment.category || 'news',
      accentColor: segment.accentColor || '#FF7A00',
      durationSeconds: segDuration,
      voiceoverSrc: audioFiles[i] || '',
      subtitles: vo ? vo.subtitles : [],
      slug: article.slug_en || '',
      // Visual directives from AI director
      mood: segment.mood || 'positive',
      transition: segment.transition || 'fade',
      textReveal: segment.textReveal || 'default',
    });
  }

  // Step 4a: Scrape real images from original articles (much more relevant than stock)
  console.log('\n🌐 Step 3a: Scraping images from original articles...');
  try {
    const scrapeArticles = detailedArticles.map((a, idx) => ({
      sourceLink: a.original_url || a.source_link || (a.source_links || []).find(l => l && !l.includes('t.me/')) || '',
      existingImages: (a.images || []).filter(Boolean),
    }));
    const scrapedMedia = await scrapeAllArticleImages(scrapeArticles, publicDir);

    for (let i = 0; i < segments.length; i++) {
      if (segments[i].videoSrc) continue;
      const scraped = scrapedMedia[i];
      if (scraped && scraped.images.length > 0) {
        segments[i].alternateImages = scraped.images;
        segments[i].imageCycleDuration = Math.max(3, Math.round(Number(segments[i].durationSeconds) / (scraped.images.length + 1)));
        console.log(`  📸 Segment ${i}: ${scraped.images.length} article images`);
      }
    }
  } catch (e) {
    console.log(`⚠️ Article scraping failed, continuing: ${e.message}`);
  }

  // Step 4a-2: Pexels fallback — only for segments with <2 scraped images + b-roll for all
  if (process.env.PEXELS_API_KEY) {
    const needsPexels = segments.some((s, i) => !s.videoSrc && (!s.alternateImages || s.alternateImages.length < 3));
    if (needsPexels) {
      console.log('\n🖼️ Step 3a-2: Pexels fallback for segments with few article images...');
      try {
        const pexelsSegments = segments.map((s, idx) => ({
          headline: detailedArticles[idx]?.title_en || detailedArticles[idx]?.original_title || s.headline,
          category: s.category,
          keyQuote: s.keyQuote,
        }));
        const pexelsMedia = await downloadPexelsMedia(pexelsSegments, publicDir);

        for (let i = 0; i < segments.length; i++) {
          if (segments[i].videoSrc) continue;
          const media = pexelsMedia[i];
          const existing = segments[i].alternateImages || [];

          // Add Pexels images only if article scraping yielded <2
          if (existing.length < 3 && media && media.images.length > 0) {
            segments[i].alternateImages = [...existing, ...media.images];
            segments[i].imageCycleDuration = Math.max(3, Math.round(Number(segments[i].durationSeconds) / (segments[i].alternateImages.length + 1)));
            console.log(`  🖼️ Segment ${i}: +${media.images.length} Pexels images (fallback)`);
          }

          // B-roll video from Pexels for all non-video segments
          if (media && media.videos.length > 0 && !segments[i].bRollVideos) {
            segments[i].bRollVideos = media.videos;
          }
        }
      } catch (e) {
        console.log(`⚠️ Pexels fallback failed, continuing: ${e.message}`);
      }
    } else {
      console.log('\n✅ All segments have enough article images, skipping Pexels');
    }
  }

  // Step 4b: Generate avatar clips (if enabled)
  let avatarResult = { introAvatarSrc: null, outroAvatarSrc: null, segmentAvatarSrcs: [] };
  if (process.env.ENABLE_AVATAR === 'true') {
    console.log('\n🧑 Step 3b: Generating avatar clips...');
    try {
      avatarResult = await generateAllAvatarClips({
        introAudioPath: introVoiceover?.audioPath || null,
        outroAudioPath: outroVoiceover?.audioPath || null,
        segmentAudios: segmentVoiceovers.map(vo => ({ audioPath: vo.audioPath })),
        publicDir,
      });

      // Attach avatar sources to segments
      for (let i = 0; i < segments.length; i++) {
        if (avatarResult.segmentAvatarSrcs[i]) {
          segments[i].avatarSrc = avatarResult.segmentAvatarSrcs[i];
        }
      }
    } catch (e) {
      console.log(`⚠️ Avatar generation failed, continuing without: ${e.message}`);
    }
  }

  // Calculate total duration from actual segment durations
  // Dynamic intro/outro duration based on TTS (minimum 4s)
  const introDuration = introVoiceover ? Math.max(Number(introVoiceover.durationSeconds) + 1, 4) : 4;
  const roundupDuration = roundupVoiceover ? Math.max(Number(roundupVoiceover.durationSeconds) + 1, 5) : 0;
  const outroDuration = outroVoiceover ? Math.max(Number(outroVoiceover.durationSeconds) + 1, 4) : 4;
  const overflowDuration = overflowVoiceover ? Math.max(Number(overflowVoiceover.durationSeconds) + 1, 4) : 0;
  const dividerDuration = 3.5;
  const segmentsTotalDuration = segments.reduce((sum, s) => sum + Number(s.durationSeconds), 0);
  const dividersTotalDuration = segments.length * dividerDuration;
  const totalDuration = introDuration + roundupDuration + dividersTotalDuration + segmentsTotalDuration + overflowDuration + outroDuration;

  const voiceoverTotalDuration = segmentVoiceovers.reduce((sum, vo) => sum + (Number(vo.durationSeconds) || 0), 0);
  console.log(`\n⏱️ Total duration: ${totalDuration}s`);
  console.log(`   Intro: ${introDuration}s${roundupDuration ? `, Roundup: ${roundupDuration}s` : ''}, Segments: ${segmentsTotalDuration}s, Dividers: ${dividersTotalDuration}s${overflowDuration ? `, Overflow: ${overflowDuration}s` : ''}, Outro: ${outroDuration}s`);
  console.log(`   Voiceover total: ${voiceoverTotalDuration.toFixed(1)}s (${segmentVoiceovers.length} clips)`);
  if (plan.hasOverflow) console.log(`   📋 ${plan.overflowCount} overflow articles (mentioned in roundup, linked in description)`);

  // Build roundup headlines for Remotion props
  const roundupHeadlines = articles.map((a, i) => ({
    text: a.title_no || a.title_en || '',
    category: (plan.segments[i] || {}).category || 'news',
  }));

  // Calculate YouTube chapter timecodes
  const timecodes = [];
  let cumTime = 0;
  timecodes.push({ time: 0, label: 'Intro' });
  cumTime += introDuration;
  if (roundupDuration > 0) {
    timecodes.push({ time: Math.round(cumTime), label: 'Dagens overskrifter' });
    cumTime += roundupDuration;
  }
  for (let i = 0; i < segments.length; i++) {
    cumTime += dividerDuration;
    timecodes.push({ time: Math.round(cumTime), label: segments[i].headline });
    cumTime += segments[i].durationSeconds;
  }
  if (overflowDuration > 0) {
    timecodes.push({ time: Math.round(cumTime), label: 'Flere nyheter' });
    cumTime += overflowDuration;
  }
  timecodes.push({ time: Math.round(cumTime), label: 'Outro' });

  function formatTimestamp(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  console.log(`📑 Timecodes: ${timecodes.map(tc => `${formatTimestamp(tc.time)} ${tc.label}`).join(' | ')}`);

  // Check for BGM and SFX files in public/
  let bgmFileExists = false;
  let sfxFileExists = false;
  try { await fs.access(path.join(publicDir, 'bgm.mp3')); bgmFileExists = true; console.log('🎵 Background music found: bgm.mp3'); } catch {}
  try { await fs.access(path.join(publicDir, 'whoosh.mp3')); sfxFileExists = true; console.log('🔊 Transition SFX found: whoosh.mp3'); } catch {}

  // Step 5: Render with Remotion
  console.log('\n🎬 Step 4: Rendering with Remotion...');
  const outputPath = path.join(os.tmpdir(), `daily_show_${Date.now()}.mp4`);

  const props = JSON.stringify({
    date: displayDate,
    showTitle: plan.showTitle || 'Daglig Nyhetsoppdatering',
    language: LANGUAGE,
    segments,
    voiceoverSrc: '',
    subtitles: [],
    totalDurationSeconds: totalDuration,
    introDurationSeconds: introDuration,
    outroDurationSeconds: outroDuration,
    dividerDurationSeconds: dividerDuration,
    accentColor: '#FF7A00',
    introVoiceoverSrc: introAudioFilename || undefined,
    outroVoiceoverSrc: outroAudioFilename || undefined,
    // Roundup (cold open with all headlines)
    roundupHeadlines: roundupDuration > 0 ? roundupHeadlines : undefined,
    roundupVoiceoverSrc: roundupAudioFilename || undefined,
    roundupDurationSeconds: roundupDuration,
    // Overflow CTA
    overflowCount: plan.overflowCount || 0,
    overflowVoiceoverSrc: overflowAudioFilename || undefined,
    overflowDurationSeconds: overflowDuration,
    // Background music + SFX
    bgmSrc: bgmFileExists ? 'bgm.mp3' : undefined,
    bgmVolume: 0.3,
    bgmDuckVolume: 0.1,
    transitionSfxSrc: sfxFileExists ? 'whoosh.mp3' : undefined,
    // Avatar overlay
    introAvatarSrc: avatarResult.introAvatarSrc || undefined,
    outroAvatarSrc: avatarResult.outroAvatarSrc || undefined,
  });

  const propsFile = path.join(os.tmpdir(), `daily_props_${Date.now()}.json`);
  await fs.writeFile(propsFile, props);

  const compositionId = FORMAT === 'horizontal' ? 'DailyNewsShowHorizontal' : 'DailyNewsShowVertical';
  console.log(`📐 Composition: ${compositionId}`);

  const cmd = `npx remotion render ${compositionId} ${outputPath} --props=${propsFile} --log=warn`;
  console.log(`🖥️ Running: ${cmd}`);
  execSync(cmd, { cwd: remotionProjectDir, stdio: 'inherit', timeout: 1800_000 }); // 30 min timeout

  const outputStats = await fs.stat(outputPath);
  console.log(`✅ Rendered: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Step 5b: Generate AI clickbait title + description (before thumbnail, since thumbnail uses title)
  console.log('\n🎯 Step 4b: Generating AI title & description...');
  let title, description, ytTags;
  try {
    const meta = await generateClickbaitMeta(articles, dateStr, {
      segment_scripts: plan.segmentScripts?.map?.((s, i) => ({ scriptNo: s })) || [],
      article_headlines: articles.map(a => ({
        title: a.title_no || a.title_en || '',
        tags: a.tags || [],
      })),
    });
    title = meta.title;
    description = meta.description;
    ytTags = meta.tags;
    console.log(`✅ AI title: ${title}`);
  } catch (e) {
    console.log(`⚠️ Clickbait generation failed: ${e.message}, using default`);
    title = `Daglig Nyhetsoppdatering — ${displayDate}`;
    ytTags = ['nyheter', 'norge', 'daglig oppdatering', 'tech', 'vitalii.no'];

    const overflowArticles = articles.slice(MAX_DETAILED);
    const overflowLinks = overflowArticles.length > 0
      ? [
          '',
          `Andre nyheter i dag (${overflowArticles.length}):`,
          ...overflowArticles.map((a, i) => {
            const t = a.title_no || a.title_en || '';
            const url = a.slug_en ? `https://vitalii.no/news/${a.slug_en}` : '';
            return url ? `• ${t} — ${url}` : `• ${t}`;
          }),
        ]
      : [];

    description = [
      `Daglig nyhetssammendrag fra vitalii.no — ${displayDate}`,
      '',
      ...timecodes.map(tc => `${formatTimestamp(tc.time)} ${tc.label}`),
      '',
      `${segments.length} saker dekket i detalj:`,
      ...segments.map((s, i) => {
        const url = s.slug ? `https://vitalii.no/news/${s.slug}` : '';
        return url ? `${i + 1}. ${s.headline} — ${url}` : `${i + 1}. ${s.headline}`;
      }),
      ...overflowLinks,
      '',
      'Abonner for daglige oppdateringer!',
      'https://vitalii.no',
      '',
      '#nyheter #norge #teknologi #dagligoppdatering',
    ].join('\n');
  }

  // Step 5c: Upload to YouTube (thumbnail is handled separately via Telegram approval)
  console.log('\n📤 Step 5: Uploading to YouTube...');
  let result = { videoId: null, url: null };
  try {
    result = await uploadToYouTube(outputPath, title, description, ytTags);
  } catch (ytErr) {
    console.log(`⚠️ YouTube upload failed: ${ytErr.message}`);
    console.log('   Video was rendered successfully but could not be uploaded.');
    console.log('   This may be a temporary quota/rate limit — retry later.');
  }

  // Step 5d: Dispatch thumbnail generation to Telegram bot (4 variants for approval)
  if (result.videoId) {
    console.log('\n🖼️ Step 5d: Dispatching thumbnail generation to bot...');
    try {
      await dispatchThumbnailGeneration(dateStr, title);
      console.log('✅ Thumbnail generation dispatched — check Telegram for 4 variants');
    } catch (e) {
      console.log(`⚠️ Thumbnail dispatch failed: ${e.message}`);
      // Fallback: try to set a single AI thumbnail directly
      if (process.env.GOOGLE_API_KEY) {
        try {
          const thumbnailPath = await generateAIThumbnail(articles, title, dateStr);
          if (thumbnailPath && result.videoId) {
            await youtube.thumbnails.set({
              videoId: result.videoId,
              media: { mimeType: 'image/png', body: (await import('fs')).createReadStream(thumbnailPath) },
            });
            console.log('✅ Fallback thumbnail set');
            await fs.unlink(thumbnailPath).catch(() => {});
          }
        } catch (e2) {
          console.log(`⚠️ Fallback thumbnail also failed: ${e2.message}`);
        }
      }
    }
  }

  // Copy video to workspace for artifact upload if YouTube failed
  if (!result.videoId) {
    const artifactPath = path.join(process.cwd(), `daily-video-${dateStr}.mp4`);
    try {
      await fs.copyFile(outputPath, artifactPath);
      console.log(`📦 Video saved for artifact: ${artifactPath}`);
      // Write path for subsequent workflow steps
      const ghOutput = process.env.GITHUB_OUTPUT;
      if (ghOutput) {
        const outputFs = await import('fs');
        outputFs.appendFileSync(ghOutput, `video_path=${artifactPath}\n`);
        outputFs.appendFileSync(ghOutput, `video_filename=daily-video-${dateStr}.mp4\n`);
      }
    } catch (copyErr) {
      console.warn(`⚠️ Failed to copy video for artifact: ${copyErr.message}`);
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await fs.unlink(propsFile).catch(() => {});
  await fs.unlink(outputPath).catch(() => {});
  // thumbnailPath removed — thumbnails now handled via Telegram bot approval
  for (const seg of segments) {
    if (seg.imageSrc) {
      await fs.unlink(path.join(publicDir, seg.imageSrc)).catch(() => {});
    }
    if (seg.videoSrc) {
      await fs.unlink(path.join(publicDir, seg.videoSrc)).catch(() => {});
    }
    if (seg.voiceoverSrc) {
      await fs.unlink(path.join(publicDir, seg.voiceoverSrc)).catch(() => {});
    }
  }
  if (introAudioFilename) {
    await fs.unlink(path.join(publicDir, introAudioFilename)).catch(() => {});
  }
  if (roundupAudioFilename) {
    await fs.unlink(path.join(publicDir, roundupAudioFilename)).catch(() => {});
  }
  if (overflowAudioFilename) {
    await fs.unlink(path.join(publicDir, overflowAudioFilename)).catch(() => {});
  }
  if (outroAudioFilename) {
    await fs.unlink(path.join(publicDir, outroAudioFilename)).catch(() => {});
  }
  for (const vo of [...segmentVoiceovers, introVoiceover, roundupVoiceover, overflowVoiceover, outroVoiceover].filter(Boolean)) {
    await fs.unlink(vo.audioPath).catch(() => {});
  }
  // Clean up avatar files
  for (const avatarFile of [avatarResult.introAvatarSrc, avatarResult.outroAvatarSrc, ...avatarResult.segmentAvatarSrcs].filter(Boolean)) {
    await fs.unlink(path.join(publicDir, avatarFile)).catch(() => {});
  }

  // Notify Telegram bot
  if (DRAFT_ID) {
    await notifyBotComplete(dateStr, result.watchUrl);
  } else {
    // Direct Telegram notification for cron/manual runs
    await notifyTelegramDirect(dateStr, result.watchUrl);
  }

  console.log(`\n🎉 Daily compilation complete!`);
  console.log(`📺 ${result.watchUrl}`);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
