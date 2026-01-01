/**
 * YouTube API Helpers
 *
 * Helper functions for uploading videos to YouTube using OAuth 2.0
 * Includes GramJS (grm) integration for downloading large videos from Telegram
 */

// Version for deployment verification
export const YOUTUBE_HELPERS_VERSION = "2025-01-01-v7-gramjs";

// GramJS (grm) imports for Telegram MTProto - Deno port
import { TelegramClient, Api } from "https://deno.land/x/grm@v0.3.0/mod.ts";
import { StringSession } from "https://deno.land/x/grm@v0.3.0/sessions/mod.ts";

// Export Client type for external use
export type GramJSClient = TelegramClient;

// Keep MTKruto imports as fallback (commented out for now)
// import { Client, StorageMemory } from "https://deno.land/x/mtkruto@0.77.1/mod.ts";
// export type MTKrutoClient = Client;

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

// ============================================
// SHARED GRAMJS CLIENT MANAGEMENT
// Create ONE client per batch to avoid FLOOD_WAIT
// ============================================

/**
 * Create and start a shared GramJS client
 * Call this ONCE at the start of a batch, then reuse for all videos
 */
export async function createGramJSClient(): Promise<TelegramClient | null> {
  const apiId = Deno.env.get("TELEGRAM_API_ID");
  const apiHash = Deno.env.get("TELEGRAM_API_HASH");
  const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

  if (!apiId || !apiHash || !botToken) {
    console.error('❌ GramJS credentials not configured');
    console.error(`  TELEGRAM_API_ID: ${apiId ? 'SET' : 'MISSING'}`);
    console.error(`  TELEGRAM_API_HASH: ${apiHash ? 'SET' : 'MISSING'}`);
    console.error(`  TELEGRAM_BOT_TOKEN: ${botToken ? 'SET' : 'MISSING'}`);
    return null;
  }

  console.log(`🔌 Creating shared GramJS client... (youtube-helpers ${YOUTUBE_HELPERS_VERSION})`);

  // Use empty StringSession for bot authentication
  const stringSession = new StringSession("");

  const client = new TelegramClient(
    stringSession,
    Number(apiId),
    apiHash,
    {
      connectionRetries: 3,
    }
  );

  try {
    console.log('🚀 Starting GramJS client with bot token...');
    await client.start({
      botAuthToken: botToken,
    });
    console.log('✅ GramJS client started (shared instance)');
    return client;
  } catch (error: any) {
    console.error('❌ Failed to start GramJS client:', error?.message || error);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error stack:', error?.stack?.substring(0, 500));

    // Check for specific errors
    if (error?.message?.includes('FLOOD_WAIT')) {
      const waitSeconds = error.message.match(/FLOOD_WAIT_(\d+)/)?.[1];
      console.error(`⏰ FLOOD_WAIT on auth! Must wait ${waitSeconds} seconds`);
    }
    if (error?.message?.includes('AUTH_KEY')) {
      console.error('🔑 AUTH_KEY error - check Telegram API credentials');
    }

    return null;
  }
}

/**
 * Disconnect the shared GramJS client
 * Call this ONCE at the end of a batch
 */
export async function disconnectGramJSClient(client: TelegramClient): Promise<void> {
  try {
    await client.disconnect();
    console.log('🔌 GramJS client disconnected (shared instance)');
  } catch (e) {
    // Ignore disconnect errors
  }
}

// Backward compatibility aliases
export const createMTKrutoClient = createGramJSClient;
export const disconnectMTKrutoClient = disconnectGramJSClient;
export type MTKrutoClient = TelegramClient;

// Result type for detailed error reporting
export interface DownloadResult {
  success: boolean;
  data?: Uint8Array;
  error?: string;
  stage?: string;
}

/**
 * Download video using an EXISTING GramJS client (no new auth!)
 * Use this inside loops to avoid FLOOD_WAIT
 */
export async function downloadVideoWithClient(
  client: TelegramClient,
  channelUsername: string,
  messageId: number
): Promise<Uint8Array | null> {
  const result = await downloadVideoWithClientDetailed(client, channelUsername, messageId);
  if (!result.success) {
    console.error(`❌ Download failed at stage: ${result.stage}, error: ${result.error}`);
  }
  return result.data || null;
}

/**
 * Download video with detailed error reporting (GramJS implementation)
 */
