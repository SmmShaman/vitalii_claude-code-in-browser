import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  wasAlreadyPosted,
  createSocialPost,
  updateSocialPostSuccess,
  updateSocialPostFailed,
  type ContentType,
  type Language
} from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const LINKEDIN_ACCESS_TOKEN = Deno.env.get('LINKEDIN_ACCESS_TOKEN')
const LINKEDIN_PERSON_URN = Deno.env.get('LINKEDIN_PERSON_URN') // Format: urn:li:person:xxxxx
// Use the actual site URL - vitalii.no is the production domain
const SITE_URL = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://vitalii.no'

/**
 * Sanitize text for LinkedIn API
 * - Strips HTML tags
 * - Preserves paragraph breaks for readability
 * - Limits length
 * - Removes problematic characters
 */
function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text) return ''

  return text
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Decode HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, ' ')
    // Normalize multiple newlines to max 2 (preserve paragraph breaks)
    .replace(/\n{3,}/g, '\n\n')
    // Replace multiple spaces with single space (but keep newlines!)
    .replace(/[^\S\n]+/g, ' ')
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim each line
    .split('\n').map(line => line.trim()).join('\n')
    // Trim overall
    .trim()
    // Limit length
    .substring(0, maxLength)
}

interface LinkedInPostRequest {
  newsId?: string
  blogPostId?: string
  language: 'en' | 'no' | 'ua'
  contentType: 'news' | 'blog'
}

/**
 * Generate or fetch cached LinkedIn teaser
 */
async function getLinkedInTeaser(
  recordId: string,
  contentType: 'news' | 'blog',
  language: 'en' | 'no' | 'ua',
  title: string,
  content: string
): Promise<string | null> {
  try {
    console.log(`🎯 Fetching/generating LinkedIn teaser (${language})...`)

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
        platform: 'linkedin',
        language
      })
    })

    if (!response.ok) {
      console.warn('⚠️ Teaser generation failed:', await response.text())
      return null
    }

    const result = await response.json()
    if (result.success && result.teaser) {
      console.log(`✅ Got LinkedIn teaser (cached: ${result.cached})`)
      return result.teaser
    }

    return null
  } catch (error: any) {
    console.warn('⚠️ Error getting teaser:', error.message)
    return null
  }
}

