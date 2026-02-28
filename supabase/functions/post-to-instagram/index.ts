import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  postToInstagram,
  formatInstagramCaption,
  isInstagramConfigured,
  debugInstagramToken
} from '../_shared/facebook-helpers.ts'
import {
  getContent,
  buildArticleUrl,
  createSocialPost,
  updateSocialPostSuccess,
  updateSocialPostFailed,
  wasAlreadyPosted,
  type ContentType,
  type Language
} from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Localized CTA for Instagram captions (used with AI teaser)
const INSTAGRAM_TEASER_CTA: Record<string, string> = {
  en: '🔗 Read on vitalii.no',
  no: '🔗 Les på vitalii.no',
  ua: '🔗 Читати на vitalii.no'
}

/**
 * Generate or fetch cached Instagram teaser
 */
async function getInstagramTeaser(
  recordId: string,
  contentType: 'news' | 'blog',
  language: 'en' | 'no' | 'ua',
  title: string,
  content: string
): Promise<string | null> {
  try {
    console.log(`🎯 Fetching/generating Instagram teaser (${language})...`)

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-social-teasers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        newsId: contentType === 'news' ? recordId : undefined,
        blogPostId: contentType === 'blog' ? recordId : undefined,
        title,
        content,
        contentType,
        platform: 'instagram',
        language
      })
    })

    if (!response.ok) {
      console.warn('⚠️ Instagram teaser generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    if (result.success && result.teaser) {
      console.log(`✅ Got Instagram teaser (cached: ${result.cached})`)
      return result.teaser
    }

    return null
  } catch (error: any) {
    console.warn('⚠️ Error getting Instagram teaser:', error.message)
    return null
  }
}

interface InstagramPostRequest {
  newsId?: string
  blogPostId?: string
  language: Language
  contentType: ContentType
  debug?: boolean  // Set to true to run token debug instead of posting
}

// Instagram aspect ratio limits: 4:5 (0.8) to 1.91:1 (1.91)
const INSTAGRAM_MIN_RATIO = 0.8   // 4:5 portrait
const INSTAGRAM_MAX_RATIO = 1.91  // 1.91:1 landscape

/**
 * Check image dimensions via fetch and validate aspect ratio for Instagram
 * Returns { valid, width, height, ratio } or null if check fails
 */
async function checkImageAspectRatio(imageUrl: string): Promise<{
  valid: boolean
  width?: number
  height?: number
  ratio?: number
  error?: string
} | null> {
  try {
    // Fetch first bytes to read image header for dimensions
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: { 'Range': 'bytes=0-65535' } // First 64KB for headers
    })

    if (!response.ok && response.status !== 206) {
      return { valid: false, error: `Image fetch failed: ${response.status}` }
    }

    const buffer = new Uint8Array(await response.arrayBuffer())

    // Check PNG (89 50 4E 47)
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      // PNG: IHDR chunk starts at byte 16, width at 16-19, height at 20-23
      if (buffer.length >= 24) {
        const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19]
        const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23]
        const ratio = width / height
        const valid = ratio >= INSTAGRAM_MIN_RATIO && ratio <= INSTAGRAM_MAX_RATIO
        return { valid, width, height, ratio }
      }
    }

    // Check JPEG (FF D8 FF)
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
      // JPEG: scan for SOF0 (FFC0) or SOF2 (FFC2) markers
      let offset = 2
      while (offset < buffer.length - 9) {
        if (buffer[offset] === 0xFF) {
          const marker = buffer[offset + 1]
          if (marker === 0xC0 || marker === 0xC2) {
            // SOF marker: height at offset+5, width at offset+7
            const height = (buffer[offset + 5] << 8) | buffer[offset + 6]
            const width = (buffer[offset + 7] << 8) | buffer[offset + 8]
            const ratio = width / height
            const valid = ratio >= INSTAGRAM_MIN_RATIO && ratio <= INSTAGRAM_MAX_RATIO
            return { valid, width, height, ratio }
          }
          // Skip to next marker
          const segmentLength = (buffer[offset + 2] << 8) | buffer[offset + 3]
          offset += 2 + segmentLength
        } else {
          offset++
        }
      }
    }

    // WebP check (52 49 46 46 ... 57 45 42 50)
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      // VP8 lossy: width/height at bytes 26-29
      if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
        if (buffer.length >= 30) {
          const width = (buffer[26] | (buffer[27] << 8)) & 0x3FFF
          const height = (buffer[28] | (buffer[29] << 8)) & 0x3FFF
          const ratio = width / height
          const valid = ratio >= INSTAGRAM_MIN_RATIO && ratio <= INSTAGRAM_MAX_RATIO
          return { valid, width, height, ratio }
        }
      }
    }

    // Could not determine dimensions
    console.log('⚠️ Could not determine image dimensions from headers')
    return null
  } catch (error: any) {
    console.warn(`⚠️ Image aspect ratio check failed: ${error.message}`)
    return null
  }
}