export async function downloadVideoWithClientDetailed(
  client: TelegramClient,
  channelUsername: string,
  messageId: number
): Promise<DownloadResult> {
  try {
    // Format channel username (remove @ if present)
    const cleanUsername = channelUsername.startsWith('@')
      ? channelUsername.slice(1)
      : channelUsername;

    console.log(`📥 Fetching message ${messageId} from @${cleanUsername}... (GramJS)`);

    // GramJS uses getMessages with entity and options
    const messages = await client.getMessages(cleanUsername, { ids: [messageId] });

    if (!messages || messages.length === 0 || !messages[0]) {
      return { success: false, error: 'Message not found', stage: 'getMessages' };
    }

    const message = messages[0];
    console.log(`✅ Message found, type: ${message.className}`);

    // GramJS uses message.media for all media types
    const media = message.media;
    if (!media) {
      return { success: false, error: 'Message has no media (text only)', stage: 'checkVideo' };
    }

    // Check media type
    const mediaClassName = media.className;
    console.log(`📎 Media class: ${mediaClassName}`);

    // Check if it's a video-like media
    const isVideo = mediaClassName === 'MessageMediaDocument' || mediaClassName === 'MessageMediaVideo';
    const isPhoto = mediaClassName === 'MessageMediaPhoto';

    if (isPhoto) {
      return { success: false, error: `Message has no video (found: photo)`, stage: 'checkVideo' };
    }

    if (!isVideo) {
      return { success: false, error: `Unsupported media type: ${mediaClassName}`, stage: 'checkVideo' };
    }

    // Get file size if available
    let fileSize = 0;
    let mimeType = 'unknown';
    if (media.document) {
      fileSize = Number(media.document.size || 0);
      mimeType = media.document.mimeType || 'unknown';
    }
    const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    console.log(`📊 Media: document, MIME: ${mimeType}, Size: ${fileSizeMB} MB`);

    // Check if file is too large for /tmp (512 MB limit on Pro)
    const maxSize = 500 * 1024 * 1024; // 500 MB safety margin
    if (fileSize > maxSize) {
      return { success: false, error: `Video too large: ${fileSizeMB} MB (max 500 MB)`, stage: 'sizeCheck' };
    }

    console.log('⬇️ Downloading video via GramJS...');

    // GramJS downloadMedia returns Buffer directly
    let downloadedBytes = 0;
    const buffer = await client.downloadMedia(message, {
      progressCallback: (received: number, total: number) => {
        downloadedBytes = received;
        // Log progress every 10 MB
        if (received % (10 * 1024 * 1024) < 1024 * 1024) {
          const progressMB = (received / (1024 * 1024)).toFixed(2);
          const totalMB = (total / (1024 * 1024)).toFixed(2);
          console.log(`📥 Downloaded: ${progressMB} MB / ${totalMB} MB`);
        }
      }
    });

    if (!buffer) {
      return {
        success: false,
        error: `Download returned null buffer (media: ${mimeType})`,
        stage: 'download'
      };
    }

    // GramJS returns Buffer, convert to Uint8Array
    const videoBuffer = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

    const downloadedMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ Download complete: ${downloadedMB} MB (GramJS)`);

    return { success: true, data: videoBuffer };

  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error('❌ GramJS download error:', errorMsg);
    console.error('❌ Error name:', error?.name);
    console.error('❌ Error stack:', error?.stack?.substring(0, 300));

    // Check for specific errors
    let stage = 'download';
    if (errorMsg.includes('FLOOD_WAIT')) {
      const waitSeconds = errorMsg.match(/FLOOD_WAIT_(\d+)/)?.[1];
      console.error(`⏰ FLOOD_WAIT detected! Must wait ${waitSeconds} seconds`);
      stage = 'FLOOD_WAIT';
    }
    if (errorMsg.includes('AUTH_KEY')) {
      console.error('🔑 Authentication error - GramJS client may need restart');
      stage = 'AUTH_KEY';
    }

    return { success: false, error: errorMsg, stage };
  }
}

// ============================================
// LEGACY FUNCTION (creates new client each time)
// Keep for backward compatibility but prefer shared client
// ============================================

/**
 * Download video from Telegram using GramJS (MTProto)
 * Supports files up to 2GB (vs 20MB limit of Bot API)
 *
 * ⚠️ DEPRECATED: Creates new client each call = FLOOD_WAIT risk
 * Use createGramJSClient() + downloadVideoWithClient() instead
 */
export async function downloadTelegramVideoGramJS(
  channelUsername: string,
  messageId: number
): Promise<Uint8Array | null> {
  console.warn('⚠️ Using legacy downloadTelegramVideoGramJS - consider using shared client');

  const client = await createGramJSClient();
  if (!client) return null;

  try {
    return await downloadVideoWithClient(client, channelUsername, messageId);
  } finally {
    await disconnectGramJSClient(client);
  }
}

// Backward compatibility alias
export const downloadTelegramVideoMTKruto = downloadTelegramVideoGramJS;