/**
 * Post content to LinkedIn
 * Supports both news and blog posts in multiple languages
 * Deployed: December 2024
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: LinkedInPostRequest = await req.json()
    console.log('🔗 LinkedIn posting request:', requestData)

    // Validate environment
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_PERSON_URN) {
      throw new Error('LinkedIn credentials not configured. Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN.')
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const contentId = requestData.contentType === 'news'
      ? requestData.newsId
      : requestData.blogPostId

    if (!contentId) {
      throw new Error('Invalid request: must provide either newsId or blogPostId')
    }

    // Check if already posted or pending (prevents duplicate posts)
    const { posted, pending, postUrl: existingUrl } = await wasAlreadyPosted(
      contentId,
      requestData.contentType as ContentType,
      'linkedin',
      requestData.language as Language
    )

    if (posted) {
      console.log('⚠️ Already posted to LinkedIn:', existingUrl)
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          postUrl: existingUrl,
          message: `Already posted to LinkedIn (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (pending) {
      console.log('⏳ LinkedIn post is already pending/in-progress')
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          message: `LinkedIn post already in progress (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create pending social media post record (with race condition protection)
    const { post: socialPost, raceCondition } = await createSocialPost({
      contentType: requestData.contentType as ContentType,
      contentId: contentId,
      platform: 'linkedin',
      language: requestData.language as Language,
      postContent: '', // post content will be set later
      mediaUrls: []
    })

    // 🛡️ RACE CONDITION PROTECTION: If another request already created/posted, abort
    if (raceCondition) {
      console.log('🛡️ Race condition detected - aborting to prevent duplicate post')
      const existingUrl = socialPost?.platform_post_url
      return new Response(
        JSON.stringify({
          success: false,
          alreadyPosted: true,
          postUrl: existingUrl,
          message: `Race condition: LinkedIn post already ${socialPost?.status || 'in progress'} (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!socialPost) {
      console.error('❌ Failed to create social post record')
      // Continue anyway - don't block posting
    }

    // Fetch content based on type
    let content: {
      title: string
      description: string
      fullContent: string  // For teaser generation
      url: string
      imageUrl?: string
      sourceLink?: string
      teaser?: string      // Generated teaser (priority)
    }

    const recordId = requestData.contentType === 'news' ? requestData.newsId : requestData.blogPostId

    if (requestData.contentType === 'news' && requestData.newsId) {
      content = await fetchNewsContent(supabase, requestData.newsId, requestData.language)
    } else if (requestData.contentType === 'blog' && requestData.blogPostId) {
      content = await fetchBlogContent(supabase, requestData.blogPostId, requestData.language)
    } else {
      throw new Error('Invalid request: must provide either newsId or blogPostId with corresponding contentType')
    }

    // Generate or fetch cached LinkedIn teaser
    const teaser = await getLinkedInTeaser(
      recordId!,
      requestData.contentType,
      requestData.language,
      content.title,
      content.fullContent
    )

    if (teaser) {
      content.teaser = teaser
      console.log('📝 Using generated teaser instead of full content')
    } else {
      console.log('📝 No teaser available, using description as fallback')
    }

    console.log('📝 Content to post:', {
      title: content.title.substring(0, 50) + '...',
      descriptionLength: content.description.length,
      url: content.url,
      imageUrl: content.imageUrl,
      sourceLink: content.sourceLink
    })
    console.log('📋 Full title:', content.title)
    console.log('📋 Full description:', content.description)

    // Process image with AI if available and not already processed
    if (content.imageUrl && !content.imageUrl.includes('/processed/')) {
      console.log('🖼️ Processing image for LinkedIn...')
      // Pass news context to generate relevant illustration
      const processedImageUrl = await processImageForLinkedIn(content.imageUrl, {
        title: content.title,
        description: content.description,
        url: content.url
      })
      if (processedImageUrl) {
        content.imageUrl = processedImageUrl
        console.log('✅ Image processed:', processedImageUrl)

        // Save processed image URL to database for future use
        const updateTable = requestData.contentType === 'news' ? 'news' : 'blog_posts'
        const updateId = requestData.contentType === 'news' ? requestData.newsId : requestData.blogPostId
        await supabase
          .from(updateTable)
          .update({ processed_image_url: processedImageUrl })
          .eq('id', updateId)
      } else {
        console.log('⚠️ Image processing failed, using original image')
      }
    }

    // Post to LinkedIn
    const result = await postToLinkedIn(content)

    if (result.success) {
      console.log('✅ Posted to LinkedIn successfully:', result.postId)

      // Build LinkedIn post URL
      const linkedinPostUrl = result.postId
        ? `https://www.linkedin.com/feed/update/${result.postId}`
        : undefined

      // Update the record with LinkedIn post info
      const updateTable = requestData.contentType === 'news' ? 'news' : 'blog_posts'
      const updateId = requestData.contentType === 'news' ? requestData.newsId : requestData.blogPostId

      await supabase
        .from(updateTable)
        .update({
          linkedin_post_id: result.postId,
          linkedin_posted_at: new Date().toISOString(),
          linkedin_language: requestData.language
        })
        .eq('id', updateId)

      // Update social_media_posts record
      if (socialPost && result.postId) {
        await updateSocialPostSuccess(socialPost.id, result.postId, linkedinPostUrl || '')
        console.log('✅ Updated social_media_posts record')
      }

      return new Response(
        JSON.stringify({
          success: true,
          postId: result.postId,
          postUrl: linkedinPostUrl,
          message: `Posted to LinkedIn (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Update social_media_posts record with error
      if (socialPost) {
        await updateSocialPostFailed(socialPost.id, result.error || 'Unknown error')
      }
      throw new Error(result.error || 'Unknown LinkedIn API error')
    }

  } catch (error: any) {
    console.error('❌ Error posting to LinkedIn:', error)
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

/**
 * Fetch news content in specified language
 */
