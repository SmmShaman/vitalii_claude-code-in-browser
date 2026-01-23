import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  getContent,
  buildArticleUrl,
  createSocialPost,
  updateSocialPostSuccess,
  formatHashtags,
  sendTelegramMessage,
  escapeHtml,
  type ContentType,
  type Language
} from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface TikTokContentRequest {
  newsId?: string
  blogPostId?: string
  language: Language
  contentType: ContentType
  chatId: string // Telegram chat to send the content to
  messageId?: number // Optional message ID to reply to
}

/**
 * Generate TikTok-optimized content for manual posting
 * Since TikTok API requires review, this generates content that user can copy/paste
 * Sends formatted content to Telegram bot for easy access
 * Version: 2025-01-17-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestData: TikTokContentRequest = await req.json()
    console.log('🎵 TikTok content generation request:', requestData)

    const contentId = requestData.contentType === 'news'
      ? requestData.newsId
      : requestData.blogPostId

    if (!contentId) {
      throw new Error('Invalid request: must provide either newsId or blogPostId')
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

    console.log('📝 Content for TikTok:', {
      title: content.title.substring(0, 50) + '...',
      hasVideo: !!content.videoUrl,
      hasImage: !!content.imageUrl
    })

    // Build article URL
    const articleUrl = buildArticleUrl(requestData.contentType, content.slug)

    // Generate TikTok-optimized caption using AI
    const tiktokCaption = await generateTikTokCaption(
      content.title,
      content.description,
      content.tags || [],
      requestData.language
    )

    // Generate hashtags (TikTok loves hashtags)
    const hashtags = generateTikTokHashtags(content.tags || [], content.title)

    // Determine media type
    let mediaInfo = ''
    let mediaUrl = ''
    if (content.videoUrl && content.videoType === 'youtube') {
      mediaInfo = '🎬 Video available (YouTube embed - download for TikTok)'
      mediaUrl = content.videoUrl
    } else if (content.videoUrl) {
      mediaInfo = '🎬 Video available'
      mediaUrl = content.videoUrl
    } else if (content.imageUrl) {
      mediaInfo = '🖼️ Image available (create video from image)'
      mediaUrl = content.imageUrl
    } else {
      mediaInfo = '⚠️ No media - create your own visual'
    }

    // Create tracking record (status: pending since it's manual)
    const socialPost = await createSocialPost({
      contentType: requestData.contentType,
      contentId: contentId,
      platform: 'tiktok',
      language: requestData.language,
      postContent: tiktokCaption,
      mediaUrls: mediaUrl ? [mediaUrl] : undefined
    })

    // Format message for Telegram
    const telegramMessage = `🎵 <b>TikTok Content Ready</b>

📰 <b>Article:</b> ${escapeHtml(content.title)}
🌐 <b>Language:</b> ${requestData.language.toUpperCase()}

━━━━━━━━━━━━━━━━━━━━

📝 <b>Caption (copy this):</b>

<code>${escapeHtml(tiktokCaption)}</code>

━━━━━━━━━━━━━━━━━━━━

🏷️ <b>Hashtags:</b>
<code>${hashtags}</code>

━━━━━━━━━━━━━━━━━━━━

${mediaInfo}
${mediaUrl ? `<a href="${mediaUrl}">📥 Download Media</a>` : ''}

🔗 <a href="${articleUrl}">Read Full Article</a>

━━━━━━━━━━━━━━━━━━━━

👉 <b>Next Steps:</b>
1. Copy the caption above
2. Download/prepare the media
3. Open TikTok app
4. Create new post with media
5. Paste caption and post!`

    // Send to Telegram
    const { success: sent, error: sendError } = await sendTelegramMessage(
      requestData.chatId,
      telegramMessage,
      { parseMode: 'HTML' }
    )

    if (!sent) {
      console.error('Failed to send TikTok content to Telegram:', sendError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        caption: tiktokCaption,
        hashtags,
        mediaUrl,
        articleUrl,
        socialPostId: socialPost?.id,
        message: 'TikTok content generated and sent to Telegram'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error generating TikTok content:', error)
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
 * Generate TikTok-optimized caption using AI
 * TikTok captions should be short, engaging, with a hook
 */
async function generateTikTokCaption(
  title: string,
  description: string,
  tags: string[],
  language: Language
): Promise<string> {
  // If no AI configured, use simple format
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    console.log('⚠️ Azure OpenAI not configured, using simple caption')
    return formatSimpleCaption(title, description, language)
  }

  try {
    const languageNames: Record<Language, string> = {
      en: 'English',
      no: 'Norwegian',
      ua: 'Ukrainian'
    }

    const prompt = `Generate a TikTok caption for this article. The caption should be:
- Very short (max 150 characters before hashtags)
- Start with a hook or question
- Be engaging and casual (TikTok style)
- End with a call to action

Article Title: ${title}
Article Summary: ${description.substring(0, 500)}
Tags: ${tags.join(', ')}
Language: ${languageNames[language]}

Write the caption in ${languageNames[language]}. Just the caption text, no hashtags.`

    const response = await fetch(
      `${AZURE_OPENAI_ENDPOINT}/openai/deployments/Jobbot-gpt-4.1-mini/chat/completions?api-version=2024-02-15-preview`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_OPENAI_API_KEY
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a social media expert who writes viral TikTok captions. Be concise and engaging.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 100,
          temperature: 0.8
        })
      }
    )

    if (!response.ok) {
      console.error('Azure OpenAI error:', await response.text())
      return formatSimpleCaption(title, description, language)
    }

    const data = await response.json()
    const caption = data.choices?.[0]?.message?.content?.trim()

    if (caption) {
      console.log('✅ AI generated TikTok caption')
      return caption
    }

    return formatSimpleCaption(title, description, language)

  } catch (error: any) {
    console.error('Error generating AI caption:', error.message)
    return formatSimpleCaption(title, description, language)
  }
}

/**
 * Simple caption format when AI is not available
 */
function formatSimpleCaption(title: string, description: string, language: Language): string {
  // Truncate title if too long
  const shortTitle = title.length > 100 ? title.substring(0, 97) + '...' : title

  const ctas: Record<Language, string> = {
    en: 'Link in bio for more!',
    no: 'Lenke i bio for mer!',
    ua: 'Посилання в біо!'
  }

  return `${shortTitle}\n\n${ctas[language]}`
}

/**
 * Generate TikTok hashtags from tags and title
 * TikTok allows many hashtags but engagement is best with 3-5 relevant ones
 */
function generateTikTokHashtags(tags: string[], title: string): string {
  const baseHashtags = ['#tech', '#ai', '#news', '#fyp', '#viral']

  // Convert tags to hashtags
  const tagHashtags = tags
    .slice(0, 5)
    .map(tag => `#${tag.toLowerCase().replace(/[^a-z0-9]/g, '')}`)
    .filter(h => h.length > 2)

  // Extract potential hashtags from title
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 4 && !['about', 'with', 'that', 'this', 'from', 'have', 'been', 'will', 'what'].includes(word))
    .slice(0, 2)
    .map(word => `#${word.replace(/[^a-z0-9]/g, '')}`)

  // Combine and deduplicate
  const allHashtags = [...new Set([...tagHashtags, ...titleWords, ...baseHashtags])]

  // Return top 8 hashtags
  return allHashtags.slice(0, 8).join(' ')
}
