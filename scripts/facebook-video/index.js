/**
 * Facebook Video Uploader
 *
 * Downloads video from Telegram and uploads to Facebook Page as native video
 *
 * Environment variables:
 * - TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN
 * - FACEBOOK_PAGE_ACCESS_TOKEN, FACEBOOK_PAGE_ID
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - NEWS_ID, LANGUAGE
 */

import { Client, StorageMemory } from '@mtkruto/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Configuration
const config = {
  telegram: {
    apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  facebook: {
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    pageId: process.env.FACEBOOK_PAGE_ID || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  newsId: process.env.NEWS_ID || '',
  language: process.env.LANGUAGE || 'en',
};

// Initialize Supabase client
const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

/**
 * Parse Telegram embed URL to extract channel and message ID
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

  const message = await client.getMessage(channel, messageId);

  if (!message) {
    throw new Error('Message not found');
  }

  let fileId = null;
  let fileSize = 0;

  if (message.video) {
    fileId = message.video.fileId;
    fileSize = message.video.fileSize || 0;
    console.log(`🎬 Found video: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  } else if (message.document?.mimeType?.startsWith('video/')) {
    fileId = message.document.fileId;
    fileSize = message.document.fileSize || 0;
    console.log(`📄 Found video document: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  } else if (message.animation) {
    fileId = message.animation.fileId;
    fileSize = message.animation.fileSize || 0;
    console.log(`🎞️ Found animation: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
  } else {
    throw new Error('No video in message');
  }

  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `facebook_video_${messageId}_${Date.now()}.mp4`);

  const fsSync = await import('fs');
  const writeStream = fsSync.createWriteStream(tempFile);

  let downloadedBytes = 0;

  for await (const chunk of client.download(fileId)) {
    writeStream.write(chunk);
    downloadedBytes += chunk.length;
  }

  writeStream.end();
  await new Promise((resolve, reject) => {
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const stats = await fs.stat(tempFile);
  console.log(`✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

  return tempFile;
}

/**
 * Start Facebook video upload session (resumable upload)
 */
async function startFacebookUpload(fileSize) {
  console.log('📝 Starting Facebook video upload session...');

  const params = new URLSearchParams({
    upload_phase: 'start',
    file_size: String(fileSize),
    access_token: config.facebook.pageAccessToken,
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${config.facebook.pageId}/videos?${params}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to start upload: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  console.log(`✅ Upload session started: ${data.upload_session_id}`);

  return {
    uploadSessionId: data.upload_session_id,
    videoId: data.video_id,
    startOffset: data.start_offset || '0',
    endOffset: data.end_offset || String(fileSize),
  };
}

/**
 * Transfer video chunks to Facebook
 */
async function transferVideoChunk(uploadSessionId, startOffset, filePath, fileSize) {
  console.log(`📤 Uploading video chunk from offset ${startOffset}...`);

  const fileBuffer = await fs.readFile(filePath);

  // Create form data with the video chunk
  const formData = new FormData();
  formData.append('upload_phase', 'transfer');
  formData.append('upload_session_id', uploadSessionId);
  formData.append('start_offset', startOffset);
  formData.append('access_token', config.facebook.pageAccessToken);
  formData.append('video_file_chunk', new Blob([fileBuffer]), 'video.mp4');

  const response = await fetch(
    `${GRAPH_API_BASE}/${config.facebook.pageId}/videos`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to transfer chunk: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  console.log(`✅ Chunk uploaded. Next offset: ${data.start_offset || 'complete'}`);

  return {
    startOffset: data.start_offset,
    endOffset: data.end_offset,
  };
}

/**
 * Finish Facebook video upload and publish
 */
async function finishFacebookUpload(uploadSessionId, title, description) {
  console.log('📝 Finishing Facebook video upload...');

  const params = new URLSearchParams({
    upload_phase: 'finish',
    upload_session_id: uploadSessionId,
    access_token: config.facebook.pageAccessToken,
    title: title.substring(0, 255), // Facebook title limit
    description: description,
    published: 'true',
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${config.facebook.pageId}/videos?${params}`,
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to finish upload: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const videoId = data.id || data.video_id;
  const postUrl = `https://facebook.com/${videoId}`;

  console.log(`✅ Facebook video published: ${postUrl}`);

  return {
    videoId,
    postUrl,
    success: data.success !== false,
  };
}

/**
 * Upload video to Facebook using resumable upload
 */
async function uploadVideoToFacebook(filePath, title, description) {
  const stats = await fs.stat(filePath);
  const fileSize = stats.size;

  console.log(`📁 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

  // Step 1: Start upload session
  const session = await startFacebookUpload(fileSize);

  // Step 2: Transfer video (single chunk for simplicity, can be enhanced for very large files)
  await transferVideoChunk(session.uploadSessionId, session.startOffset, filePath, fileSize);

  // Step 3: Finish upload and publish
  const result = await finishFacebookUpload(session.uploadSessionId, title, description);

  return result;
}

/**
 * Get news content in specified language
 */
function getLocalizedContent(news, language) {
  const titleField = `title_${language}`;
  const descriptionField = `description_${language}`;
  const slugField = `slug_${language}`;

  const title = news[titleField] || news.title_en || news.original_title || 'News';
  const description = (news[descriptionField] || news.description_en || '').substring(0, 2000);
  const slug = news[slugField] || news.slug_en;
  const articleUrl = `https://vitalii.no/news/${slug}`;

  return { title, description, articleUrl };
}

/**
 * Format description for Facebook video post
 */
function formatFacebookDescription(title, description, articleUrl, tags = []) {
  const hashtagText = tags.length > 0
    ? `\n\n${tags.slice(0, 5).map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`).join(' ')}`
    : '';

  return `${description}\n\n🔗 Read more: ${articleUrl}${hashtagText}`;
}

/**
 * Update social_media_posts tracking table
 */
async function updateSocialMediaPost(newsId, videoId, postUrl, language, contentType = 'news') {
  console.log('📊 Updating social_media_posts tracking...');

  try {
    // Check if record already exists
    const { data: existing } = await supabase
      .from('social_media_posts')
      .select('id')
      .eq('content_id', newsId)
      .eq('platform', 'facebook')
      .eq('language', language)
      .single();

    if (existing) {
      // Update existing record
      await supabase
        .from('social_media_posts')
        .update({
          platform_post_id: videoId,
          platform_post_url: postUrl,
          status: 'posted',
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      console.log('✅ Updated existing social_media_posts record');
    } else {
      // Create new record
      await supabase
        .from('social_media_posts')
        .insert({
          content_type: contentType,
          content_id: newsId,
          platform: 'facebook',
          language: language,
          platform_post_id: videoId,
          platform_post_url: postUrl,
          status: 'posted',
          posted_at: new Date().toISOString(),
        });
      console.log('✅ Created new social_media_posts record');
    }
  } catch (error) {
    console.error('⚠️ Failed to update social_media_posts:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('📘 Facebook Video Uploader Started');
  console.log(`📰 News ID: ${config.newsId}`);
  console.log(`🌍 Language: ${config.language}`);

  // Validate configuration
  if (!config.newsId) {
    throw new Error('NEWS_ID is required');
  }
  if (!config.facebook.pageAccessToken || !config.facebook.pageId) {
    throw new Error('Facebook credentials not configured');
  }
  if (!config.telegram.apiId || !config.telegram.apiHash || !config.telegram.botToken) {
    throw new Error('Telegram credentials not configured');
  }

  // Get news from database
  console.log('📊 Fetching news from database...');
  const { data: news, error: newsError } = await supabase
    .from('news')
    .select('*')
    .eq('id', config.newsId)
    .single();

  if (newsError || !news) {
    throw new Error(`News not found: ${config.newsId}`);
  }

  // Get original video URL
  const videoUrl = news.original_video_url || news.video_url;
  if (!videoUrl || !videoUrl.includes('t.me')) {
    throw new Error(`No Telegram video URL found. video_url: ${news.video_url}, original_video_url: ${news.original_video_url}`);
  }

  const parsed = parseTelegramUrl(videoUrl);
  if (!parsed) {
    throw new Error(`Cannot parse Telegram URL: ${videoUrl}`);
  }

  console.log(`📱 Telegram: @${parsed.channel} message ${parsed.messageId}`);

  // Initialize Telegram client
  console.log('🔌 Connecting to Telegram...');
  const client = new Client({
    storage: new StorageMemory(),
    apiId: config.telegram.apiId,
    apiHash: config.telegram.apiHash,
  });

  await client.start({ botToken: config.telegram.botToken });
  console.log('✅ Connected to Telegram');

  let tempFile = null;

  try {
    // Download video from Telegram
    tempFile = await downloadTelegramVideo(client, parsed.channel, parsed.messageId);

    // Get localized content
    const { title, description, articleUrl } = getLocalizedContent(news, config.language);

    // Format description for Facebook
    const fbDescription = formatFacebookDescription(title, description, articleUrl, news.tags || []);

    // Upload video to Facebook
    const result = await uploadVideoToFacebook(tempFile, title, fbDescription);

    if (!result.success && !result.videoId) {
      throw new Error('Facebook video upload failed');
    }

    // Update social_media_posts tracking table
    await updateSocialMediaPost(config.newsId, result.videoId, result.postUrl, config.language);

    console.log('\n✅ Facebook Video Upload Complete!');
    console.log(`📰 News: ${news.title_en?.substring(0, 50)}...`);
    console.log(`🎬 Video ID: ${result.videoId}`);
    console.log(`🔗 Post URL: ${result.postUrl}`);

  } finally {
    // Cleanup
    if (tempFile) {
      try {
        await fs.unlink(tempFile);
        console.log('🗑️ Cleaned up temp file');
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    await client.disconnect();
    console.log('🔌 Disconnected from Telegram');
  }
}

// Run
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
