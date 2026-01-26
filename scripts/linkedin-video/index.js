/**
 * LinkedIn Video Uploader
 *
 * Downloads video from Telegram and uploads to LinkedIn as native video
 *
 * Environment variables:
 * - TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_BOT_TOKEN
 * - LINKEDIN_ACCESS_TOKEN, LINKEDIN_PERSON_URN
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
  linkedin: {
    accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
    personUrn: process.env.LINKEDIN_PERSON_URN || '',
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
  const tempFile = path.join(tempDir, `linkedin_video_${messageId}_${Date.now()}.mp4`);

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
 * Register video upload with LinkedIn
 */
async function registerLinkedInUpload(fileSize) {
  console.log('📝 Registering LinkedIn video upload...');

  const response = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.linkedin.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: config.linkedin.personUrn,
        serviceRelationships: [
          {
            relationshipType: 'OWNER',
            identifier: 'urn:li:userGeneratedContent',
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register upload: ${error}`);
  }

  const data = await response.json();
  const uploadUrl = data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const asset = data.value.asset;

  console.log(`✅ Upload registered. Asset: ${asset}`);
  return { uploadUrl, asset };
}

/**
 * Upload video file to LinkedIn
 */
async function uploadVideoToLinkedIn(filePath, uploadUrl) {
  console.log('📤 Uploading video to LinkedIn...');

  const fileBuffer = await fs.readFile(filePath);
  console.log(`📁 File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.linkedin.accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload video: ${response.status} ${error}`);
  }

  console.log('✅ Video uploaded to LinkedIn');
}

/**
 * Create LinkedIn post with video
 */
async function createLinkedInPost(asset, title, description, articleUrl) {
  console.log('📝 Creating LinkedIn post with video...');

  const postText = `${title}\n\n${description}\n\n🔗 Read more: ${articleUrl}`;

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.linkedin.accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: config.linkedin.personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: postText,
          },
          shareMediaCategory: 'VIDEO',
          media: [
            {
              status: 'READY',
              media: asset,
            },
          ],
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create post: ${response.status} ${error}`);
  }

  const data = await response.json();
  const postId = data.id;

  console.log(`✅ LinkedIn post created: ${postId}`);
  return postId;
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

  return { title, description, articleUrl };
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

    // Build new success status
    const successStatus =
      `\n\n✅ <b>${platform} (${langLabel}): Опубліковано!</b>\n` +
      `📰 «${shortTitle}»\n` +
      `🔗 <a href="${postUrl}">Переглянути пост</a>\n` +
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
  const message =
    `✅ <b>Опубліковано в ${platform} (${langLabel})!</b>\n\n` +
    `📰 «${shortTitle}»\n\n` +
    `🔗 <a href="${postUrl}">Переглянути пост</a>\n` +
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
  console.log('🎬 LinkedIn Video Uploader Started');
  console.log(`📰 News ID: ${config.newsId}`);
  console.log(`🌍 Language: ${config.language}`);

  // Validate configuration
  if (!config.newsId) {
    throw new Error('NEWS_ID is required');
  }
  if (!config.linkedin.accessToken || !config.linkedin.personUrn) {
    throw new Error('LinkedIn credentials not configured');
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

  // Check if already posted to LinkedIn
  if (news.linkedin_post_id) {
    console.log(`⚠️ News already posted to LinkedIn: ${news.linkedin_post_id}`);
    console.log(`🔗 Existing post: https://www.linkedin.com/feed/update/${news.linkedin_post_id}`);
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

    // Get file size for LinkedIn
    const stats = await fs.stat(tempFile);

    // Register upload with LinkedIn
    const { uploadUrl, asset } = await registerLinkedInUpload(stats.size);

    // Upload video to LinkedIn
    await uploadVideoToLinkedIn(tempFile, uploadUrl);

    // Wait for processing (LinkedIn needs time to process video)
    console.log('⏳ Waiting for LinkedIn to process video...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get localized content
    const { title, description, articleUrl } = getLocalizedContent(news, config.language);

    // Create post with video
    const postId = await createLinkedInPost(asset, title, description, articleUrl);

    // Update database
    const { error: updateError } = await supabase
      .from('news')
      .update({
        linkedin_post_id: postId,
        linkedin_posted_at: new Date().toISOString(),
        linkedin_language: config.language,
      })
      .eq('id', config.newsId);

    if (updateError) {
      console.error('⚠️ Failed to update database:', updateError.message);
    }

    console.log('\n✅ LinkedIn Video Upload Complete!');
    console.log(`📰 News: ${news.title_en?.substring(0, 50)}...`);
    console.log(`🔗 Post ID: ${postId}`);

    // Generate LinkedIn post URL from postId
    // Format: urn:li:ugcPost:12345 -> https://www.linkedin.com/feed/update/urn:li:ugcPost:12345
    const postUrl = `https://www.linkedin.com/feed/update/${postId}`;
    console.log(`🔗 Post URL: ${postUrl}`);

    // Edit original Telegram message to show success status
    if (news.telegram_chat_id && news.telegram_message_id) {
      const newMessageText = await editTelegramMessage({
        botToken: config.telegram.botToken,
        chatId: news.telegram_chat_id,
        messageId: news.telegram_message_id,
        currentText: news.telegram_message_text || '',
        platform: 'LinkedIn',
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