async function fetchNewsContent(
  supabase: any,
  newsId: string,
  language: 'en' | 'no' | 'ua'
): Promise<{ title: string; description: string; fullContent: string; url: string; imageUrl?: string; sourceLink?: string }> {
  const { data: news, error } = await supabase
    .from('news')
    .select('*')
    .eq('id', newsId)
    .single()

  if (error || !news) {
    throw new Error(`News not found: ${newsId}`)
  }

  // Get language-specific fields
  const titleField = `title_${language}`
  const descriptionField = `description_${language}`
  const slugField = `slug_${language}`
  const contentField = `content_${language}`

  const title = sanitizeText(news[titleField] || news.title_en || news.original_title, 200)
  // Get full content for teaser generation (unsanitized)
  const fullContent = news[contentField] || news[descriptionField] || news.description_en || ''
  // Sanitized description for fallback
  const description = sanitizeText(fullContent, 2500)
  const slug = news[slugField] || news.slug_en

  // Build URL - no language prefix in URL (language is handled client-side)
  const url = `${SITE_URL}/news/${slug}`

  // Use processed image if available, otherwise original
  const imageUrl = news.processed_image_url || news.image_url

  // Get source link (external source URL extracted from Telegram post)
  const sourceLink = news.source_link || null

  return {
    title,
    description,
    fullContent,
    url,
    imageUrl,
    sourceLink
  }
}

/**
 * Fetch blog content in specified language
 */
async function fetchBlogContent(
  supabase: any,
  blogPostId: string,
  language: 'en' | 'no' | 'ua'
): Promise<{ title: string; description: string; fullContent: string; url: string; imageUrl?: string; sourceLink?: string }> {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('id', blogPostId)
    .single()

  if (error || !post) {
    throw new Error(`Blog post not found: ${blogPostId}`)
  }

  // Get language-specific fields
  const titleField = `title_${language}`
  const descriptionField = `description_${language}`
  const slugField = `slug_${language}`
  const contentField = `content_${language}`

  const title = sanitizeText(post[titleField] || post.title_en, 200)
  // Get full content for teaser generation (unsanitized)
  const fullContent = post[contentField] || post[descriptionField] || post.description_en || ''
  // Sanitized description for fallback
  const description = sanitizeText(fullContent, 2500)
  const slug = post[slugField] || post.slug_en

  // Build URL - no language prefix in URL (language is handled client-side)
  const url = `${SITE_URL}/blog/${slug}`

  // Use processed image if available, otherwise original
  const imageUrl = post.processed_image_url || post.image_url

  // Get source link from blog_posts.original_url (which stores the source)
  const sourceLink = post.original_url || null

  return {
    title,
    description,
    fullContent,
    url,
    imageUrl,
    sourceLink
  }
}

/**
 * Upload image to LinkedIn and get asset URN
 * Required for native image sharing
 */
async function uploadImageToLinkedIn(imageUrl: string): Promise<string | null> {
  try {
    console.log('🖼️ Uploading image to LinkedIn...', imageUrl.substring(0, 50))

    // Step 1: Register the upload
    const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner: LINKEDIN_PERSON_URN,
          serviceRelationships: [
            {
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }
          ]
        }
      })
    })

    if (!registerResponse.ok) {
      const errorText = await registerResponse.text()
      console.error('LinkedIn register upload error:', registerResponse.status, errorText)
      return null
    }

    const registerResult = await registerResponse.json()
    const uploadUrl = registerResult.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl
    const asset = registerResult.value?.asset

    if (!uploadUrl || !asset) {
      console.error('Missing upload URL or asset from register response')
      return null
    }

    console.log('📤 Got upload URL, downloading source image...')

    // Step 2: Download the source image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      console.error('Failed to download source image:', imageResponse.status)
      return null
    }

    const imageBuffer = await imageResponse.arrayBuffer()
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    console.log('📤 Uploading image to LinkedIn...', imageBuffer.byteLength, 'bytes')

    // Step 3: Upload the image to LinkedIn
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': contentType
      },
      body: imageBuffer
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('LinkedIn upload error:', uploadResponse.status, errorText)
      return null
    }

    console.log('✅ Image uploaded to LinkedIn, asset:', asset)
    return asset

  } catch (error: any) {
    console.error('Error uploading image to LinkedIn:', error)
    return null
  }
}

