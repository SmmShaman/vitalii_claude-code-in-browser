import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
 * - Normalizes whitespace
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
    // Normalize whitespace - replace multiple spaces/newlines with single space
    .replace(/\s+/g, ' ')
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim
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

    // Fetch content based on type
    let content: {
      title: string
      description: string
      url: string
      imageUrl?: string
    }

    if (requestData.contentType === 'news' && requestData.newsId) {
      content = await fetchNewsContent(supabase, requestData.newsId, requestData.language)
    } else if (requestData.contentType === 'blog' && requestData.blogPostId) {
      content = await fetchBlogContent(supabase, requestData.blogPostId, requestData.language)
    } else {
      throw new Error('Invalid request: must provide either newsId or blogPostId with corresponding contentType')
    }

    console.log('📝 Content to post:', {
      title: content.title.substring(0, 50) + '...',
      descriptionLength: content.description.length,
      url: content.url
    })
    console.log('📋 Full title:', content.title)
    console.log('📋 Full description:', content.description)

    // Post to LinkedIn
    const result = await postToLinkedIn(content)

    if (result.success) {
      console.log('✅ Posted to LinkedIn successfully:', result.postId)

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

      return new Response(
        JSON.stringify({
          success: true,
          postId: result.postId,
          message: `Posted to LinkedIn (${requestData.language.toUpperCase()})`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
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
): Promise<{ title: string; description: string; url: string; imageUrl?: string }> {
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

  const title = sanitizeText(news[titleField] || news.title_en || news.original_title, 200)
  // Use full content for LinkedIn (up to 2500 chars to fit within LinkedIn's 3000 limit)
  const contentField = `content_${language}`
  const fullContent = news[contentField] || news[descriptionField] || news.description_en || ''
  const description = sanitizeText(fullContent, 2500)
  const slug = news[slugField] || news.slug_en

  // Build URL based on language
  const langPrefix = language === 'en' ? '' : `/${language === 'ua' ? 'uk' : language}`
  const url = `${SITE_URL}${langPrefix}/news/${slug}`

  // Use processed image if available, otherwise original
  const imageUrl = news.processed_image_url || news.image_url

  return {
    title,
    description,
    url,
    imageUrl
  }
}

/**
 * Fetch blog content in specified language
 */
async function fetchBlogContent(
  supabase: any,
  blogPostId: string,
  language: 'en' | 'no' | 'ua'
): Promise<{ title: string; description: string; url: string; imageUrl?: string }> {
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

  const title = sanitizeText(post[titleField] || post.title_en, 200)
  // Use full content for LinkedIn (up to 2500 chars to fit within LinkedIn's 3000 limit)
  const contentField = `content_${language}`
  const fullContent = post[contentField] || post[descriptionField] || post.description_en || ''
  const description = sanitizeText(fullContent, 2500)
  const slug = post[slugField] || post.slug_en

  // Build URL based on language
  const langPrefix = language === 'en' ? '' : `/${language === 'ua' ? 'uk' : language}`
  const url = `${SITE_URL}${langPrefix}/blog/${slug}`

  // Use processed image if available, otherwise original
  const imageUrl = post.processed_image_url || post.image_url

  return {
    title,
    description,
    url,
    imageUrl
  }
}

/**
 * Post content to LinkedIn using Share API v2
 */
async function postToLinkedIn(content: {
  title: string
  description: string
  url: string
  imageUrl?: string
}): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    // Build the share commentary (LinkedIn limit is 3000 chars)
    // Keep it concise for better engagement
    const commentary = `${content.title}\n\n${content.description}\n\n🔗 Read more: ${content.url}`
    const safeCommentary = commentary.substring(0, 2900)

    console.log('📤 Commentary length:', safeCommentary.length)

    // Build the share content
    // Use UGC Post API (User Generated Content)
    const postBody: any = {
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

    // If we have an image, add it to the article preview
    if (content.imageUrl) {
      postBody.specificContent['com.linkedin.ugc.ShareContent'].media[0].thumbnails = [
        {
          url: content.imageUrl
        }
      ]
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
