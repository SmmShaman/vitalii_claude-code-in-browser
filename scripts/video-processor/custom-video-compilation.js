/**
 * Custom Video Compilation Generator
 *
 * Renders a custom video from a Telegram /video request.
 * Reads draft data from custom_video_drafts table, generates voiceover,
 * downloads images/music, renders via Remotion, uploads to YouTube.
 *
 * Pipeline:
 *  1. Fetch draft from Supabase
 *  2. TTS generates voiceover per segment
 *  3. Download images + background music
 *  4. Visual director plans phrase-level visuals
 *  5. Remotion renders multi-segment video
 *  6. Upload to YouTube
 *  7. Notify Telegram via custom-video-bot
 *
 * Env vars: DRAFT_ID, FORMAT, LANGUAGE, YOUTUBE_PRIVACY, SKIP_YOUTUBE
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { generateVoiceover, VOICE_PRESETS } from './generate-voiceover.js';
import { downloadPexelsMedia } from './pexels-media.js';

// ── Config ──

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
);

const DRAFT_ID = process.env.DRAFT_ID || '';
const FORMAT = process.env.FORMAT || 'horizontal';
const LANGUAGE = process.env.LANGUAGE || 'en';
const YOUTUBE_PRIVACY = process.env.YOUTUBE_PRIVACY || 'unlisted';
const SKIP_YOUTUBE = process.env.SKIP_YOUTUBE === 'true';

if (!DRAFT_ID) {
  console.error('❌ DRAFT_ID is required');
  process.exit(1);
}

// YouTube OAuth setup
let youtube = null;
if (!SKIP_YOUTUBE && process.env.YOUTUBE_CLIENT_ID) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  );
  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
  });
  youtube = google.youtube({ version: 'v3', auth: oauth2Client });
}

// ── Helpers ──

// Image magic bytes for validation
const IMAGE_SIGNATURES = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
  gif: [0x47, 0x49, 0x46],
};

// Audio magic bytes for validation
const AUDIO_SIGNATURES = {
  mp3_id3: [0x49, 0x44, 0x33],       // ID3 tag
  mp3_sync: [0xFF, 0xFB],            // MP3 sync word
  mp3_sync2: [0xFF, 0xFA],           // MP3 sync word variant
  mp3_sync3: [0xFF, 0xF3],           // MP3 sync word variant
  mp3_sync4: [0xFF, 0xF2],           // MP3 sync word variant
  ogg: [0x4F, 0x67, 0x67, 0x53],     // OggS
  wav: [0x52, 0x49, 0x46, 0x46],     // RIFF (shared with WebP)
};

function isValidImage(buffer) {
  if (buffer.length < 8) return false;
  for (const [, sig] of Object.entries(IMAGE_SIGNATURES)) {
    if (sig.every((byte, i) => buffer[i] === byte)) return true;
  }
  return false;
}

function isValidAudio(buffer) {
  if (buffer.length < 4) return false;
  for (const [, sig] of Object.entries(AUDIO_SIGNATURES)) {
    if (sig.every((byte, i) => buffer[i] === byte)) return true;
  }
  return false;
}

/**
 * Download a file with format validation.
 * @param {string} url
 * @param {string} destPath
 * @param {'image'|'audio'|'none'} validateAs - validation mode
 */
async function downloadFile(url, destPath, validateAs = 'image') {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VideoBot/1.0)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 1000) return false; // Too small, probably an error page

    // Validate format via magic bytes
    if (validateAs === 'image' && !isValidImage(buffer)) {
      console.log(`    ⚠️ Invalid image (not JPG/PNG/WebP): ${url.slice(0, 80)}`);
      return false;
    }
    if (validateAs === 'audio' && !isValidAudio(buffer)) {
      console.log(`    ⚠️ Invalid audio (not MP3/OGG/WAV): ${url.slice(0, 80)}`);
      return false;
    }

    await fs.writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