/**
 * Post content to Instagram Business Account
 * Supports both images and videos (Reels)
 * Uses Facebook Graph API for Instagram Business accounts
 * Version: 2026-02-28-v5 - Aspect ratio pre-validation + hasProcessedImage warning
 *
 * Debug mode: POST with { debug: true } to check token permissions
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let socialPostId: string | null = null

  try {
    const requestData: InstagramPostRequest = await req.json()
    console.log('📸 Instagram posting request:', requestData)

    // Debug mode - check token permissions
    if (requestData.debug) {
      console.log('🔍 Running Instagram token debug...')
      const debugInfo = await debugInstagramToken()
      return new Response(
        JSON.stringify({
          success: debugInfo.isValid && !debugInfo.error,
          debug: true,
          ...debugInfo
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate environment
    if (!isInstagramConfigured()) {
      throw new Error('Instagram credentials not configured. Set FACEBOOK_PAGE_ACCESS_TOKEN and INSTAGRAM_ACCOUNT_ID.')
    }

    const contentId = requestData.contentType === 'news'
      ? requestData.newsId
      : requestData.blogPostId

    if (!contentId) {
      throw new Error('Invalid request: must provide either newsId or blogPostId')
    }

    // Auto-expire stuck pending records (older than 10 minutes)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: expiredCount } = await supabase
      .from('social_media_posts')
      .update({ status: 'failed', error_message: 'Auto-expired: stuck pending >10min' })
      .eq('content_id', contentId)
      .eq('platform', 'instagram')
      .eq('language', requestData.language)
      .eq('status', 'pending')
      .lt('created_at', tenMinAgo)
    if (expiredCount && expiredCount > 0) {
      console.log(`🧹 Auto-expired ${expiredCount} stuck pending Instagram record(s)`)
    }

    // Check if already posted or pending (prevents race condition duplicates)
    const { posted, pending, postUrl: existingUrl } = await wasAlreadyPosted(
      contentId,
      requestData.contentType,
      'instagram',
      requestData.language
    )

    if (posted) {
      console.log('⚠️ Already posted to Instagram:', existingUrl)
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          postUrl: existingUrl,
          message: `Already posted to Instagram (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pending) {
      console.log('⏳ Instagram post is already pending/in-progress')
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          message: `Instagram post already in progress (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch content
    const content = await getContent(
      contentId,
      requestData.contentType,
      requestData.language
    )

    if (!content) {
      throw new Error(`Content not found: ${contentId}`)
    }

    // For Instagram Reels, we need a DIRECT video file URL (not Telegram post URL)
    // Valid video URLs:
    // - Direct file URLs ending in .mp4, .mov, etc.
    // - Telegram file API URLs (api.telegram.org/file/...)
    // - CDN URLs with video content
    // INVALID: Telegram post URLs like https://t.me/channel/12345
    const isValidVideoUrl = (url: string | undefined): boolean => {
      if (!url) return false
      // Check if it's a Telegram post URL (NOT a valid video file)
      if (url.match(/^https?:\/\/t\.me\/[^\/]+\/\d+/)) {
        console.log(`⚠️ URL is a Telegram post URL, not a direct video file: ${url}`)
        return false
      }
      // Check if it's a valid direct file URL
      const validExtensions = ['.mp4', '.mov', '.avi', '.webm', '.m4v']
      const hasVideoExtension = validExtensions.some(ext => url.toLowerCase().includes(ext))
      const isTelegramFileApi = url.includes('api.telegram.org/file/')
      return hasVideoExtension || isTelegramFileApi
    }

    // Get potential video URL (prefer original, fallback to processed)
    const potentialVideoUrl = content.originalVideoUrl ||
      (content.videoType !== 'youtube' ? content.videoUrl : null)

    // Only use video URL if it's a valid direct file URL
    const videoUrlForInstagram = isValidVideoUrl(potentialVideoUrl) ? potentialVideoUrl : null

    // Determine media type
    const hasVideo = !!videoUrlForInstagram
    const hasImage = !!content.imageUrl

    // Instagram requires an image or valid video
    if (!hasImage && !hasVideo) {
      // Provide specific error messages
      if (content.videoUrl && content.videoType === 'youtube') {
        throw new Error('Instagram cannot use YouTube videos. Upload the original video file or add an image.')
      }
      if (content.videoUrl && content.videoType === 'telegram_embed') {
        throw new Error('Instagram cannot use Telegram embed URLs. This post has no direct video file. Please add an image to post to Instagram.')
      }
      if (potentialVideoUrl && !isValidVideoUrl(potentialVideoUrl)) {
        throw new Error(`Instagram requires a direct video file URL (MP4), not a post URL. Current URL: ${potentialVideoUrl?.substring(0, 50)}...`)
      }
      throw new Error('Instagram requires an image or video. This content has no media attached.')
    }

    // Log fallback to image when video URL exists but isn't valid for direct posting
    if (!hasVideo && potentialVideoUrl && hasImage) {
      console.log(`📸 Instagram: Falling back to image (video URL "${potentialVideoUrl.substring(0, 50)}..." is not a direct file URL)`)
    }

    // Warn about aspect ratio risk when no processed image exists
    if (hasImage && !hasVideo && !content.hasProcessedImage) {
      console.warn('⚠️ Instagram: No processed image available — using original scraped image.')
      console.warn('⚠️ Original images may have invalid aspect ratio (Instagram requires 4:5 to 1.91:1).')
      console.warn('⚠️ Consider generating a processed image first via Telegram bot.')
    }

    console.log('📝 Content to post:', {
      title: content.title.substring(0, 50) + '...',
      descriptionLength: content.description.length,
      hasProcessedImage: content.hasProcessedImage,
      imageUrl: content.imageUrl?.substring(0, 50),
      videoUrl: content.videoUrl?.substring(0, 50),
      originalVideoUrl: content.originalVideoUrl?.substring(0, 50),
      videoUrlForInstagram: videoUrlForInstagram?.substring(0, 50),
      videoType: content.videoType,
      mediaType: hasVideo ? 'VIDEO/REELS' : 'IMAGE'
    })

    // Build article URL
    const articleUrl = buildArticleUrl(requestData.contentType, content.slug)

    // Generate or fetch cached Instagram teaser
    const teaser = await getInstagramTeaser(
      contentId,
      requestData.contentType,
      requestData.language,
      content.title,
      content.content || content.description
    )

    // Use AI teaser if available, otherwise fallback to basic format
    let caption: string
    if (teaser) {
      const cta = INSTAGRAM_TEASER_CTA[requestData.language] || INSTAGRAM_TEASER_CTA.en
      // Instagram: teaser already includes emojis and hashtags from AI prompt
      caption = `${teaser}\n\n${cta}`.substring(0, 2200)
      console.log('📝 Using AI-generated teaser for Instagram caption')
    } else {
      caption = formatInstagramCaption(
        content.title,
        content.description,
        articleUrl,
        content.tags || [],
        requestData.language
      )
      console.log('📝 No teaser available, using formatInstagramCaption fallback')
    }

    // Determine which media URL to use (prefer video for Reels)
    const mediaUrl = hasVideo ? videoUrlForInstagram! : content.imageUrl!

    // Pre-validate image aspect ratio before sending to Instagram API
    if (hasImage && !hasVideo) {
      const aspectCheck = await checkImageAspectRatio(mediaUrl)
      if (aspectCheck) {
        if (aspectCheck.valid) {
          console.log(`✅ Image aspect ratio OK: ${aspectCheck.width}x${aspectCheck.height} (ratio: ${aspectCheck.ratio?.toFixed(2)})`)
        } else {
          console.error(`❌ Image aspect ratio INVALID: ${aspectCheck.width}x${aspectCheck.height} (ratio: ${aspectCheck.ratio?.toFixed(2)})`)
          console.error(`❌ Instagram requires ratio between ${INSTAGRAM_MIN_RATIO} (4:5) and ${INSTAGRAM_MAX_RATIO} (1.91:1)`)
          throw new Error(
            `Image aspect ratio ${aspectCheck.ratio?.toFixed(2)} is outside Instagram's allowed range (4:5 to 1.91:1). ` +
            `Image is ${aspectCheck.width}x${aspectCheck.height}. Generate a processed image with proper aspect ratio first.`
          )
        }
      } else {
        console.log('ℹ️ Could not pre-validate image aspect ratio, proceeding with Instagram API')
      }
    }

    // Create tracking record (with race condition protection)
    const { post: socialPost, raceCondition } = await createSocialPost({
      contentType: requestData.contentType,
      contentId: contentId,
      platform: 'instagram',
      language: requestData.language,
      postContent: caption,
      mediaUrls: [mediaUrl]
    })

    if (socialPost) socialPostId = socialPost.id

    // 🛡️ RACE CONDITION PROTECTION
    if (raceCondition) {
      console.log('🛡️ Race condition detected - aborting to prevent duplicate post')
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          postUrl: socialPost?.platform_post_url,
          message: `Race condition: Instagram post already ${socialPost?.status || 'in progress'} (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Post to Instagram (video as Reels, or image)
    const result = await postToInstagram({
      imageUrl: hasImage && !hasVideo ? content.imageUrl : undefined,
      videoUrl: hasVideo ? videoUrlForInstagram : undefined,
      caption
    })

    if (result.success && result.mediaId) {
      const mediaTypeLabel = hasVideo ? 'Reel' : 'post'
      console.log(`✅ Posted ${mediaTypeLabel} to Instagram successfully:`, result.mediaId)

      // Update tracking record
      if (socialPost) {
        await updateSocialPostSuccess(
          socialPost.id,
          result.mediaId,
          result.postUrl || `https://instagram.com/p/${result.mediaId}`
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          mediaId: result.mediaId,
          postUrl: result.postUrl,
          mediaType: hasVideo ? 'reel' : 'image',
          message: `Posted ${mediaTypeLabel} to Instagram (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Update tracking record with failure
      if (socialPost) {
        await updateSocialPostFailed(socialPost.id, result.error || 'Unknown error')
      }

      throw new Error(result.error || 'Unknown Instagram API error')
    }

  } catch (error: any) {
    console.error('❌ Error posting to Instagram:', error)

    // Clean up stuck pending record
    if (socialPostId) {
      await updateSocialPostFailed(socialPostId, error.message || 'Unknown error')
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
