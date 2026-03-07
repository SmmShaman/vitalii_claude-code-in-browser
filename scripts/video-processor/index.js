/**
 * Video Processor for GitHub Actions
 *
 * Downloads videos from Telegram channels using MTKruto (MTProto),
 * enhances them with Remotion (AI script + voiceover + animated subtitles),
 * and uploads to YouTube, then updates Supabase database.
 *
 * Environment variables:
 * - TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN
 * - YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY (for script generation)
 * - OPENAI_API_KEY (for TTS voiceover)
 * - NEWS_ID (optional), MODE (single/batch), BATCH_LIMIT
 * - SKIP_REMOTION (optional) - set to 'true' to skip Remotion rendering
 */

import { Client, StorageMemory } from '@mtkruto/node';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { generateScript } from './generate-script.js';
import { generateVoiceover } from './generate-voiceover.js';

// Configuration
const config = {
  telegram: {
    apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  mode: process.env.MODE || 'batch',
  newsId: process.env.NEWS_ID || '',
  batchLimit: parseInt(process.env.BATCH_LIMIT || '10'),
};

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

// Initialize YouTube OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  config.youtube.clientId,
  config.youtube.clientSecret
);
oauth2Client.setCredentials({
  refresh_token: config.youtube.refreshToken,
});
const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

/**
 * Parse Telegram embed URL to extract channel and message ID
 * Example: https://t.me/channelname/12345?embed=1
 */
function parseTelegramUrl(url) {
  const match = url.match(/t\.me\/([^\/]+)\/(\d+)/);
  if (!match) return null;
  return {
    channel: match[1],
    messageId: parseInt(match[2]),
  };
}

/**
 * Download video from Telegram using MTKruto
 */