async function notifyComplete(draftId, youtubeVideoId, youtubeUrl) {
  try {
    const baseUrl = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    await fetch(`${baseUrl}/functions/v1/custom-video-bot?action=notify_complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ draftId, youtubeVideoId, youtubeUrl }),
    });
  } catch (e) {
    console.error('❌ Failed to notify:', e.message);
  }
}

async function notifyTelegram(text) {
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch { /* non-critical */ }
}

// ── Main Pipeline ──

async function main() {
  console.log(`\n🎬 Custom Video Compilation v1`);
  console.log(`   Draft: ${DRAFT_ID}`);
  console.log(`   Format: ${FORMAT}`);
  console.log(`   Language: ${LANGUAGE}`);
  console.log(`   YouTube: ${SKIP_YOUTUBE ? 'SKIP' : YOUTUBE_PRIVACY}`);

  // Step 1: Fetch draft
  console.log('\n📋 Step 1: Fetching draft...');
  const { data: draft, error } = await supabase
    .from('custom_video_drafts')
    .select('*')
    .eq('id', DRAFT_ID)
    .single();

  if (error || !draft) {
    console.error('❌ Draft not found:', error?.message);
    process.exit(1);
  }

  const segments = draft.segment_scripts || [];
  const scenario = draft.visual_scenario?.segments || [];
  const imageSources = draft.image_sources || {};

  console.log(`   Segments: ${segments.length}`);
  console.log(`   Language: ${draft.language || LANGUAGE}`);
  console.log(`   Style: ${draft.video_style}`);
  console.log(`   Duration target: ${draft.target_duration_seconds}s`);

  const lang = draft.language || LANGUAGE;

  // Setup paths
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  const remotionProjectDir = path.join(scriptDir, '..', 'remotion-video');
  const publicDir = path.join(remotionProjectDir, 'public');
  await fs.mkdir(publicDir, { recursive: true });

  // Step 2: Generate voiceover per segment
  console.log('\n🎙️ Step 2: Generating voiceovers...');
  const voicePreset = VOICE_PRESETS[lang] || VOICE_PRESETS.en;

  const remotionSegments = [];
  let totalDuration = 0;

  // Intro voiceover
  let introAudioFilename = null;
  let introDuration = 5; // default
  if (draft.intro_script) {
    try {
      const introResult = await generateVoiceover(draft.intro_script, lang, {
        voice: voicePreset.male || voicePreset.default,
      });
      if (introResult.audioPath) {
        const introFilename = `custom_intro_${Date.now()}.mp3`;
        await fs.copyFile(introResult.audioPath, path.join(publicDir, introFilename));
        introAudioFilename = introFilename;
        introDuration = Number(introResult.durationSeconds || introResult.duration) || 5;
        console.log(`  ✅ Intro: ${introDuration}s`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Intro voiceover failed: ${e.message}`);
    }
  }
  totalDuration += introDuration;

  // Segment voiceovers
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const vis = scenario[i] || {};
    const segImages = (imageSources[String(i)] || []);

    console.log(`\n  🎙️ Segment ${i + 1}: ${seg.topic}`);

    let audioFilename = null;
    let subtitles = [];
    let segDuration = 15; // default

    // Generate voiceover
    try {
      const voResult = await generateVoiceover(seg.text, lang, {
        voice: voicePreset.male || voicePreset.default,
      });
      if (voResult.audioPath) {
        audioFilename = `custom_seg${i}_${Date.now()}.mp3`;
        await fs.copyFile(voResult.audioPath, path.join(publicDir, audioFilename));
        subtitles = voResult.subtitles || [];
        segDuration = Number(voResult.durationSeconds || voResult.duration) || Math.ceil((seg.text || '').split(/\s+/).length / 2.5);
        console.log(`    ✅ Audio: ${segDuration}s, ${subtitles.length} subtitle words`);
      }
    } catch (e) {
      console.warn(`    ⚠️ Voiceover failed: ${e.message}`);
      segDuration = Math.ceil((seg.text || '').split(/\s+/).length / 2.5);
    }

    // Download images to public/
    const alternateImages = [];
    let primaryImage = null;
    for (let j = 0; j < Math.min(segImages.length, 8); j++) {
      const imgUrl = segImages[j];
      const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      const imgFilename = `custom_img_${i}_${j}_${Date.now()}.${ext}`;
      const ok = await downloadFile(imgUrl, path.join(publicDir, imgFilename));
      if (ok) {
        if (!primaryImage) primaryImage = imgFilename;
        else alternateImages.push(imgFilename);
        console.log(`    🖼 Image ${j}: ${imgFilename}`);
      }
    }

    const segData = {
      headline: vis.headline || seg.topic || `Segment ${i + 1}`,
      imageSrc: primaryImage || '',
      alternateImages,
      imageCycleDuration: 4,
      voiceoverSrc: audioFilename || '',
      subtitles,
      durationSeconds: segDuration,
      category: vis.category || 'portfolio',
      accentColor: vis.accentColor || '#FF7A00',
      keyQuote: vis.keyQuote || '',
      mood: vis.mood || 'corporate',
      transition: vis.transition || 'fade',
      textReveal: vis.textReveal || 'default',
      facts: vis.facts || [],
      statsVisualType: vis.statsVisualType || 'list',
    };

    remotionSegments.push(segData);
    totalDuration += segDuration + 2; // +2 for divider
  }

  // Outro voiceover
  let outroAudioFilename = null;
  let outroDuration = 5;
  if (draft.outro_script) {
    try {
      const outroResult = await generateVoiceover(draft.outro_script, lang, {
        voice: voicePreset.male || voicePreset.default,
      });
      if (outroResult.audioPath) {
        const outroFilename = `custom_outro_${Date.now()}.mp3`;
        await fs.copyFile(outroResult.audioPath, path.join(publicDir, outroFilename));
        outroAudioFilename = outroFilename;
        outroDuration = Number(outroResult.durationSeconds || outroResult.duration) || 5;
        console.log(`  ✅ Outro: ${outroDuration}s`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Outro voiceover failed: ${e.message}`);
    }
  }
  totalDuration += outroDuration;

  console.log(`\n⏱ Total duration: ${totalDuration}s`);

  // Step 3: Background music
  console.log('\n🎵 Step 3: Setting up background music...');
  let bgmSrc = null;

  // Ensure bgm subdirectory exists
  await fs.mkdir(path.join(publicDir, 'bgm'), { recursive: true }).catch(() => {});

  // Try downloading from Pixabay URL
  if (draft.bgm_url) {
    try {
      const bgmFilename = `custom_bgm_${Date.now()}.mp3`;
      const ok = await downloadFile(draft.bgm_url, path.join(publicDir, bgmFilename), 'audio');
      if (ok) {
        bgmSrc = bgmFilename;
        console.log(`  ✅ Downloaded Pixabay BGM: ${bgmFilename}`);
      } else {
        console.log(`  ⚠️ Pixabay BGM download failed or invalid audio: ${draft.bgm_url.slice(0, 80)}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ BGM download failed: ${e.message}`);
    }
  }

  // Fallback: local BGM file
  if (!bgmSrc) {
    const localBgm = draft.bgm_local_file || 'bgm.mp3';
    try {
      // Try bgm/ subdirectory first
      const bgmSubPath = path.join(publicDir, localBgm);
      await fs.access(bgmSubPath);
      bgmSrc = localBgm;
      console.log(`  ✅ Using local BGM: ${localBgm}`);
    } catch {
      // Try root bgm.mp3
      try {
        await fs.access(path.join(publicDir, 'bgm.mp3'));
        bgmSrc = 'bgm.mp3';
        console.log(`  ✅ Using root bgm.mp3`);
      } catch {
        console.log(`  ⚠️ No BGM available — video will render without background music`);
      }
    }
  }

  // Step 4: Copy intro assets (logo)
  console.log('\n🖼️ Step 4: Preparing intro assets...');
  const introBackgroundImages = [];
  const heroDir = path.join(scriptDir, '..', '..', 'public', 'images', 'hero');
  const logoPath = path.join(scriptDir, '..', '..', 'public', 'logo.png');

  // Copy hero images for intro background
  const heroFiles = ['about.webp', 'services.webp', 'projects.webp', 'skills.webp', 'news.webp', 'blog.webp'];
  for (const hf of heroFiles) {
    try {
      await fs.copyFile(path.join(heroDir, hf), path.join(publicDir, `intro_${hf}`));
      introBackgroundImages.push(`intro_${hf}`);
    } catch { /* skip */ }
  }

  let introProfileImageSrc = null;
  try {
    await fs.copyFile(logoPath, path.join(publicDir, 'intro_logo.png'));
    introProfileImageSrc = 'intro_logo.png';
  } catch { /* skip */ }

  console.log(`  📸 ${introBackgroundImages.length} bg images, profile: ${introProfileImageSrc ? 'yes' : 'no'}`);

  // Step 5: Render with Remotion
  console.log('\n🎬 Step 5: Rendering with Remotion...');
  const outputPath = path.join(os.tmpdir(), `custom_video_${Date.now()}.mp4`);

  const dividerDuration = 2;
  const props = JSON.stringify({
    date: new Date().toISOString().split('T')[0],
    showTitle: draft.youtube_title || 'Vitalii Berbeha | vitalii.no',
    showType: 'custom',
    language: lang,
    segments: remotionSegments,
    voiceoverSrc: '',
    subtitles: [],
    totalDurationSeconds: totalDuration,
    introDurationSeconds: introDuration,
    outroDurationSeconds: outroDuration,
    dividerDurationSeconds: dividerDuration,
    accentColor: '#FF7A00',
    introVoiceoverSrc: introAudioFilename || undefined,
    outroVoiceoverSrc: outroAudioFilename || undefined,
    bgmSrc: bgmSrc || undefined,
    bgmVolume: 0.25,
    bgmDuckVolume: 0.08,
    introBackgroundImages: introBackgroundImages.length > 0 ? introBackgroundImages : undefined,
    introProfileImageSrc: introProfileImageSrc || undefined,
  });

  const propsFile = path.join(os.tmpdir(), `custom_props_${Date.now()}.json`);
  await fs.writeFile(propsFile, props);

  const compositionId = FORMAT === 'horizontal' ? 'DailyNewsShowHorizontal' : 'DailyNewsShowVertical';
  console.log(`📐 Composition: ${compositionId}`);

  const cmd = `npx remotion render ${compositionId} ${outputPath} --props=${propsFile} --log=warn`;
  console.log(`🖥️ Running: ${cmd}`);
  execSync(cmd, { cwd: remotionProjectDir, stdio: 'inherit', timeout: 1800_000 });

  const outputStats = await fs.stat(outputPath);
  console.log(`✅ Rendered: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

  // Step 6: Upload to YouTube
  if (!SKIP_YOUTUBE && youtube) {
    console.log('\n📺 Step 6: Uploading to YouTube...');

    const title = (draft.youtube_title || 'Custom Video').slice(0, 100);
    const description = [
      draft.youtube_description || '',
      '',
      '🌐 Portfolio: https://vitalii.no',
      '📰 Blog: https://vitalii.no/blog',
      '',
      (draft.youtube_tags || []).map(t => `#${t.replace(/\s/g, '')}`).join(' '),
    ].join('\n');

    try {
      const uploadRes = await youtube.videos.insert({
        part: ['snippet', 'status'],
        requestBody: {
          snippet: {
            title,
            description,
            tags: draft.youtube_tags || [],
            categoryId: '22', // People & Blogs
            defaultLanguage: lang === 'ua' ? 'uk' : lang,
          },
          status: {
            privacyStatus: YOUTUBE_PRIVACY,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: createReadStream(outputPath),
        },
      });

      const videoId = uploadRes.data.id;
      const watchUrl = `https://youtube.com/watch?v=${videoId}`;
      const embedUrl = `https://youtube.com/embed/${videoId}`;

      console.log(`✅ YouTube upload complete!`);
      console.log(`   Video ID: ${videoId}`);
      console.log(`   URL: ${watchUrl}`);

      // Update draft in DB
      await supabase
        .from('custom_video_drafts')
        .update({
          youtube_video_id: videoId,
          youtube_url: watchUrl,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', DRAFT_ID);

      // Notify via edge function
      await notifyComplete(DRAFT_ID, videoId, watchUrl);
    } catch (e) {
      console.error('❌ YouTube upload failed:', e.message);
      await notifyTelegram(`❌ Custom video YouTube upload failed: ${e.message.slice(0, 200)}`);

      await supabase
        .from('custom_video_drafts')
        .update({
          status: 'failed',
          error_message: `YouTube upload failed: ${e.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', DRAFT_ID);
    }
  } else {
    console.log('\n⏭️ YouTube upload skipped');
    await supabase
      .from('custom_video_drafts')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', DRAFT_ID);

    // Notify via edge function so user gets structured Telegram message
    await notifyComplete(DRAFT_ID, '', '');
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  try { await fs.unlink(outputPath); } catch { /* ok */ }
  try { await fs.unlink(propsFile); } catch { /* ok */ }

  // Clean public dir custom + intro files
  const publicFiles = await fs.readdir(publicDir);
  for (const f of publicFiles) {
    if (f.startsWith('custom_') || f.startsWith('intro_')) {
      try { await fs.unlink(path.join(publicDir, f)); } catch { /* ok */ }
    }
  }

  console.log('\n🎉 Done!');
}

main().catch(err => {
  console.error('❌ Custom video compilation failed:', err);
  notifyTelegram(`❌ Custom video render crashed: ${err.message?.slice(0, 200)}`);
  process.exit(1);
});
