import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  sendToCommentsBot,
  escapeHtml
} from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AZURE_OPENAI_ENDPOINT = Deno.env.get('AZURE_OPENAI_ENDPOINT')
const AZURE_OPENAI_API_KEY = Deno.env.get('AZURE_OPENAI_API_KEY')

interface MonitorResult {
  subscriptionId: string
  communityName: string
  postsChecked: number
  relevantPosts: number
  errors: string[]
}

/**
 * Monitor Professional Communities
 *
 * Checks subscribed LinkedIn and Facebook groups for relevant posts
 * that match configured keywords. Sends notifications for high-relevance
 * posts that might be good engagement opportunities.
 *
 * Note: LinkedIn Groups API has limited access.
 * Facebook Groups API requires group admin access.
 *
 * Version: 2025-01-17-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔍 Starting community monitoring...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const results: MonitorResult[] = []

  try {
    // Get active community subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('community_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`)
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('📋 No active community subscriptions found')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active subscriptions',
          results: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${subscriptions.length} active subscriptions`)

    // Process each subscription
    for (const subscription of subscriptions) {
      const result = await processSubscription(supabase, subscription)
      results.push(result)

      // Update last checked time
      await supabase
        .from('community_subscriptions')
        .update({
          last_checked_at: new Date().toISOString(),
          posts_checked_count: (subscription.posts_checked_count || 0) + result.postsChecked,
          posts_matched_count: (subscription.posts_matched_count || 0) + result.relevantPosts
        })
        .eq('id', subscription.id)
    }

    // Summary
    const totalRelevant = results.reduce((sum, r) => sum + r.relevantPosts, 0)
    console.log(`✅ Community monitoring completed. Relevant posts: ${totalRelevant}`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalRelevantPosts: totalRelevant
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Community monitoring error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Process a single community subscription
 */
async function processSubscription(
  supabase: any,
  subscription: any
): Promise<MonitorResult> {
  const result: MonitorResult = {
    subscriptionId: subscription.id,
    communityName: subscription.community_name,
    postsChecked: 0,
    relevantPosts: 0,
    errors: []
  }

  console.log(`🔍 Checking ${subscription.platform} community: ${subscription.community_name}`)

  try {
    // Note: LinkedIn Groups API and Facebook Groups API have restricted access
    // This is a placeholder implementation that would need proper API access

    if (subscription.platform === 'linkedin') {
      // LinkedIn Groups API requires Marketing Developer Platform approval
      // For now, we'll note this limitation
      result.errors.push('LinkedIn Groups API requires special approval')
      console.log('⚠️ LinkedIn Groups API not available - requires Marketing Developer Platform approval')

    } else if (subscription.platform === 'facebook') {
      // Facebook Groups API requires group admin access or group content access feature
      result.errors.push('Facebook Groups API requires admin access')
      console.log('⚠️ Facebook Groups API not available - requires group admin access')
    }

    // In a real implementation with proper API access, we would:
    // 1. Fetch recent posts from the community
    // 2. Filter by keywords
    // 3. Calculate relevance scores
    // 4. Save and notify about high-relevance posts

    // For demonstration, we'll show how the notification would look
    // This code would be triggered when we have actual posts:
    /*
    const posts = await fetchCommunityPosts(subscription)

    for (const post of posts) {
      result.postsChecked++

      // Calculate relevance
      const relevance = calculateRelevance(post.text, subscription.keywords)

      if (relevance >= subscription.min_relevance_score) {
        result.relevantPosts++

        // Save post
        const savedPost = await saveCommunityPost(supabase, {
          subscriptionId: subscription.id,
          platform: subscription.platform,
          platformPostId: post.id,
          postUrl: post.url,
          authorName: post.author.name,
          postText: post.text,
          relevanceScore: relevance,
          matchedKeywords: findMatchedKeywords(post.text, subscription.keywords)
        })

        // Generate engagement suggestion
        await generateEngagementSuggestion(supabase, savedPost)

        // Notify via bot
        await notifyRelevantPost(supabase, savedPost, subscription)
      }
    }
    */

    return result

  } catch (error: any) {
    result.errors.push(error.message)
    console.error(`Error processing ${subscription.community_name}:`, error)
    return result
  }
}

/**
 * Calculate relevance score based on keyword matches
 */
function calculateRelevance(text: string, keywords: string[]): number {
  if (!text || !keywords || keywords.length === 0) return 0

  const lowerText = text.toLowerCase()
  let matchCount = 0
  let weightedScore = 0

  for (const keyword of keywords) {
    const lowerKeyword = keyword.toLowerCase()

    // Count occurrences
    const regex = new RegExp(lowerKeyword, 'gi')
    const matches = lowerText.match(regex)

    if (matches) {
      matchCount++
      // More weight for longer keywords (more specific)
      weightedScore += matches.length * (1 + keyword.length / 10)
    }
  }

  if (matchCount === 0) return 0

  // Normalize score between 0 and 1
  const keywordCoverage = matchCount / keywords.length
  const normalizedWeight = Math.min(weightedScore / 10, 1)

  return (keywordCoverage * 0.6) + (normalizedWeight * 0.4)
}

/**
 * Find which keywords matched in the text
 */
