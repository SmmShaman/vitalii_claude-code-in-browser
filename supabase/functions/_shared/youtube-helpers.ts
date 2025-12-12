/**
 * YouTube API Helpers
 *
 * Helper functions for uploading videos to YouTube using OAuth 2.0
 */

interface YouTubeConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
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
