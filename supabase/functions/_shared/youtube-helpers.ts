/**
 * YouTube API Helpers
 *
 * Helper functions for uploading videos to YouTube using OAuth 2.0
 * Includes MTKruto integration for downloading large videos from Telegram
 */

// MTKruto imports for Telegram MTProto
// Updated to 0.3.1 (latest on deno.land/x) with StorageMemory to fix "this.storage.initialize is not a function" error
import { Client, StorageMemory } from "https://deno.land/x/mtkruto@0.3.1/mod.ts";

interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Get YouTube configuration from environment variables
 * Returns null if any required config is missing
 */
export function getYouTubeConfig(): YouTubeConfig | null {
  const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
  const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("YOUTUBE_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ YouTube configuration missing:');
    console.error(`  YOUTUBE_CLIENT_ID: ${clientId ? 'SET' : 'MISSING'}`);
    console.error(`  YOUTUBE_CLIENT_SECRET: ${clientSecret ? 'SET' : 'MISSING'}`);
    console.error(`  YOUTUBE_REFRESH_TOKEN: ${refreshToken ? 'SET' : 'MISSING'}`);
    return null;
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
  };
}

interface YouTubeUploadOptions {
  videoBuffer: Uint8Array;
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string; // "22" for People & Blogs, "25" for News & Politics
}

interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  embedUrl?: string;
  error?: string;
}

/**
 * Get a fresh access token using refresh token
 */
export async function getYouTubeAccessToken(config: YouTubeConfig): Promise<string> {
  console.log('🔑 Getting YouTube access token...');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await tokenResponse.json();
  console.log('✅ Access token obtained');
  return data.access_token;
}

/**
 * Upload video to YouTube as unlisted
 */
