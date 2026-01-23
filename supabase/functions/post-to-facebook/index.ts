import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  postToFacebookPage,
  formatFacebookPost,
  isFacebookConfigured
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
import {
  triggerFacebookVideo,
  isGitHubActionsEnabled
} from '../_shared/github-actions.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface FacebookPostRequest {
  newsId?: string
  blogPostId?: string
  language: Language
  contentType: ContentType
}

/**
 * Post content to Facebook Page
 * Supports both news and blog posts in multiple languages
 * Supports native video upload via GitHub Actions
 * Version: 2025-01-19-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: FacebookPostRequest = await req.json()
    console.log('📘 Facebook posting request:', requestData)

    // Validate environment
    if (!isFacebookConfigured()) {
      throw new Error('Facebook credentials not configured. Set FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID.')
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
      'facebook',
      requestData.language
    )

    if (posted) {
      console.log('⚠️ Already posted to Facebook:', existingUrl)
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          postUrl: existingUrl,
          message: `Already posted to Facebook (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pending) {
      console.log('⏳ Facebook post is already pending/in-progress')
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          message: `Facebook post already in progress (${requestData.language.toUpperCase()})`
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

    console.log('📝 Content to post:', {
      title: content.title.substring(0, 50) + '...',
      descriptionLength: content.description.length,
      imageUrl: content.imageUrl?.substring(0, 50),
      videoUrl: content.videoUrl,
      videoType: content.videoType
    })

    // Check if content has video - trigger GitHub Action for native video upload
    const hasVideo = content.videoUrl && content.videoUrl.includes('t.me')

    if (hasVideo && isGitHubActionsEnabled()) {
      console.log('🎬 Content has Telegram video - triggering GitHub Action for native upload')

      // Create tracking record for video upload
      const socialPost = await createSocialPost({
        contentType: requestData.contentType,
        contentId: contentId,
        platform: 'facebook',
        language: requestData.language,
        postContent: `[Video upload in progress] ${content.title}`,
        mediaUrls: content.videoUrl ? [content.videoUrl] : undefined
      })

      const triggerResult = await triggerFacebookVideo({
        newsId: contentId,
        language: requestData.language as 'en' | 'no' | 'ua'
      })

      if (triggerResult.success) {
        return new Response(
          JSON.stringify({
            success: true,
            videoProcessing: true,
            message: `Video upload triggered for Facebook (${requestData.language.toUpperCase()}). Processing may take 1-2 minutes.`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        console.warn('⚠️ GitHub Action trigger failed, falling back to image post:', triggerResult.error)
        // Fall through to regular image posting
      }
    }

    // Build article URL
    const articleUrl = buildArticleUrl(requestData.contentType, content.slug)

    // Format post content
    const message = formatFacebookPost(
      content.title,
      content.description,
      content.tags || []
    )

    // Create tracking record
    const socialPost = await createSocialPost({
      contentType: requestData.contentType,
      contentId: contentId,
      platform: 'facebook',
      language: requestData.language,
      postContent: message,
      mediaUrls: content.imageUrl ? [content.imageUrl] : undefined
    })

    // Post to Facebook
    const result = await postToFacebookPage({
      message,
      link: articleUrl,
      imageUrl: content.imageUrl
    })

    if (result.success && result.postId) {
      console.log('✅ Posted to Facebook successfully:', result.postId)

      // Update tracking record
      if (socialPost) {
        await updateSocialPostSuccess(
          socialPost.id,
          result.postId,
          result.postUrl || `https://facebook.com/${result.postId}`
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          postId: result.postId,
          postUrl: result.postUrl,
          message: `Posted to Facebook (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Update tracking record with failure
      if (socialPost) {
        await updateSocialPostFailed(socialPost.id, result.error || 'Unknown error')
      }

      throw new Error(result.error || 'Unknown Facebook API error')
    }

  } catch (error: any) {
    console.error('❌ Error posting to Facebook:', error)
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
