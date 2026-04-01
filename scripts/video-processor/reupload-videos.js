/**
 * reupload-videos.js
 *
 * Re-uploads daily news videos to a new YouTube channel with:
 * - AI-generated clickbait titles & descriptions (NVIDIA NIM / Gemini)
 * - AI-generated thumbnails (Gemini)
 *
 * Usage:
 *   node reupload-videos.js
 *
 * Required env vars:
 *   YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   NVIDIA_API_KEY or GOOGLE_API_KEY (LLM)
 *   GOOGLE_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { generateClickbaitMeta } from './generate-clickbait.js';
import { generateAIThumbnail } from './generate-ai-thumbnail.js';

// ── Config ──

const VIDEO_MAP = [
  {
    date: '2026-03-06',
    filePath: '/mnt/c/Users/stuard/OneDrive/Рабочий стол/Відео новини/Daglig Nyhetsoppdatering — 6. mars 2026.mp4',
  },
  {
    date: '2026-03-07',
    filePath: '/mnt/c/Users/stuard/OneDrive/Рабочий стол/Відео новини/Daglig Nyhetsoppdatering — 7. mars 2026.mp4',
  },
];

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const auth = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
);
auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });

const youtube = google.youtube({ version: 'v3', auth });

// ── Helpers ──

async function fetchDraftAndArticles(targetDate) {
  const { data: draft, error: draftErr } = await supabase
    .from('daily_video_drafts')
    .select('*')
    .eq('target_date', targetDate)
    .single();

  if (draftErr || !draft) throw new Error(`Draft not found for ${targetDate}: ${draftErr?.message}`);

  const { data: articles, error: artErr } = await supabase
    .from('news')
    .select('id, title_en, title_no, original_title, content_en, content_no, description_en, description_no, tags, slug_en, image_url, processed_image_url')
    .in('id', draft.article_ids);

  if (artErr || !articles?.length) throw new Error(`No articles found for ${targetDate}`);

  // Preserve original order from draft
  const ordered = draft.article_ids
    .map(id => articles.find(a => a.id === id))
    .filter(Boolean);

  return { draft, articles: ordered };
}

async function uploadToYouTube(filePath, title, description, tags) {
  console.log(`📤 Uploading: ${title}`);
  const fileSize = (await stat(filePath)).size;
  console.log(`📁 File: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: title.substring(0, 100),
        description: description || '',
        categoryId: '25',
        defaultLanguage: 'no',
        tags: tags || ['nyheter', 'norge', 'daglig oppdatering', 'tech', 'vitalii.no'],
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: createReadStream(filePath),
    },
  });

  const videoId = response.data.id;
  const watchUrl = `https://youtube.com/watch?v=${videoId}`;
  console.log(`✅ Uploaded! ${watchUrl}`);
  return { videoId, watchUrl };
}

async function setThumbnail(videoId, thumbnailPath) {
  try {
    console.log('🖼️ Setting custom thumbnail...');
    await youtube.thumbnails.set({
      videoId,
      media: {
        mimeType: 'image/png',
        body: createReadStream(thumbnailPath),
      },
    });
    console.log('✅ Thumbnail set');
  } catch (e) {
    console.log(`⚠️ Thumbnail upload failed: ${e.message}`);
    if (e.message.includes('forbidden') || e.message.includes('403')) {
      console.log('💡 Hint: Channel must be verified (phone number) for custom thumbnails');
    }
  }
}

async function updateDraft(targetDate, videoId, watchUrl) {
  await supabase
    .from('daily_video_drafts')
    .update({
      youtube_url: watchUrl,
      youtube_video_id: videoId,
      status: 'completed',
    })
    .eq('target_date', targetDate);
  console.log(`📝 Draft updated for ${targetDate}`);
}

// ── Main ──

async function processVideo({ date, filePath }) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📅 Processing ${date}`);
  console.log(`${'═'.repeat(60)}\n`);

  // Verify file exists
  try {
    await stat(filePath);
  } catch {
    console.error(`❌ File not found: ${filePath}`);
    return null;
  }

  // 1. Fetch data
  console.log('📊 Fetching draft and articles...');
  const { draft, articles } = await fetchDraftAndArticles(date);
  console.log(`   Found ${articles.length} articles`);

  // 2. Generate clickbait title + description
  console.log('\n🎯 Generating clickbait title & description...');
  let title, description, tags;
  try {
    const meta = await generateClickbaitMeta(articles, date, draft);
    title = meta.title;
    description = meta.description;
    tags = meta.tags;
  } catch (e) {
    console.log(`⚠️ Clickbait generation failed: ${e.message}`);
    const months = ['januar','februar','mars','april','mai','juni','juli','august','september','oktober','november','desember'];
    const d = new Date(date);
    const displayDate = `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    title = `🔥 ${articles.length} tech-nyheter — ${displayDate}`;
    description = `Daglig nyhetssammendrag fra vitalii.no — ${displayDate}`;
    tags = ['nyheter', 'norge', 'daglig oppdatering', 'tech', 'vitalii.no'];
  }

  console.log(`   Title: ${title}`);
  console.log(`   Description: ${description.substring(0, 100)}...`);

  // 3. Generate AI thumbnail
  console.log('\n🖼️ Generating AI thumbnail...');
  const thumbnailPath = await generateAIThumbnail(articles, title, date);

  // 4. Upload to YouTube
  console.log('\n📤 Uploading to YouTube...');
  const result = await uploadToYouTube(filePath, title, description, tags);

  // 5. Set thumbnail
  if (result.videoId && thumbnailPath) {
    await setThumbnail(result.videoId, thumbnailPath);
  }

  // 6. Update database
  await updateDraft(date, result.videoId, result.watchUrl);

  console.log(`\n✅ Done: ${result.watchUrl}\n`);
  return result;
}

async function main() {
  console.log('🚀 Daily Video Re-Upload Script');
  console.log(`   Videos: ${VIDEO_MAP.length}`);
  console.log(`   Channel: New (smmshaman@gmail.com)\n`);

  const results = [];

  for (const video of VIDEO_MAP) {
    try {
      const result = await processVideo(video);
      if (result) results.push({ date: video.date, ...result });
    } catch (e) {
      console.error(`❌ Failed for ${video.date}: ${e.message}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📋 Results:');
  for (const r of results) {
    console.log(`   ${r.date}: ${r.watchUrl}`);
  }
  console.log('═'.repeat(60));
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
