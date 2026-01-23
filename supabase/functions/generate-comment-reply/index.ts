import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface GenerateReplyRequest {
  commentId: string
}

/**
 * Generate AI Reply Suggestion for Social Media Comment
 *
 * Uses Azure OpenAI to generate a professional, friendly reply
 * based on the comment content and article context.
 *
 * Version: 2025-01-17-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { commentId }: GenerateReplyRequest = await req.json()

    if (!commentId) {
      throw new Error('commentId is required')
    }

    console.log('🤖 Generating reply for comment:', commentId)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch comment with related data
    const { data: comment, error: commentError } = await supabase
      .from('social_media_comments')
      .select(`
        *,
        social_post:social_post_id (
          content_type,
          content_id,
          platform,
          language
        )
      `)
      .eq('id', commentId)
      .single()

    if (commentError || !comment) {
      throw new Error(`Comment not found: ${commentId}`)
    }

    // Fetch the original article content
    const post = comment.social_post
    const contentTable = post.content_type === 'blog' ? 'blog_posts' : 'news'

    const { data: article } = await supabase
      .from(contentTable)
      .select('title_en, description_en, content_en')
      .eq('id', post.content_id)
      .single()

    // Analyze sentiment
    const sentiment = await analyzeSentiment(comment.comment_text)

    // Generate reply
    const reply = await generateReply({
      commentText: comment.comment_text,
      authorName: comment.author_name,
      platform: post.platform,
      language: post.language || 'en',
      articleTitle: article?.title_en || '',
      articleContent: article?.description_en || article?.content_en || '',
      sentiment
    })

    // Update comment with suggestion and sentiment
    const { error: updateError } = await supabase
      .from('social_media_comments')
      .update({
        sentiment: sentiment.category,
        sentiment_score: sentiment.score,
        ai_summary: sentiment.summary,
        suggested_reply: reply,
        suggested_reply_generated_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (updateError) {
      throw new Error(`Failed to update comment: ${updateError.message}`)
    }

    console.log('✅ Reply generated successfully')

    return new Response(
      JSON.stringify({
        success: true,
        sentiment,
        suggestedReply: reply
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error generating reply:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

interface SentimentResult {
  category: 'positive' | 'negative' | 'neutral' | 'question' | 'spam'
  score: number
  summary: string
}

/**
 * Analyze comment sentiment using AI
 */
async function analyzeSentiment(commentText: string): Promise<SentimentResult> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    // Fallback: simple keyword-based analysis
    return simpleAnalysis(commentText)
  }

  try {
    const prompt = `Analyze the sentiment of this social media comment. Return a JSON object with:
- category: one of "positive", "negative", "neutral", "question", "spam"
- score: a number from -1 (very negative) to 1 (very positive)
- summary: a brief 5-10 word summary of the comment's intent

Comment: "${commentText}"

Return only valid JSON, no other text.`

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
            { role: 'system', content: 'You are a sentiment analysis assistant. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      }
    )

    if (!response.ok) {
      console.error('Azure OpenAI error:', await response.text())
      return simpleAnalysis(commentText)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim()

    if (content) {
      try {
        return JSON.parse(content)
      } catch {
        console.warn('Failed to parse sentiment response:', content)
      }
    }

    return simpleAnalysis(commentText)

  } catch (error) {
    console.error('Sentiment analysis error:', error)
    return simpleAnalysis(commentText)
  }
}

/**
 * Simple keyword-based sentiment analysis (fallback)
 */
function simpleAnalysis(text: string): SentimentResult {
  const lower = text.toLowerCase()

  // Question detection
  if (lower.includes('?') || lower.startsWith('how') || lower.startsWith('what') || lower.startsWith('why')) {
    return {
      category: 'question',
      score: 0,
      summary: 'User asking a question'
    }
  }

  // Positive keywords
  const positiveWords = ['great', 'awesome', 'love', 'excellent', 'amazing', 'thank', 'helpful', 'good', 'nice', 'perfect']
  const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'wrong', 'mistake', 'issue', 'problem', 'fix', 'broken']

  let positiveCount = 0
  let negativeCount = 0

  for (const word of positiveWords) {
    if (lower.includes(word)) positiveCount++
  }
  for (const word of negativeWords) {
    if (lower.includes(word)) negativeCount++
  }

  if (positiveCount > negativeCount) {
    return {
      category: 'positive',
      score: Math.min(positiveCount * 0.2, 1),
      summary: 'Positive feedback'
    }
  } else if (negativeCount > positiveCount) {
    return {
      category: 'negative',
      score: Math.max(negativeCount * -0.2, -1),
      summary: 'Negative feedback'
    }
  }

  return {
    category: 'neutral',
    score: 0,
    summary: 'Neutral comment'
  }
}