/**
 * Post content to LinkedIn using Share API v2
 * Supports both ARTICLE (with link preview) and IMAGE (with uploaded image) modes
 */
async function postToLinkedIn(content: {
  title: string
  description: string
  fullContent: string
  url: string
  imageUrl?: string
  sourceLink?: string
  teaser?: string  // AI-generated teaser (priority)
}): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Build the share commentary (LinkedIn limit is 3000 chars)
    // Use teaser if available, otherwise fall back to title + description
    let commentary: string

    if (content.teaser) {
      // Use AI-generated teaser - already includes emojis and CTA
      commentary = content.teaser
      // Add link to full article (teaser should end with CTA like "Читати повністю →")
      commentary += `\n\n🔗 ${content.url}`
      console.log('📝 Using AI-generated teaser for LinkedIn post')
    } else {
      // Fallback to old behavior: title + description
      commentary = `${content.title}\n\n${content.description}`
      commentary += `\n\n🔗 Read more: ${content.url}`
      console.log('📝 Using title+description fallback for LinkedIn post')
    }

    const safeCommentary = commentary.substring(0, 2900)

    console.log('📤 Commentary length:', safeCommentary.length)

    let postBody: any

    // If we have an image, try to upload it natively to LinkedIn
    let imageAsset: string | null = null
    if (content.imageUrl) {
      imageAsset = await uploadImageToLinkedIn(content.imageUrl)
    }

    if (imageAsset) {
      // Use IMAGE category with natively uploaded image
      console.log('📷 Using IMAGE category with uploaded asset')
      postBody = {
        author: LINKEDIN_PERSON_URN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: safeCommentary
            },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                media: imageAsset,
                title: {
                  text: content.title.substring(0, 200)
                }
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }
    } else {
      // Fallback to ARTICLE category (link preview)
      console.log('📰 Using ARTICLE category (no image or upload failed)')
      postBody = {
        author: LINKEDIN_PERSON_URN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: safeCommentary
            },
            shareMediaCategory: 'ARTICLE',
            media: [
              {
                status: 'READY',
                originalUrl: content.url,
                title: {
                  text: content.title
                },
                description: {
                  text: content.description.substring(0, 200)
                }
              }
            ]
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      }
    }

    console.log('📤 Sending to LinkedIn API...')

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202401'
      },
      body: JSON.stringify(postBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('LinkedIn API error:', response.status, errorText)

      // Parse error for better message
      try {
        const errorJson = JSON.parse(errorText)
        return {
          success: false,
          error: errorJson.message || `LinkedIn API error: ${response.status}`
        }
      } catch {
        return {
          success: false,
          error: `LinkedIn API error: ${response.status} - ${errorText.substring(0, 200)}`
        }
      }
    }

    const result = await response.json()
    console.log('LinkedIn API response:', JSON.stringify(result, null, 2))

    // Extract post ID from response
    const postId = result.id || result.activity

    return {
      success: true,
      postId
    }

  } catch (error: any) {
    console.error('Error in postToLinkedIn:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Process image for LinkedIn using AI generation (Gemini)
 * Creates a NEW illustration based on news content
 */
async function processImageForLinkedIn(
  imageUrl: string,
  newsContext?: { title: string; description: string; url: string }
): Promise<string | null> {
  try {
    console.log('🖼️ Calling process-image function with news context...')
    console.log('📰 Title:', newsContext?.title?.substring(0, 50))

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/process-image`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl,
          promptType: 'linkedin_optimize',
          // Pass news context for AI image generation
          newsTitle: newsContext?.title,
          newsDescription: newsContext?.description,
          newsUrl: newsContext?.url
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('process-image error:', response.status, errorText)
      return null
    }

    const result = await response.json()
    console.log('process-image result:', result)

    if (result.success && result.processedImageUrl) {
      return result.processedImageUrl
    }

    return null
  } catch (error) {
    console.error('Error in processImageForLinkedIn:', error)
    return null
  }
}
