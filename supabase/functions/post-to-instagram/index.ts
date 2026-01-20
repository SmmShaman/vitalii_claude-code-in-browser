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
 * Version: 2025-01-20-v3 - Added video/Reels support
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

    // Check if already posted
    const { posted, postUrl: existingUrl } = await wasAlreadyPosted(
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

    // Fetch content
    const content = await getContent(
      contentId,
      requestData.contentType,
      requestData.language
    )

    if (!content) {
      throw new Error(`Content not found: ${contentId}`)
    }

    // For Instagram Reels, we need the original video URL (direct file URL from Telegram)
    // YouTube URLs won't work - Instagram needs a direct MP4 URL
    const videoUrlForInstagram = content.originalVideoUrl ||
      (content.videoType !== 'youtube' ? content.videoUrl : null)

    // Instagram requires an image or video
    if (!content.imageUrl && !videoUrlForInstagram) {
      // Special error message for YouTube videos
      if (content.videoUrl && content.videoType === 'youtube') {
        throw new Error('Instagram cannot use YouTube videos. Original video URL from Telegram is required for Reels.')
      }
      throw new Error('Instagram requires an image or video. This content has no media attached.')
    }

    // Determine media type (prefer video for Reels if available)
    const hasVideo = !!videoUrlForInstagram
    const hasImage = !!content.imageUrl

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
