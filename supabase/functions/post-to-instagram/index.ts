import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
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

interface InstagramPostRequest {
  newsId?: string
  blogPostId?: string
  language: Language
  contentType: ContentType
  debug?: boolean  // Set to true to run token debug instead of posting
}

/**
 * Post content to Instagram Business Account
 * Supports both images and videos (Reels)
 * Uses Facebook Graph API for Instagram Business accounts
 * Version: 2025-01-20-v4 - Added video/Reels support + image fallback logging
 *
 * Debug mode: POST with { debug: true } to check token permissions
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

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

    console.log('📝 Content to post:', {
      title: content.title.substring(0, 50) + '...',
      descriptionLength: content.description.length,
      imageUrl: content.imageUrl?.substring(0, 50),
      videoUrl: content.videoUrl?.substring(0, 50),
      originalVideoUrl: content.originalVideoUrl?.substring(0, 50),
      videoUrlForInstagram: videoUrlForInstagram?.substring(0, 50),
      videoType: content.videoType,
      mediaType: hasVideo ? 'VIDEO/REELS' : 'IMAGE'
    })

    // Build article URL
    const articleUrl = buildArticleUrl(requestData.contentType, content.slug)

    // Format Instagram caption (2200 char limit)
    const caption = formatInstagramCaption(
      content.title,
      content.description,
      articleUrl,
      content.tags || []
    )

    // Determine which media URL to use (prefer video for Reels)
    const mediaUrl = hasVideo ? videoUrlForInstagram! : content.imageUrl!

    // Create tracking record
    const socialPost = await createSocialPost({
      contentType: requestData.contentType,
      contentId: contentId,
      platform: 'instagram',
      language: requestData.language,
      postContent: caption,
      mediaUrls: [mediaUrl]
    })

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