function findMatchedKeywords(text: string, keywords: string[]): string[] {
  const lowerText = text.toLowerCase()
  return keywords.filter(keyword =>
    lowerText.includes(keyword.toLowerCase())
  )
}

/**
 * Save a community post to the database
 */
async function saveCommunityPost(
  supabase: any,
  data: {
    subscriptionId: string
    platform: string
    platformPostId: string
    postUrl?: string
    authorName?: string
    authorUsername?: string
    authorProfileUrl?: string
    authorHeadline?: string
    postText: string
    postType?: string
    mediaUrls?: string[]
    matchedKeywords: string[]
    relevanceScore: number
    likesCount?: number
    commentsCount?: number
    sharesCount?: number
    postCreatedAt?: string
  }
): Promise<any> {
  // Check if post already exists
  const { data: existing } = await supabase
    .from('community_posts')
    .select('id')
    .eq('platform', data.platform)
    .eq('platform_post_id', data.platformPostId)
    .single()

  if (existing) {
    // Update existing post
    const { data: updated } = await supabase
      .from('community_posts')
      .update({
        likes_count: data.likesCount,
        comments_count: data.commentsCount,
        shares_count: data.sharesCount,
        synced_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    return updated
  }

  // Insert new post
  const { data: inserted, error } = await supabase
    .from('community_posts')
    .insert({
      subscription_id: data.subscriptionId,
      platform: data.platform,
      platform_post_id: data.platformPostId,
      post_url: data.postUrl,
      author_name: data.authorName,
      author_username: data.authorUsername,
      author_profile_url: data.authorProfileUrl,
      author_headline: data.authorHeadline,
      post_text: data.postText,
      post_type: data.postType,
      media_urls: data.mediaUrls,
      matched_keywords: data.matchedKeywords,
      relevance_score: data.relevanceScore,
      likes_count: data.likesCount || 0,
      comments_count: data.commentsCount || 0,
      shares_count: data.sharesCount || 0,
      post_created_at: data.postCreatedAt,
      is_read: false,
      is_engaged: false
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return inserted
}

/**
 * Generate an engagement suggestion using AI
 */
async function generateEngagementSuggestion(supabase: any, post: any): Promise<void> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    // Use simple template
    const suggestion = `Great observation! I've worked extensively in this area and would love to share some insights...`
    await supabase
      .from('community_posts')
      .update({
        suggested_comment: suggestion,
        suggested_comment_generated_at: new Date().toISOString()
      })
      .eq('id', post.id)
    return
  }

  try {
    const prompt = `Generate a professional, insightful comment for this LinkedIn/Facebook group post.

Post:
"${post.post_text.substring(0, 500)}"

Guidelines:
1. Be professional and add genuine value
2. Share a relevant insight or experience
3. Ask a thoughtful follow-up question
4. Keep it concise (2-3 sentences)
5. Don't be salesy or self-promotional
6. Match the professional tone of the platform

Comment:`

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
              content: 'You are a social media engagement expert for a marketing and e-commerce professional. Generate helpful, insightful comments that add value to discussions.'
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      }
    )

    if (!response.ok) {
      console.warn('Failed to generate engagement suggestion')
      return
    }

    const data = await response.json()
    const suggestion = data.choices?.[0]?.message?.content?.trim()

    if (suggestion) {
      await supabase
        .from('community_posts')
        .update({
          suggested_comment: suggestion,
          suggested_comment_generated_at: new Date().toISOString()
        })
        .eq('id', post.id)
    }

  } catch (error) {
    console.warn('Error generating engagement suggestion:', error)
  }
}

/**
 * Notify about a relevant community post via the comments bot
 */
async function notifyRelevantPost(
  supabase: any,
  post: any,
  subscription: any
): Promise<void> {
  const platformEmoji = post.platform === 'linkedin' ? '🔗' : '📘'
  const relevancePercent = Math.round(post.relevance_score * 100)

  const message = `🔍 <b>Relevant Post in ${platformEmoji} ${subscription.community_name}</b>

👤 <b>Author:</b> ${escapeHtml(post.author_name || 'Unknown')}
${post.author_headline ? `<i>${escapeHtml(post.author_headline)}</i>` : ''}
${post.author_profile_url ? `<a href="${post.author_profile_url}">View Profile</a>` : ''}

📄 <b>Post:</b>
<i>"${escapeHtml(post.post_text.substring(0, 400))}"</i>
${post.post_text.length > 400 ? '...' : ''}

🎯 <b>Relevance:</b> ${relevancePercent}%
🏷️ <b>Matched:</b> ${post.matched_keywords.join(', ')}

${post.post_url ? `🔗 <a href="${post.post_url}">View Post</a>` : ''}

📝 <b>Suggested Comment:</b>
<code>${escapeHtml((post.suggested_comment || 'Generating...').substring(0, 300))}</code>
`

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💬 Comment', callback_data: `engage_post_${post.id}` },
        { text: '✏️ Edit', callback_data: `edit_engagement_${post.id}` }
      ],
      [
        { text: '⏭️ Skip', callback_data: `skip_post_${post.id}` }
      ]
    ]
  }

  await sendToCommentsBot(message, { parseMode: 'HTML', replyMarkup: keyboard })
}