async function downloadTelegramVideo(client, channel, messageId) {
  console.log(`📥 Downloading video from @${channel} message ${messageId}...`);

  try {
    // Get the message using getMessage (singular) - returns Message | null
    const message = await client.getMessage(channel, messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    console.log(`📨 Message type: ${message.constructor.name || typeof message}`);

    // Check for video - MTKruto uses message.video for MessageVideo type
    let fileId = null;
    let fileSize = 0;
    let mimeType = 'video/mp4';

    if (message.video) {
      fileId = message.video.fileId;
      fileSize = message.video.fileSize || 0;
      mimeType = message.video.mimeType || 'video/mp4';
      console.log(`🎬 Found video: ${(fileSize / 1024 / 1024).toFixed(2)} MB, ${mimeType}`);
    } else if (message.document) {
      // Check if document is a video
      if (!message.document.mimeType?.startsWith('video/')) {
        throw new Error(`Not a video: ${message.document.mimeType}`);
      }
      fileId = message.document.fileId;
      fileSize = message.document.fileSize || 0;
      mimeType = message.document.mimeType;
      console.log(`📄 Found video document: ${(fileSize / 1024 / 1024).toFixed(2)} MB, ${mimeType}`);
    } else if (message.animation) {
      fileId = message.animation.fileId;
      fileSize = message.animation.fileSize || 0;
      mimeType = message.animation.mimeType || 'video/mp4';
      console.log(`🎞️ Found animation: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    } else {
      // Log available properties to debug
      const props = Object.keys(message).filter(k => !k.startsWith('_'));
      throw new Error(`No video in message. Available: ${props.join(', ')}`);
    }

    if (!fileId) {
      throw new Error('No fileId found in message');
    }

    // Download to temp file using async generator
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `video_${messageId}_${Date.now()}.mp4`);

    console.log(`📁 Saving to: ${tempFile}`);

    // Use fs.createWriteStream for writing chunks
    const fsSync = await import('fs');
    const writeStream = fsSync.createWriteStream(tempFile);

    let downloadedBytes = 0;
    let lastLogPercent = 0;

    // Download using async generator
    for await (const chunk of client.download(fileId)) {
      writeStream.write(chunk);
      downloadedBytes += chunk.length;

      const percent = fileSize > 0 ? Math.round((downloadedBytes / fileSize) * 100) : 0;
      if (percent >= lastLogPercent + 20) {
        console.log(`📥 Progress: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(2)} MB)`);
        lastLogPercent = percent;
      }
    }

    writeStream.end();

    // Wait for write to complete
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    const stats = await fs.stat(tempFile);
    console.log(`✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    return tempFile;
  } catch (error) {
    console.error(`❌ Download failed: ${error.message}`);
    throw error;
  }
}

/**
 * Upload video to YouTube
 */
async function uploadToYouTube(filePath, title, description) {
  console.log(`📤 Uploading to YouTube: ${title}`);

  try {
    const fileSize = (await fs.stat(filePath)).size;
    console.log(`📁 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: title.substring(0, 100), // YouTube title limit
          description: description || '',
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'unlisted',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: (await import('fs')).createReadStream(filePath),
      },
    });

    const videoId = response.data.id;
    const embedUrl = `https://youtube.com/embed/${videoId}`;

    console.log(`✅ Uploaded! Video ID: ${videoId}`);
    console.log(`🔗 Embed URL: ${embedUrl}`);

    return {
      videoId,
      embedUrl,
      watchUrl: `https://youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    console.error(`❌ YouTube upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Render the downloaded video through Remotion with AI-generated
 * voiceover and animated subtitles.
 *
 * @param {string} inputVideoPath - Path to the downloaded raw video
 * @param {object} news - News record from Supabase
 * @returns {Promise<{outputPath: string, durationSeconds: number} | null>}
 */
async function enhanceWithRemotion(inputVideoPath, news) {
  const skipRemotion = process.env.SKIP_REMOTION === 'true';
  if (skipRemotion) {
    console.log('⏭️ SKIP_REMOTION=true, skipping Remotion rendering');
    return null;
  }

  // Check if AI credentials are available
  const hasAI = process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY;
  const hasTTS = process.env.ZVUKOGRAM_TOKEN && process.env.ZVUKOGRAM_EMAIL;

  if (!hasAI || !hasTTS) {
    console.log('⚠️ Missing AI/TTS credentials, skipping Remotion enhancement');
    console.log(`   AI (Azure): ${hasAI ? '✅' : '❌'}, TTS (Zvukogram): ${hasTTS ? '✅' : '❌'}`);
    return null;
  }

  let voiceoverPath = null;

  try {
    // ── Step A: Generate AI script ──
    const articleText = news.original_content || news.original_title || '';
    if (!articleText || articleText.length < 20) {
      console.log('⚠️ Article text too short for script generation, skipping');
      return null;
    }

    console.log('\n🤖 Step A: Generating AI script...');
    const script = await generateScript(articleText, 'en', 45);

    // ── Step B: Generate voiceover + timestamps ──
    console.log('\n🎙️ Step B: Generating voiceover...');
    const voiceover = await generateVoiceover(script, 'en');
    voiceoverPath = voiceover.audioPath;

    // ── Step C: Render with Remotion CLI ──
    console.log('\n🎬 Step C: Rendering with Remotion...');
    const outputPath = path.join(os.tmpdir(), `remotion_output_${Date.now()}.mp4`);
    const remotionProjectDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../remotion-video');

    const headline = (news.title_en || news.original_title || 'News').substring(0, 80);

    // Copy media files to Remotion's public/ dir so they're served via localhost
    const publicDir = path.join(remotionProjectDir, 'public');
    await fs.mkdir(publicDir, { recursive: true });

    const videoFilename = path.basename(inputVideoPath);
    const audioFilename = path.basename(voiceover.audioPath);
    await fs.copyFile(inputVideoPath, path.join(publicDir, videoFilename));
    await fs.copyFile(voiceover.audioPath, path.join(publicDir, audioFilename));

    const props = JSON.stringify({
      videoSrc: videoFilename,
      voiceoverSrc: audioFilename,
      subtitles: voiceover.subtitles,
      headline: headline,
      originalVideoDurationInSeconds: voiceover.durationSeconds + 2,
    });

    // Write props to a temp file (CLI has arg length limits)
    const propsFile = path.join(os.tmpdir(), `remotion_props_${Date.now()}.json`);
    await fs.writeFile(propsFile, props);

    const compositionId = 'NewsVideoVertical'; // 9:16 for Shorts/Reels/TikTok

    const cmd = [
      'npx', 'remotion', 'render',
      compositionId,
      outputPath,
      `--props=${propsFile}`,
      '--log=warn',
    ].join(' ');

    console.log(`🖥️ Running: ${cmd}`);
    console.log(`📂 CWD: ${remotionProjectDir}`);

    execSync(cmd, {
      cwd: remotionProjectDir,
      stdio: 'inherit',
      timeout: 900_000, // 15 min timeout
    });

    // Verify output exists
    const outputStats = await fs.stat(outputPath);
    console.log(`✅ Remotion output: ${(outputStats.size / 1024 / 1024).toFixed(2)} MB`);

    // Cleanup temp files
    await fs.unlink(propsFile).catch(() => {});
    await fs.unlink(path.join(publicDir, videoFilename)).catch(() => {});
    await fs.unlink(path.join(publicDir, audioFilename)).catch(() => {});

    return { outputPath, durationSeconds: voiceover.durationSeconds };

  } catch (error) {
    console.error(`⚠️ Remotion enhancement failed: ${error.message}`);
    console.log('↩️ Falling back to raw video upload');
    // Cleanup voiceover on failure
    if (voiceoverPath) await fs.unlink(voiceoverPath).catch(() => {});
    return null;
  }
}

/**
 * Process a single news item
 */
async function processNewsItem(client, news) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📰 Processing: ${news.id}`);
  console.log(`📝 Title: ${news.original_title?.substring(0, 50)}...`);
  console.log(`🔗 Video URL: ${news.video_url}`);

  const parsed = parseTelegramUrl(news.video_url);
  if (!parsed) {
    console.log(`⚠️ Cannot parse Telegram URL: ${news.video_url}`);
    return { success: false, error: 'Invalid Telegram URL' };
  }

  let tempFile = null;
  let remotionOutput = null;
  let voiceoverFile = null;

  try {
    // Step 1: Download from Telegram
    tempFile = await downloadTelegramVideo(client, parsed.channel, parsed.messageId);

    // Step 2: Enhance with Remotion (AI script + voiceover + animated subtitles)
    const enhancement = await enhanceWithRemotion(tempFile, news);

    // Determine which file to upload
    let uploadFile = tempFile;
    if (enhancement) {
      remotionOutput = enhancement.outputPath;
      uploadFile = remotionOutput;
      console.log('🎬 Uploading Remotion-enhanced video');
    } else {
      console.log('📹 Uploading raw video (no Remotion enhancement)');
    }

    // Step 3: Upload to YouTube (ALWAYS English title)
    const title = news.title_en || 'News Video';
    const description = news.description_en || '';

    const youtubeResult = await uploadToYouTube(uploadFile, title, description);

    // Step 4: Update database (save original Telegram URL for LinkedIn)
    const { error: updateError } = await supabase
      .from('news')
      .update({
        original_video_url: news.video_url,  // Save original Telegram URL!
        video_url: youtubeResult.embedUrl,
        video_type: 'youtube',
        updated_at: new Date().toISOString(),
      })
      .eq('id', news.id);

    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    console.log(`✅ Successfully processed news ${news.id}`);

    return {
      success: true,
      videoId: youtubeResult.videoId,
      embedUrl: youtubeResult.embedUrl,
    };

  } catch (error) {
    console.error(`❌ Failed to process news ${news.id}: ${error.message}`);

    // If message has no video (false positive from scraper), clear video fields
    const isNotVideo = error.message?.includes('No video in message');

    const updateFields = {
      video_processing_error: error.message,
      video_processing_attempted_at: new Date().toISOString(),
    };

    if (isNotVideo) {
      updateFields.video_url = null;
      updateFields.video_type = null;
      updateFields.original_video_url = null;
      console.log(`🧹 Clearing false video fields — message has no video`);
    }

    await supabase
      .from('news')
      .update(updateFields)
      .eq('id', news.id);

    return { success: false, error: error.message };

  } finally {
    // Cleanup temp files
    for (const f of [tempFile, remotionOutput, voiceoverFile]) {
      if (f) {
        try {
          await fs.unlink(f);
          console.log(`🗑️ Cleaned up: ${path.basename(f)}`);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    }
  }
}

/**
 * Get pending videos from database
 * Only gets PUBLISHED news with telegram_embed videos
 */
async function getPendingVideos(limit, specificId = null) {
  let query = supabase
    .from('news')
    .select('id, original_title, title_en, description_en, original_content, video_url, video_type')
    .eq('video_type', 'telegram_embed')
    .eq('is_published', true)  // Only published news!
    .not('video_url', 'is', null);

  if (specificId) {
    query = query.eq('id', specificId);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch pending videos: ${error.message}`);
  }

  return data || [];
}

/**
 * Main function
 */
async function main() {
  console.log('🎬 Video Processor Started');
  console.log(`📋 Mode: ${config.mode}`);
  console.log(`📊 Batch limit: ${config.batchLimit}`);

  // Validate configuration
  if (!config.telegram.apiId || !config.telegram.apiHash || !config.telegram.botToken) {
    throw new Error('Missing Telegram credentials');
  }
  if (!config.youtube.clientId || !config.youtube.clientSecret || !config.youtube.refreshToken) {
    throw new Error('Missing YouTube credentials');
  }
  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  // Initialize MTKruto client
  console.log('🔌 Connecting to Telegram...');
  const client = new Client({
    storage: new StorageMemory(),
    apiId: config.telegram.apiId,
    apiHash: config.telegram.apiHash,
  });

  await client.start({ botToken: config.telegram.botToken });
  console.log('✅ Connected to Telegram');

  try {
    // Get videos to process
    const videos = await getPendingVideos(
      config.mode === 'single' ? 1 : config.batchLimit,
      config.mode === 'single' ? config.newsId : null
    );

    console.log(`📹 Found ${videos.length} video(s) to process`);

    if (videos.length === 0) {
      console.log('✅ No pending videos to process');
      return;
    }

    // Process each video
    const results = {
      total: videos.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const video of videos) {
      const result = await processNewsItem(client, video);

      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({ id: video.id, error: result.error });
      }

      // Small delay between videos to avoid rate limits
      if (videos.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Processing Summary:');
    console.log(`   Total: ${results.total}`);
    console.log(`   Success: ${results.success}`);
    console.log(`   Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(e => console.log(`   - ${e.id}: ${e.error}`));
    }

  } finally {
    // Disconnect MTKruto client
    await client.disconnect();
    console.log('🔌 Disconnected from Telegram');
  }

  console.log('\n✅ Video Processor Finished');
}

// Run
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
