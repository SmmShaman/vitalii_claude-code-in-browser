/**
 * Instagram Video Uploader (Reels)
 *
 * Downloads video from Telegram and uploads to Instagram as a Reel
 *
 * Flow:
 * 1. Fetch news from Supabase
 * 2. Download video from Telegram via MTKruto
 * 3. Upload to Supabase Storage for public URL
 * 4. Create Instagram Reel via Graph API
 * 5. Update database
 *
 * Environment variables:
 * - TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN
 * - FACEBOOK_PAGE_ACCESS_TOKEN, INSTAGRAM_ACCOUNT_ID
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - NEWS_ID, LANGUAGE
 */

import { Client, StorageMemory } from '@mtkruto/node';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration
const config = {
  telegram: {
    apiId: parseInt(process.env.TELEGRAM_API_ID || '0'),
    apiHash: process.env.TELEGRAM_API_HASH || '',
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  instagram: {
    accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || '',
    accountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  newsId: process.env.NEWS_ID || '',
  language: process.env.LANGUAGE || 'en',
};

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

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
  const tempFile = path.join(tempDir, `instagram_video_${messageId}_${Date.now()}.mp4`);

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
 * Upload video to Supabase Storage
 */
async function uploadToSupabaseStorage(filePath, newsId) {
  console.log('📤 Uploading video to Supabase Storage...');

  const fileBuffer = await fs.readFile(filePath);
  const fileName = `instagram_reels/${newsId}_${Date.now()}.mp4`;

  console.log(`📁 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
  console.log(`📁 Storage path: ${fileName}`);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('news-videos')
    .upload(fileName, fileBuffer, {
      contentType: 'video/mp4',
      upsert: true,
    });

  if (error) {
    // Try creating bucket if it doesn't exist
    if (error.message?.includes('Bucket not found')) {
      console.log('📦 Creating news-videos bucket...');
      await supabase.storage.createBucket('news-videos', {
        public: true,
        fileSizeLimit: 1073741824, // 1GB
      });

      // Retry upload
      const { data: retryData, error: retryError } = await supabase.storage
        .from('news-videos')
        .upload(fileName, fileBuffer, {
          contentType: 'video/mp4',
          upsert: true,
        });

      if (retryError) {
        throw new Error(`Storage upload failed: ${retryError.message}`);
      }
    } else {
      throw new Error(`Storage upload failed: ${error.message}`);
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('news-videos')
    .getPublicUrl(fileName);

  console.log(`✅ Uploaded to: ${urlData.publicUrl}`);
  return urlData.publicUrl;
}

/**
 * Create Instagram Reel container
 */
async function createInstagramReelContainer(videoUrl, caption) {
  console.log('📸 Creating Instagram Reel container...');

  const params = new URLSearchParams({
    access_token: config.instagram.accessToken,
    media_type: 'REELS',
    video_url: videoUrl,
    caption: caption,
    share_to_feed: 'true',
  });

  const response = await fetch(
    `${GRAPH_API_BASE}/${config.instagram.accountId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorCode = data.error?.code;
    const errorMessage = data.error?.message;
    console.error('❌ Failed to create container:', data.error);

    let troubleshootingHint = '';
    if (errorCode === 10) {
      troubleshootingHint = ' Token missing instagram_content_publish scope.';
    } else if (errorCode === 100) {
      troubleshootingHint = ' Check video URL is public HTTPS, MP4 format, 3-90s duration, max 1GB.';
    }

    throw new Error(`Error #${errorCode}: ${errorMessage}${troubleshootingHint}`);
  }

  console.log(`✅ Container created: ${data.id}`);
  return data.id;
}

/**
 * Wait for container to be ready (poll status)
 */
async function waitForContainerReady(containerId) {
  console.log('⏳ Waiting for video processing...');

  const maxAttempts = 30; // Max 5 minutes (30 * 10s)
  let attempts = 0;
  let status = 'IN_PROGRESS';

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s
    attempts++;

    console.log(`   Checking status (attempt ${attempts}/${maxAttempts})...`);

    const response = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${config.instagram.accessToken}`
    );
    const data = await response.json();

    status = data.status_code || data.status || 'UNKNOWN';
    console.log(`   Status: ${status}`);

    if (data.error) {
      throw new Error(`Container status check failed: ${data.error.message}`);
    }

    if (status === 'ERROR') {
      throw new Error('Video processing failed. Check video format (MP4), duration (3-90s), size (max 1GB).');
    }

    if (status === 'FINISHED') {
      console.log('✅ Video processing completed!');
      return;
    }
  }

  if (status === 'IN_PROGRESS') {
    throw new Error('Video processing timeout. Video may be too large or unsupported format.');
  }
}

/**
 * Publish Instagram Reel
 */
async function publishInstagramReel(containerId) {
  console.log('📤 Publishing Instagram Reel...');

  const response = await fetch(
    `${GRAPH_API_BASE}/${config.instagram.accountId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        access_token: config.instagram.accessToken,
        creation_id: containerId,
      }).toString(),
    }
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Publish failed: ${data.error?.message || 'Unknown error'}`);
  }

  const mediaId = data.id;
  console.log(`✅ Reel published: ${mediaId}`);

  // Get permalink
  const permalinkResponse = await fetch(
    `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${config.instagram.accessToken}`
  );
  const permalinkData = await permalinkResponse.json();
  const postUrl = permalinkData.permalink || `https://instagram.com/reel/${mediaId}`;

  return { mediaId, postUrl };
}

/**
 * Get news content in specified language
 */
function getLocalizedContent(news, language) {
  const titleField = `title_${language}`;
  const descriptionField = `description_${language}`;
  const slugField = `slug_${language}`;

  const title = news[titleField] || news.title_en || news.original_title || 'News';
  const description = (news[descriptionField] || news.description_en || '').substring(0, 500);
  const slug = news[slugField] || news.slug_en;
  const articleUrl = `https://vitalii.no/news/${slug}`;
  const tags = news.tags || [];

  return { title, description, articleUrl, tags };
}

/**
 * Format Instagram caption with hashtags
 */
function formatCaption(title, description, url, tags = []) {
  const link = `\n\n${url}`;
  const hashtagText = tags.length > 0 ? `\n\n${tags.map(t => `#${t.replace(/[^a-zA-Z0-9]/g, '')}`).join(' ')}` : '';

  // Instagram has 2200 char limit
  const maxDescLength = 2200 - title.length - link.length - hashtagText.length - 10;
  const trimmedDesc = description.length > maxDescLength
    ? description.substring(0, maxDescLength - 3) + '...'
    : description;

  return `${title}\n\n${trimmedDesc}${link}${hashtagText}`;
}

/**
 * Track social post in database
 */
async function createSocialPostRecord(newsId, language, caption, mediaUrl) {
  try {
    const { data, error } = await supabase
      .from('social_posts')
      .insert({
        content_type: 'news',
        content_id: newsId,
        platform: 'instagram',
        language: language,
        post_content: caption,
        media_urls: [mediaUrl],
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.warn('⚠️ Failed to create social post record:', error.message);
      return null;
    }
    return data;
  } catch (e) {
    console.warn('⚠️ Failed to create social post record:', e.message);
    return null;
  }
}

/**
 * Update social post record with success
 */
async function updateSocialPostSuccess(recordId, mediaId, postUrl) {
  if (!recordId) return;
  try {
    await supabase
      .from('social_posts')
      .update({
        external_post_id: mediaId,
        post_url: postUrl,
        status: 'success',
        posted_at: new Date().toISOString(),
      })
      .eq('id', recordId);
  } catch (e) {
    console.warn('⚠️ Failed to update social post record:', e.message);
  }
}

/**
 * Update social post record with failure
 */
async function updateSocialPostFailed(recordId, error) {
  if (!recordId) return;
  try {
    await supabase
      .from('social_posts')
      .update({
        status: 'failed',
        error_message: error,
      })
      .eq('id', recordId);
  } catch (e) {
    console.warn('⚠️ Failed to update social post record:', e.message);
  }
}

/**
 * Edit the original Telegram message to show success status
 * Replaces the "processing" status with "published" status
 */
async function editTelegramMessage({
  botToken,
  chatId,
  messageId,
  currentText,
  platform,
  language,
  postUrl,
  articleUrl,
  title,
}) {
  if (!botToken || !chatId || !messageId) {
    console.log('⚠️ Cannot edit message: missing bot token, chat ID, or message ID');
    return false;
  }

  try {
    const langLabel = language.toUpperCase();
    const shortTitle = title.substring(0, 80) + (title.length > 80 ? '...' : '');
    const viewText = platform === 'Instagram' ? 'Reel' : 'пост';

    // Build new success status
    const successStatus =
      `\n\n✅ <b>${platform} (${langLabel}): Опубліковано!</b>\n` +
      `📰 «${shortTitle}»\n` +
      `🔗 <a href="${postUrl}">Переглянути ${viewText}</a>\n` +
      `📖 <a href="${articleUrl}">Читати статтю</a>`;

    // Remove old processing status from text
    // Patterns for different platforms:
    // LinkedIn: ⏳ <b>Відео завантажується в LinkedIn (EN)...</b>...
    // Instagram: ⏳ <b>Instagram Reel (EN) обробляється...</b>...
    // Facebook: 📘 <b>Facebook (EN): 🎬 Відео обробляється...</b>...
    const processingPatterns = [
      /\n\n⏳ <b>Відео завантажується в LinkedIn.*?<\/b>[\s\S]*?хвилин[и]?/gi,
      /\n\n⏳ <b>Instagram Reel.*?обробляється.*?<\/b>[\s\S]*?хвилин/gi,
      /\n\n📘 <b>Facebook.*?Відео обробляється.*?<\/b>[\s\S]*?хвилин[и]?/gi,
    ];

    let newText = currentText || '';
    for (const pattern of processingPatterns) {
      newText = newText.replace(pattern, '');
    }

    // Add success status
    newText = newText + successStatus;

    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/editMessageText`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to edit Telegram message:', errorText);

      // Fallback: if edit failed (>48 hours), send new message
      if (errorText.includes("message can't be edited") || errorText.includes('message is not modified')) {
        console.log('⚠️ Message cannot be edited, sending new message as fallback...');
        return await sendFallbackMessage(botToken, chatId, messageId, platform, langLabel, postUrl, articleUrl, shortTitle);
      }
      return false;
    }

    console.log('✅ Telegram message edited successfully');
    return newText;
  } catch (error) {
    console.error('❌ Error editing Telegram message:', error.message);
    return false;
  }
}

/**
 * Fallback: send a new message if edit fails (message too old)
 */
async function sendFallbackMessage(botToken, chatId, replyToMessageId, platform, langLabel, postUrl, articleUrl, shortTitle) {
  const viewText = platform === 'Instagram' ? 'Reel' : 'пост';
  const message =
    `✅ <b>Опубліковано в ${platform} (${langLabel})!</b>\n\n` +
    `📰 «${shortTitle}»\n\n` +
    `🔗 <a href="${postUrl}">Переглянути ${viewText}</a>\n` +
    `📖 <a href="${articleUrl}">Читати статтю</a>`;

  const body = {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (replyToMessageId) {
    body.reply_to_message_id = replyToMessageId;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    console.error('❌ Fallback message also failed');
    return false;
  }

  console.log('📨 Fallback message sent successfully');
  return true;
}

/**
 * Main function
 */
async function main() {
  console.log('🎬 Instagram Video Uploader Started');
  console.log(`📰 News ID: ${config.newsId}`);
  console.log(`🌍 Language: ${config.language}`);

  // Validate configuration
  if (!config.newsId) {
    throw new Error('NEWS_ID is required');
  }
  if (!config.instagram.accessToken || !config.instagram.accountId) {
    throw new Error('Instagram credentials not configured');
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

  // Check if already posted to Instagram
  if (news.instagram_post_id) {
    console.log(`⚠️ News already posted to Instagram: ${news.instagram_post_id}`);
    console.log('⏭️ Skipping to avoid duplicate');
    process.exit(0);
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

  // Get localized content
  const { title, description, articleUrl, tags } = getLocalizedContent(news, config.language);
  const caption = formatCaption(title, description, articleUrl, tags);

  console.log(`📝 Caption length: ${caption.length} chars`);

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
  let publicVideoUrl = null;
  let socialPostRecord = null;

  try {
    // Download video from Telegram
    tempFile = await downloadTelegramVideo(client, parsed.channel, parsed.messageId);

    // Upload to Supabase Storage for public URL
    publicVideoUrl = await uploadToSupabaseStorage(tempFile, config.newsId);

    // Create tracking record
    socialPostRecord = await createSocialPostRecord(config.newsId, config.language, caption, publicVideoUrl);

    // Create Instagram Reel container
    const containerId = await createInstagramReelContainer(publicVideoUrl, caption);

    // Wait for processing
    await waitForContainerReady(containerId);

    // Publish the Reel
    const { mediaId, postUrl } = await publishInstagramReel(containerId);

    // Update tracking record
    await updateSocialPostSuccess(socialPostRecord?.id, mediaId, postUrl);

    // Update news record with Instagram info
    const { error: updateError } = await supabase
      .from('news')
      .update({
        instagram_post_id: mediaId,
        instagram_posted_at: new Date().toISOString(),
        instagram_language: config.language,
      })
      .eq('id', config.newsId);

    if (updateError) {
      console.error('⚠️ Failed to update news record:', updateError.message);
    }

    console.log('\n✅ Instagram Reel Upload Complete!');
    console.log(`📰 News: ${title.substring(0, 50)}...`);
    console.log(`🎬 Media ID: ${mediaId}`);
    console.log(`🔗 Post URL: ${postUrl}`);

    // Edit original Telegram message to show success status
    if (news.telegram_chat_id && news.telegram_message_id) {
      const newMessageText = await editTelegramMessage({
        botToken: config.telegram.botToken,
        chatId: news.telegram_chat_id,
        messageId: news.telegram_message_id,
        currentText: news.telegram_message_text || '',
        platform: 'Instagram',
        language: config.language,
        postUrl: postUrl,
        articleUrl: articleUrl,
        title: title,
      });

      // Save updated message text to DB for next platform
      if (newMessageText) {
        await supabase
          .from('news')
          .update({ telegram_message_text: newMessageText })
          .eq('id', config.newsId);
        console.log('📝 Updated telegram_message_text in DB');
      }
    } else {
      console.log('⚠️ No telegram_chat_id or telegram_message_id stored - skipping notification');
    }

  } catch (error) {
    // Update tracking record with failure
    await updateSocialPostFailed(socialPostRecord?.id, error.message);
    throw error;

  } finally {
    // Cleanup temp file
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
