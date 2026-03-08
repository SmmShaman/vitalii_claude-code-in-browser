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
    .select('id, title_en, title_no, original_title, original_content, content_en, content_no, description_en, description_no, image_url, processed_image_url, tags, created_at')
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
async function directDailyShow(articles, dateStr) {
  const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
  const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'Jobbot-gpt-4.1-mini';

  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    console.log('⚠️ No Azure OpenAI credentials, using template show script');
    return templateShowScript(articles, dateStr);
  }

  console.log('🎬 AI Director: planning daily show...');

  // Build article summaries
  const articleSummaries = articles.map((a, i) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    const content = a.content_no || a.content_en || a.original_content || '';
    return `ARTICLE ${i + 1}:\nTitle: ${title}\nContent: ${content.substring(0, 500)}`;
  }).join('\n\n');

  // ~12 seconds per article + 8s intro/outro
  const targetDuration = Math.min(articles.length * 12 + 8, 300);
  const wordTarget = Math.round(targetDuration * 2);

  const systemPrompt = `You are a professional Norwegian news anchor writing a daily news summary video script.

The video is a compilation of ${articles.length} news stories from ${dateStr}.
Total video duration: ~${targetDuration} seconds.

You must write:
1. A "showScript" — the COMPLETE voiceover narration in Norwegian (Bokmål)
2. A "segments" array — visual metadata for each news story

SCRIPT STRUCTURE:
- Opening greeting (~3s): "God morgen! Her er dagens nyhetsoppdatering fra vitalii.no..."
- For each article (~10-15s each):
  - Brief transition phrase ("La oss se på neste sak...", "Videre til...", etc.)
  - 2-4 sentences covering the key points
  - Natural conversational tone, not robotic
- Closing (~3s): "Det var dagens nyheter. Følg oss på vitalii.no for mer."

SEGMENTS array — one object per article:
{
  "headline": "Norwegian headline (5-10 words)",
  "keyQuote": "Most impactful sentence from your script about this article (Norwegian)",
  "category": "tech|business|ai|startup|science|politics|crypto|health|news",
  "accentColor": "#hex (warm orange tones preferred: #FF7A00, #FF8C42, #FF6B35; match category mood)"
}

RULES:
- Write in Norwegian Bokmål (NOT Nynorsk)
- showScript must be exactly one continuous text (no scene markers, no timestamps)
- Word count for showScript: ~${wordTarget} words
- Each segment's keyQuote must be a sentence that actually appears in your showScript
- Be engaging, professional, conversational — like a modern news podcast
- If an article has notable numbers/stats, mention them
- Do NOT add [brackets], timestamps, or stage directions

Return valid JSON with this structure:
{
  "showScript": "Full Norwegian voiceover text...",
  "segments": [{...}, ...],
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

    if (!plan.showScript || !plan.segments || plan.segments.length === 0) {
      throw new Error('Invalid show plan structure');
    }

    const usage = data.usage;
    if (usage) {
      console.log(`💰 Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
    }

    console.log(`📝 Script: ${plan.showScript.split(/\s+/).length} words`);
    console.log(`📊 Segments: ${plan.segments.length}`);

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

  const segments = articles.map((a) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    return {
      headline: title.substring(0, 60),
      keyQuote: '',
      category: 'news',
      accentColor: '#FF7A00',
    };
  });

  // Build simple Norwegian script
  const intro = `God morgen. Her er dagens nyhetsoppdatering fra vitalii punkt no, ${formatDateNorwegian(dateStr)}.`;
  const articleTexts = articles.map((a, i) => {
    const title = a.title_no || a.title_en || a.original_title || '';
    const desc = a.description_no || a.description_en || '';
    return `Sak nummer ${i + 1}. ${title}. ${desc}`;
  });
  const outro = 'Det var dagens nyheter. Følg oss på vitalii punkt no for flere oppdateringer.';

  const showScript = [intro, ...articleTexts, outro].join(' ');

  return {
    showScript,
    segments,
    showTitle: 'Daglig Nyhetsoppdatering',
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

// ── Main ──

async function main() {
  console.log('🎬 Daily News Compilation Generator');
  console.log(`🌐 Language: ${LANGUAGE}`);
  console.log(`📐 Format: ${FORMAT}`);

  // Step 1: Fetch yesterday's news
  const articles = await fetchYesterdayNews();
  console.log(`📰 Found ${articles.length} articles from yesterday`);

  if (articles.length === 0) {
    console.log('✅ No articles yesterday, skipping video generation');
    return;
  }

  if (articles.length < 2) {
    console.log('⚠️ Only 1 article, need at least 2 for a compilation');
    return;
  }

  const { dateStr } = getTargetDateRange();
  const displayDate = formatDateNorwegian(dateStr);

  // Step 2: Claude directs the show
  console.log('\n🎬 Step 1: Directing the show...');
  const plan = await directDailyShow(articles, displayDate);

  // Step 3: Generate voiceover (Norwegian)
  console.log('\n🎙️ Step 2: Generating voiceover...');
  const hasTTS = process.env.ZVUKOGRAM_TOKEN && process.env.ZVUKOGRAM_EMAIL;
  if (!hasTTS) throw new Error('Missing TTS credentials');

  const voiceover = await generateVoiceover(plan.showScript, LANGUAGE);

  // Step 4: Download images + prepare Remotion assets
  console.log('\n📥 Step 3: Downloading images...');
  const remotionProjectDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../remotion-video');
  const publicDir = path.join(remotionProjectDir, 'public');
  await fs.mkdir(publicDir, { recursive: true });

  // Copy audio
  const audioFilename = `daily_voiceover_${Date.now()}.mp3`;
  await fs.copyFile(voiceover.audioPath, path.join(publicDir, audioFilename));

  // Download images for each segment
  const segments = [];
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
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

    // ~12 seconds per segment
    const segDuration = Math.max(8, Math.min(15, Math.round(plan.showScript.split(/\s+/).length / articles.length / 2)));

    segments.push({
      headline: segment.headline || article.title_no || article.title_en || '',
      imageSrc: imageFilename,
      keyQuote: segment.keyQuote || '',
      category: segment.category || 'news',
      accentColor: segment.accentColor || '#FF7A00',
      durationSeconds: segDuration,
    });
  }

  // Calculate total duration
  const introDuration = 4;
  const outroDuration = 4;
  const dividerDuration = 2;
  const segmentsTotalDuration = segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  const dividersTotalDuration = segments.length * dividerDuration;
  const totalDuration = Math.max(
    introDuration + dividersTotalDuration + segmentsTotalDuration + outroDuration,
    voiceover.durationSeconds + 2,
  );

  console.log(`\n⏱️ Total duration: ${totalDuration}s`);
  console.log(`   Intro: ${introDuration}s, Segments: ${segmentsTotalDuration}s, Dividers: ${dividersTotalDuration}s, Outro: ${outroDuration}s`);
  console.log(`   Voiceover: ${voiceover.durationSeconds}s`);

  // Step 5: Render with Remotion
  console.log('\n🎬 Step 4: Rendering with Remotion...');
  const outputPath = path.join(os.tmpdir(), `daily_show_${Date.now()}.mp4`);

  const props = JSON.stringify({
    date: displayDate,
    showTitle: plan.showTitle || 'Daglig Nyhetsoppdatering',
    language: LANGUAGE,
    segments,
    voiceoverSrc: audioFilename,
    subtitles: voiceover.subtitles,
    totalDurationSeconds: totalDuration,
    introDurationSeconds: introDuration,
    outroDurationSeconds: outroDuration,
    dividerDurationSeconds: dividerDuration,
    accentColor: '#FF7A00',
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
  const description = [
    `Daglig nyhetssammendrag fra vitalii.no — ${displayDate}`,
    '',
    `${articles.length} saker dekket i denne utgaven:`,
    ...segments.map((s, i) => `${i + 1}. ${s.headline}`),
    '',
    'Følg oss for daglige oppdateringer!',
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
  }
  await fs.unlink(path.join(publicDir, audioFilename)).catch(() => {});

  console.log(`\n🎉 Daily compilation complete!`);
  console.log(`📺 ${result.watchUrl}`);
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
