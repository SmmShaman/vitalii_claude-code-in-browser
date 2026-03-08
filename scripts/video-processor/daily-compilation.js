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
    .select('id, title_en, title_no, original_title, original_content, content_en, content_no, description_en, description_no, image_url, processed_image_url, tags, created_at, slug_en')
    .eq('is_published', true)
    .gte('created_at', start)
    .lte('created_at', end)
    .order('created_at', { ascending: true });

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
    return `ARTICLE ${i + 1}${marker}:\nTitle: ${title}\nContent: ${content.substring(0, 500)}`;
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

  const introScript = `Hei, jeg er Vitalii fra vitalii punkt no. Her er dagens nyhetsoppdatering for ${formatDateNorwegian(dateStr)}. Vi har ${articles.length} saker i dag.`;

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
 * Upload video to YouTube.
 */
async function uploadToYouTube(filePath, title, description) {
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
        tags: ['nyheter', 'norge', 'daglig oppdatering', 'tech', 'vitalii.no'],
      },
      status: {
        privacyStatus: 'public',
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
    .select('id, title_en, title_no, original_title, original_content, content_en, content_no, description_en, description_no, image_url, processed_image_url, tags, created_at, slug_en')
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
 * Notify the daily-video-bot that rendering is complete.
 */
async function notifyBotComplete(dateStr, youtubeUrl) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL) return;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/daily-video-bot?action=notify_complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ target_date: dateStr, youtube_url: youtubeUrl }),
    });
    console.log('📺 Bot notified of completion');
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

  // Download images for detailed segments only (max MAX_DETAILED)
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

    // Duration from actual TTS audio (not heuristic!)
    const vo = segmentVoiceovers[i];
    const segDuration = vo ? Math.max(vo.durationSeconds + 1, 8) : 10;

    segments.push({
      headline: segment.headline || article.title_no || article.title_en || '',
      imageSrc: imageFilename,
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

  // Calculate total duration from actual segment durations
  // Dynamic intro/outro duration based on TTS (minimum 4s)
  const introDuration = introVoiceover ? Math.max(introVoiceover.durationSeconds + 1, 4) : 4;
  const roundupDuration = roundupVoiceover ? Math.max(roundupVoiceover.durationSeconds + 1, 5) : 0;
  const outroDuration = outroVoiceover ? Math.max(outroVoiceover.durationSeconds + 1, 4) : 4;
  const overflowDuration = overflowVoiceover ? Math.max(overflowVoiceover.durationSeconds + 1, 4) : 0;
  const dividerDuration = 3.5;
  const segmentsTotalDuration = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const dividersTotalDuration = segments.length * dividerDuration;
  const totalDuration = introDuration + roundupDuration + dividersTotalDuration + segmentsTotalDuration + overflowDuration + outroDuration;

  const voiceoverTotalDuration = segmentVoiceovers.reduce((sum, vo) => sum + vo.durationSeconds, 0);
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

  // Step 6: Upload to YouTube
  console.log('\n📤 Step 5: Uploading to YouTube...');
  const title = `Daglig Nyhetsoppdatering — ${displayDate}`;
  // Build overflow article links for YouTube description
  const overflowArticles = articles.slice(MAX_DETAILED);
  const overflowLinks = overflowArticles.length > 0
    ? [
        '',
        `Andre nyheter i dag (${overflowArticles.length}):`,
        ...overflowArticles.map((a, i) => {
          const title = a.title_no || a.title_en || '';
          const url = a.slug_en ? `https://vitalii.no/news/${a.slug_en}` : '';
          return url ? `• ${title} — ${url}` : `• ${title}`;
        }),
      ]
    : [];

  const description = [
    `Daglig nyhetssammendrag fra vitalii.no — ${displayDate}`,
    '',
    // YouTube chapters (timecodes)
    ...timecodes.map(tc => `${formatTimestamp(tc.time)} ${tc.label}`),
    '',
    // Detailed article links
    `${segments.length} saker dekket i detalj:`,
    ...segments.map((s, i) => {
      const url = s.slug ? `https://vitalii.no/news/${s.slug}` : '';
      return url ? `${i + 1}. ${s.headline} — ${url}` : `${i + 1}. ${s.headline}`;
    }),
    // Overflow article links
    ...overflowLinks,
    '',
    'Abonner for daglige oppdateringer!',
    'https://vitalii.no',
    '',
    '#nyheter #norge #teknologi #dagligoppdatering',
  ].join('\n');

  const result = await uploadToYouTube(outputPath, title, description);

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await fs.unlink(propsFile).catch(() => {});
  await fs.unlink(outputPath).catch(() => {});
  for (const seg of segments) {
    if (seg.imageSrc) {
      await fs.unlink(path.join(publicDir, seg.imageSrc)).catch(() => {});
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

  // Notify Telegram bot if in draft mode
  if (DRAFT_ID) {
    await notifyBotComplete(dateStr, result.watchUrl);
  }

  console.log(`\n🎉 Daily compilation complete!`);
  console.log(`📺 ${result.watchUrl}`);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