export async function uploadVideoToYouTube(
  accessToken: string,
  options: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  try {
    console.log('📤 Uploading video to YouTube...');
    console.log(`📹 Title: ${options.title}`);
    console.log(`📏 Size: ${(options.videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Step 1: Create video metadata
    const metadata = {
      snippet: {
        title: options.title,
        description: options.description,
        tags: options.tags || [],
        categoryId: options.categoryId || '22' // People & Blogs
      },
      status: {
        privacyStatus: 'unlisted', // unlisted = not in search, but shareable via link
        selfDeclaredMadeForKids: false
      }
    };

    // Step 2: Prepare multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Build multipart body
    const metadataPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const videoPart = delimiter +
      'Content-Type: video/mp4\r\n\r\n';

    // Combine parts
    const textEncoder = new TextEncoder();
    const metadataBytes = textEncoder.encode(metadataPart);
    const videoPartBytes = textEncoder.encode(videoPart);
    const closeDelimiterBytes = textEncoder.encode(closeDelimiter);

    const bodyLength = metadataBytes.length +
                      videoPartBytes.length +
                      options.videoBuffer.length +
                      closeDelimiterBytes.length;

    const body = new Uint8Array(bodyLength);
    let offset = 0;

    body.set(metadataBytes, offset);
    offset += metadataBytes.length;

    body.set(videoPartBytes, offset);
    offset += videoPartBytes.length;

    body.set(options.videoBuffer, offset);
    offset += options.videoBuffer.length;

    body.set(closeDelimiterBytes, offset);

    // Step 3: Upload to YouTube
    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': bodyLength.toString()
        },
        body: body
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('❌ YouTube upload failed:', errorText);

      return {
        success: false,
        error: `YouTube upload failed: ${uploadResponse.status} ${errorText}`
      };
    }

    const result = await uploadResponse.json();
    const videoId = result.id;

    console.log('✅ Video uploaded successfully!');
    console.log(`🎬 Video ID: ${videoId}`);
    console.log(`🔗 Watch URL: https://youtube.com/watch?v=${videoId}`);
    console.log(`📎 Embed URL: https://youtube.com/embed/${videoId}`);

    return {
      success: true,
      videoId: videoId,
      embedUrl: `https://youtube.com/embed/${videoId}`
    };

  } catch (error) {
    console.error('❌ Error uploading to YouTube:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Download video from Telegram using Bot API
 */
export async function downloadTelegramVideo(
  videoUrl: string,
  botToken: string
): Promise<Uint8Array | null> {
  try {
    console.log('⬇️ Downloading video from Telegram...');
    console.log(`🔗 URL: ${videoUrl}`);

    // If it's a CDN URL, download directly
    if (videoUrl.includes('telesco.pe') || videoUrl.includes('cdn')) {
      const response = await fetch(videoUrl);

      if (!response.ok) {
        throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const videoBuffer = new Uint8Array(arrayBuffer);

      console.log(`✅ Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      return videoBuffer;
    }

    // If it's a file_id, use Telegram Bot API
    // Extract file_id from URL or use directly
    const fileId = videoUrl;

    // Get file info
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );

    if (!fileInfoResponse.ok) {
      throw new Error('Failed to get file info from Telegram');
    }

    const fileInfo = await fileInfoResponse.json();

    if (!fileInfo.ok) {
      throw new Error(`Telegram API error: ${fileInfo.description}`);
    }

    const filePath = fileInfo.result.file_path;

    // Download file
    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
    const downloadResponse = await fetch(downloadUrl);

    if (!downloadResponse.ok) {
      throw new Error('Failed to download file from Telegram');
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const videoBuffer = new Uint8Array(arrayBuffer);

    console.log(`✅ Downloaded ${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB from Telegram Bot API`);
    return videoBuffer;

  } catch (error) {
    console.error('❌ Error downloading from Telegram:', error);
    return null;
  }
}

/**
 * Download video from Telegram using MTKruto (MTProto)
 * Supports files up to 2GB (vs 20MB limit of Bot API)
 */
export async function downloadTelegramVideoMTKruto(
  channelUsername: string,
  messageId: number
): Promise<Uint8Array | null> {
  const apiId = Deno.env.get("TELEGRAM_API_ID");
  const apiHash = Deno.env.get("TELEGRAM_API_HASH");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!apiId || !apiHash || !botToken) {
    console.error('❌ MTKruto credentials not configured');
    console.error(`  TELEGRAM_API_ID: ${apiId ? 'SET' : 'MISSING'}`);
    console.error(`  TELEGRAM_API_HASH: ${apiHash ? 'SET' : 'MISSING'}`);
    console.error(`  TELEGRAM_BOT_TOKEN: ${botToken ? 'SET' : 'MISSING'}`);
    return null;
  }

  console.log('🔌 Initializing MTKruto client...');

  // Initialize client with StorageMemory for in-memory session storage
  // Required for MTKruto 0.3.1+ (storage: null no longer works)
  const client = new Client({
    storage: new StorageMemory(),
    apiId: Number(apiId),
    apiHash: apiHash,
  });

  try {
    console.log('🚀 Starting MTKruto client with bot token...');
    await client.start({ botToken });
    console.log('✅ MTKruto client started');

    // Get messages from channel
    // Format channel username (remove @ if present)
    const cleanUsername = channelUsername.startsWith('@')
      ? channelUsername.slice(1)
      : channelUsername;

    console.log(`📥 Fetching message ${messageId} from @${cleanUsername}...`);

    // MTKruto 0.3.1 API: getMessages accepts array of IDs directly (not { ids: [...] })
    const messages = await client.getMessages(cleanUsername, [messageId]);

    if (!messages || messages.length === 0 || !messages[0]) {
      console.error('❌ Message not found');
      return null;
    }

    const message = messages[0];
    console.log(`✅ Message found, type: ${message.constructor.name}`);

    // Check if message has video
    if (!message.video && !message.document) {
      console.error('❌ Message does not contain video');
      return null;
    }

    const media = message.video || message.document;
    const fileSize = media?.fileSize || 0;
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`📊 Video size: ${fileSizeMB} MB`);

    // Check if file is too large for /tmp (512 MB limit on Pro)
    const maxSize = 500 * 1024 * 1024; // 500 MB safety margin
    if (fileSize > maxSize) {
      console.error(`❌ Video too large: ${fileSizeMB} MB (max 500 MB)`);
      return null;
    }

    console.log('⬇️ Downloading video via MTKruto...');

    // Download to memory
    const chunks: Uint8Array[] = [];
    let downloadedBytes = 0;

    for await (const chunk of client.download(message)) {
      chunks.push(chunk);
      downloadedBytes += chunk.length;

      // Log progress every 10 MB
      if (downloadedBytes % (10 * 1024 * 1024) < chunk.length) {
        const progressMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
        console.log(`📥 Downloaded: ${progressMB} MB / ${fileSizeMB} MB`);
      }
    }

    // Combine chunks into single buffer
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const videoBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      videoBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const downloadedMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ Download complete: ${downloadedMB} MB`);

    return videoBuffer;

  } catch (error) {
    console.error('❌ MTKruto download error:', error);
    return null;
  } finally {
    try {
      await client.disconnect();
      console.log('🔌 MTKruto client disconnected');
    } catch (e) {
      // Ignore disconnect errors
    }
  }
}