interface GenerateReplyOptions {
  commentText: string
  authorName?: string
  platform: string
  language: string
  articleTitle: string
  articleContent: string
  sentiment: SentimentResult
}

/**
 * Generate a professional reply to the comment
 */
async function generateReply(options: GenerateReplyOptions): Promise<string> {
  const { commentText, authorName, platform, language, articleTitle, articleContent, sentiment } = options

  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    // Fallback: simple template-based reply
    return generateSimpleReply(options)
  }

  const languageNames: Record<string, string> = {
    en: 'English',
    no: 'Norwegian',
    ua: 'Ukrainian'
  }

  const prompt = `Generate a professional, friendly reply to this social media comment.

Context:
- Platform: ${platform}
- Article title: "${articleTitle}"
- Article summary: "${articleContent.substring(0, 300)}"
- Comment sentiment: ${sentiment.category} (${sentiment.summary})
${authorName ? `- Commenter's name: ${authorName}` : ''}

Comment:
"${commentText}"

Guidelines:
1. Be professional but friendly (match the ${platform} tone)
2. ${authorName ? `Address the commenter by name (${authorName})` : 'Do not use generic greetings like "Hi there"'}
3. Acknowledge their point or question
4. Add value or insight related to the article
5. Keep it concise (2-3 sentences max)
6. Write in ${languageNames[language] || 'English'}
7. ${sentiment.category === 'question' ? 'Directly answer their question if possible' : ''}
8. ${sentiment.category === 'negative' ? 'Be empathetic and address their concern' : ''}
9. ${sentiment.category === 'positive' ? 'Thank them and continue the positive energy' : ''}

Reply (just the text, no quotes):`;

  try {
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
            {
              role: 'system',
              content: `You are a social media manager for Vitalii Berbeha, an e-commerce and marketing expert.
Write replies that are professional, insightful, and engaging. Avoid generic responses.
Match the tone and formality level of the platform (${platform}).`
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      }
    )

    if (!response.ok) {
      console.error('Azure OpenAI error:', await response.text())
      return generateSimpleReply(options)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim()

    if (reply) {
      console.log('✅ AI generated reply')
      return reply
    }

    return generateSimpleReply(options)

  } catch (error) {
    console.error('Reply generation error:', error)
    return generateSimpleReply(options)
  }
}

/**
 * Simple template-based reply (fallback)
 */
function generateSimpleReply(options: GenerateReplyOptions): string {
  const { authorName, sentiment, language } = options

  const templates: Record<string, Record<string, string>> = {
    en: {
      positive: `${authorName ? `Thanks ${authorName}! ` : 'Thank you! '}Glad you found this helpful. Feel free to reach out if you have any questions!`,
      negative: `${authorName ? `${authorName}, t` : 'T'}hank you for your feedback. I appreciate you taking the time to share your thoughts. Would you like to discuss this further?`,
      question: `${authorName ? `Great question, ${authorName}! ` : 'Great question! '}I'd be happy to help clarify. Could you share more details about what you'd like to know?`,
      neutral: `${authorName ? `Thanks for your comment, ${authorName}. ` : 'Thanks for your comment. '}I appreciate you engaging with this content!`,
      spam: ''
    },
    no: {
      positive: `${authorName ? `Takk ${authorName}! ` : 'Takk! '}Glad du fant dette nyttig. Ta gjerne kontakt om du har spørsmål!`,
      negative: `${authorName ? `${authorName}, t` : 'T'}akk for tilbakemeldingen. Jeg setter pris på at du tok deg tid til å dele tankene dine.`,
      question: `${authorName ? `Godt spørsmål, ${authorName}! ` : 'Godt spørsmål! '}Jeg hjelper gjerne med å klargjøre.`,
      neutral: `${authorName ? `Takk for kommentaren, ${authorName}. ` : 'Takk for kommentaren. '}Setter pris på engasjementet!`,
      spam: ''
    },
    ua: {
      positive: `${authorName ? `Дякую, ${authorName}! ` : 'Дякую! '}Радий, що це було корисно. Звертайтеся, якщо є питання!`,
      negative: `${authorName ? `${authorName}, д` : 'Д'}якую за відгук. Ціную, що ви поділилися своїми думками.`,
      question: `${authorName ? `Гарне питання, ${authorName}! ` : 'Гарне питання! '}Радий допомогти прояснити.`,
      neutral: `${authorName ? `Дякую за коментар, ${authorName}. ` : 'Дякую за коментар. '}Ціную вашу увагу!`,
      spam: ''
    }
  }

  const langTemplates = templates[language] || templates.en
  return langTemplates[sentiment.category] || langTemplates.neutral
}
