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

// Localized CTA for Facebook posts (fallback when no AI teaser)
const FACEBOOK_CTA: Record<string, string> = {
  en: '🔗 Read more',
  no: '🔗 Les mer',
  ua: '🔗 Читати далі'
}

/**
 * Generate or fetch cached Facebook teaser
 */
async function getFacebookTeaser(
  recordId: string,
  contentType: 'news' | 'blog',
  language: 'en' | 'no' | 'ua',
  title: string,
  content: string
): Promise<string | null> {
  try {
    console.log(`🎯 Fetching/generating Facebook teaser (${language})...`)

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
        platform: 'facebook',
        language
      })
    })

    if (!response.ok) {
      console.warn('⚠️ Facebook teaser generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    if (result.success && result.teaser) {
      console.log(`✅ Got Facebook teaser (cached: ${result.cached})`)
      return result.teaser
    }

    return null
  } catch (error: any) {
    console.warn('⚠️ Error getting Facebook teaser:', error.message)
    return null
  }
}

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
 * Version: 2026-02-28-v2 - Message truncation to prevent "Reduce data amount" errors
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let socialPostId: string | null = null

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

    // Auto-expire stuck pending records (older than 10 minutes)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: expiredCount } = await supabase
      .from('social_media_posts')
      .update({ status: 'failed', error_message: 'Auto-expired: stuck pending >10min' })
      .eq('content_id', contentId)
      .eq('platform', 'facebook')
      .eq('language', requestData.language)
      .eq('status', 'pending')
      .lt('created_at', tenMinAgo)
    if (expiredCount && expiredCount > 0) {
      console.log(`🧹 Auto-expired ${expiredCount} stuck pending Facebook record(s)`)
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

      // Create tracking record for video upload (with race condition protection)
      const { post: socialPost, raceCondition } = await createSocialPost({
        contentType: requestData.contentType,
        contentId: contentId,
        platform: 'facebook',
        language: requestData.language,
        postContent: `[Video upload in progress] ${content.title}`,
        mediaUrls: content.videoUrl ? [content.videoUrl] : undefined
      })

      if (socialPost) socialPostId = socialPost.id

      // 🛡️ RACE CONDITION PROTECTION
      if (raceCondition) {
        console.log('🛡️ Race condition detected - aborting video upload to prevent duplicate')
        return new Response(
          JSON.stringify({
            success: false,
            alreadyPosted: true,
            postUrl: socialPost?.platform_post_url,
            message: `Race condition: Facebook post already ${socialPost?.status || 'in progress'}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

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

    // Generate or fetch cached Facebook teaser
    const teaser = await getFacebookTeaser(
      contentId,
      requestData.contentType,
      requestData.language,
      content.title,
      content.content || content.description
    )

    // Use AI teaser if available, otherwise fallback to basic format
    // Facebook Graph API recommends < 500 chars for engagement, max ~63206 chars
    let message: string
    if (teaser) {
      const cta = FACEBOOK_CTA[requestData.language] || FACEBOOK_CTA.en
      message = `${teaser}\n\n${cta}: ${articleUrl}`.substring(0, 2000)
      console.log('📝 Using AI-generated teaser for Facebook post')
    } else {
      message = formatFacebookPost(
        content.title,
        content.description,
        content.tags || []
      )
      console.log('📝 No teaser available, using formatFacebookPost fallback')
    }

    // Safety truncation to prevent "Reduce data amount" errors
    if (message.length > 2000) {
      console.warn(`⚠️ Facebook message truncated: ${message.length} -> 2000 chars`)
      message = message.substring(0, 2000)
    }

    // Create tracking record (with race condition protection)
    const { post: socialPost, raceCondition } = await createSocialPost({
      contentType: requestData.contentType,
      contentId: contentId,
      platform: 'facebook',
      language: requestData.language,
      postContent: message,
      mediaUrls: content.imageUrl ? [content.imageUrl] : undefined
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
          message: `Race condition: Facebook post already ${socialPost?.status || 'in progress'} (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Post to Facebook (prefer wide image for better feed display)
    const result = await postToFacebookPage({
      message,
      link: articleUrl,
      imageUrl: content.imageUrlWide || content.imageUrl
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
