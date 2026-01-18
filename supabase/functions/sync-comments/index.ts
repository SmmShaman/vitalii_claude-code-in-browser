import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  getFacebookPostComments,
  getInstagramPostComments,
  isFacebookConfigured,
  isInstagramConfigured,
  type FacebookComment,
  type InstagramComment
} from '../_shared/facebook-helpers.ts'
import {
  sendToCommentsBot,
  escapeHtml,
  getSupabaseClient,
  type Platform
} from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface SyncResult {
  platform: Platform
  postsChecked: number
  commentsFound: number
  newComments: number
  errors: string[]
}

/**
 * Sync Comments from Social Media Platforms
 *
 * Fetches new comments from LinkedIn, Facebook, and Instagram
 * and stores them in the database for review and response.
 * Sends notifications to the comments bot for new comments.
 *
 * Version: 2025-01-17-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('🔄 Starting comment sync...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const results: SyncResult[] = []

  try {
    // Get all posted social media posts from last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('status', 'posted')
      .gte('posted_at', thirtyDaysAgo.toISOString())
      .not('platform_post_id', 'is', null)

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`)
    }

    console.log(`📊 Found ${posts?.length || 0} posts to check for comments`)

    // Group posts by platform
    const postsByPlatform: Record<Platform, typeof posts> = {
      linkedin: [],
      facebook: [],
      instagram: [],
      tiktok: []
    }

    for (const post of posts || []) {
      if (post.platform in postsByPlatform) {
        postsByPlatform[post.platform as Platform].push(post)
      }
    }

    // Sync Facebook comments
    if (isFacebookConfigured() && postsByPlatform.facebook.length > 0) {
      const fbResult = await syncFacebookComments(supabase, postsByPlatform.facebook)
      results.push(fbResult)
    }

    // Sync Instagram comments
    if (isInstagramConfigured() && postsByPlatform.instagram.length > 0) {
      const igResult = await syncInstagramComments(supabase, postsByPlatform.instagram)
      results.push(igResult)
    }

    // Sync LinkedIn comments
    // Note: LinkedIn API for comments requires special approval
    // For now, we'll skip this or use polling
    if (postsByPlatform.linkedin.length > 0) {
      const liResult = await syncLinkedInComments(supabase, postsByPlatform.linkedin)
      results.push(liResult)
    }

    // Update last sync time
    await supabase
      .from('social_media_posts')
      .update({ last_synced_at: new Date().toISOString() })
      .in('id', (posts || []).map(p => p.id))

    // Summary
    const totalNew = results.reduce((sum, r) => sum + r.newComments, 0)
    console.log(`✅ Comment sync completed. New comments: ${totalNew}`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalNewComments: totalNew
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Comment sync error:', error)
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
 * Sync Facebook comments for given posts
 */
async function syncFacebookComments(
  supabase: any,
  posts: any[]
): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'facebook',
    postsChecked: 0,
    commentsFound: 0,
    newComments: 0,
    errors: []
  }

  console.log(`📘 Syncing Facebook comments for ${posts.length} posts`)

  for (const post of posts) {
    try {
      result.postsChecked++

      const comments = await getFacebookPostComments(post.platform_post_id)
      result.commentsFound += comments.length

      for (const comment of comments) {
        const saved = await saveComment(supabase, {
          socialPostId: post.id,
          platform: 'facebook',
          platformCommentId: comment.id,
          authorName: comment.from?.name || 'Unknown',
          authorProfileUrl: comment.from?.id ? `https://facebook.com/${comment.from.id}` : null,
          commentText: comment.message,
          likesCount: comment.like_count || 0,
          repliesCount: comment.comment_count || 0,
          commentCreatedAt: comment.created_time,
          parentCommentId: comment.parent?.id
        })

        if (saved.isNew) {
          result.newComments++
          await notifyNewComment(supabase, saved.comment, post)
        }
      }

      // Update post comment count
      await supabase
        .from('social_media_posts')
        .update({ comments_count: comments.length })
        .eq('id', post.id)

    } catch (error: any) {
      result.errors.push(`Post ${post.id}: ${error.message}`)
    }
  }

  return result
}

/**
 * Sync Instagram comments for given posts
 */
async function syncInstagramComments(
  supabase: any,
  posts: any[]
): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'instagram',
    postsChecked: 0,
    commentsFound: 0,
    newComments: 0,
    errors: []
  }

  console.log(`📸 Syncing Instagram comments for ${posts.length} posts`)

  for (const post of posts) {
    try {
      result.postsChecked++

      const comments = await getInstagramPostComments(post.platform_post_id)
      result.commentsFound += comments.length

      for (const comment of comments) {
        const saved = await saveComment(supabase, {
          socialPostId: post.id,
          platform: 'instagram',
          platformCommentId: comment.id,
          authorName: comment.username,
          authorUsername: comment.username,
          authorProfileUrl: `https://instagram.com/${comment.username}`,
          commentText: comment.text,
          likesCount: comment.like_count || 0,
          commentCreatedAt: comment.timestamp
        })

        if (saved.isNew) {
          result.newComments++
          await notifyNewComment(supabase, saved.comment, post)
        }

        // Process replies if any
        if (comment.replies?.data) {
          for (const reply of comment.replies.data) {
            await saveComment(supabase, {
              socialPostId: post.id,
              platform: 'instagram',
              platformCommentId: reply.id,
              authorName: reply.username,
              authorUsername: reply.username,
              authorProfileUrl: `https://instagram.com/${reply.username}`,
              commentText: reply.text,
              commentCreatedAt: reply.timestamp,
              parentCommentId: comment.id
            })
          }
        }
      }

      // Update post comment count
      await supabase
        .from('social_media_posts')
        .update({ comments_count: comments.length })
        .eq('id', post.id)

    } catch (error: any) {
      result.errors.push(`Post ${post.id}: ${error.message}`)
    }
  }

  return result
}

/**
 * Sync LinkedIn comments (limited API access)
 * LinkedIn commenting API requires special approval
 */
async function syncLinkedInComments(
  supabase: any,
  posts: any[]
): Promise<SyncResult> {
  const result: SyncResult = {
    platform: 'linkedin',
    postsChecked: 0,
    commentsFound: 0,
    newComments: 0,
    errors: []
  }

  console.log(`🔗 LinkedIn comment sync: ${posts.length} posts`)
  console.log('⚠️ LinkedIn Comments API requires special approval. Skipping for now.')

  // LinkedIn's Comments API requires Marketing Developer Platform access
  // which requires a separate application approval process.
  // For now, we just log that we would check these posts.

  result.postsChecked = posts.length
  result.errors.push('LinkedIn Comments API not enabled - requires Marketing Developer Platform approval')

  return result
}

/**
 * Save a comment to the database
 */
async function saveComment(
  supabase: any,
  data: {
    socialPostId: string
    platform: Platform
    platformCommentId: string
    authorName?: string
    authorUsername?: string
    authorProfileUrl?: string
    commentText: string
    likesCount?: number
    repliesCount?: number
    commentCreatedAt?: string
    parentCommentId?: string
  }
): Promise<{ isNew: boolean; comment: any }> {
  // Check if comment already exists
  const { data: existing } = await supabase
    .from('social_media_comments')
    .select('id')
    .eq('platform', data.platform)
    .eq('platform_comment_id', data.platformCommentId)
    .single()

  if (existing) {
    // Update existing comment (might have new likes/replies)
    const { data: updated } = await supabase
      .from('social_media_comments')
      .update({
        likes_count: data.likesCount,
        replies_count: data.repliesCount,
        synced_at: new Date().toISOString()
      })
      .eq('id', existing.id)
      .select()
      .single()

    return { isNew: false, comment: updated }
  }

  // Insert new comment
  const { data: inserted, error } = await supabase
    .from('social_media_comments')
    .insert({
      social_post_id: data.socialPostId,
      platform: data.platform,
      platform_comment_id: data.platformCommentId,
      author_name: data.authorName,
      author_username: data.authorUsername,
      author_profile_url: data.authorProfileUrl,
      comment_text: data.commentText,
      likes_count: data.likesCount || 0,
      replies_count: data.repliesCount || 0,
      comment_created_at: data.commentCreatedAt,
      is_read: false,
      is_replied: false
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save comment:', error)
    throw error
  }

  // Generate AI reply suggestion
  await generateReplySuggestion(supabase, inserted)

  return { isNew: true, comment: inserted }
}

/**
 * Generate AI reply suggestion for a comment
 */
async function generateReplySuggestion(supabase: any, comment: any): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-comment-reply`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          commentId: comment.id
        })
      }
    )

    if (!response.ok) {
      console.warn(`Failed to generate reply suggestion for comment ${comment.id}`)
    }
  } catch (error) {
    console.warn('Error generating reply suggestion:', error)
  }
}

/**
 * Send notification to comments bot about new comment
 */
async function notifyNewComment(
  supabase: any,
  comment: any,
  post: any
): Promise<void> {
  // Get the original content
  let articleTitle = 'Unknown Article'
  let articleUrl = ''

  const { data: content } = await supabase
    .from(post.content_type === 'blog' ? 'blog_posts' : 'news')
    .select('title_en, slug_en')
    .eq('id', post.content_id)
    .single()

  if (content) {
    articleTitle = content.title_en || articleTitle
    const path = post.content_type === 'blog' ? 'blog' : 'news'
    articleUrl = `https://vitalii.no/${path}/${content.slug_en}`
  }

  const platformEmoji = post.platform === 'facebook' ? '📘'
    : post.platform === 'instagram' ? '📸'
    : '🔗'

  const message = `📬 <b>New Comment on ${platformEmoji} ${post.platform}</b>

📰 <b>Article:</b> ${escapeHtml(articleTitle)}
🔗 ${articleUrl}

👤 <b>Author:</b> ${escapeHtml(comment.author_name || 'Unknown')}
${comment.author_profile_url ? `<a href="${comment.author_profile_url}">View Profile</a>` : ''}

💬 <b>Comment:</b>
<i>"${escapeHtml(comment.comment_text.substring(0, 500))}"</i>
${comment.comment_text.length > 500 ? '...' : ''}

${comment.suggested_reply ? `
📝 <b>Suggested Reply:</b>
<code>${escapeHtml(comment.suggested_reply.substring(0, 300))}</code>
` : '⏳ Generating reply suggestion...'}
`

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Reply', callback_data: `reply_comment_${comment.id}` },
        { text: '✏️ Edit', callback_data: `edit_reply_${comment.id}` }
      ],
      [
        { text: '🚫 Ignore', callback_data: `ignore_comment_${comment.id}` }
      ]
    ]
  }

  await sendToCommentsBot(message, { parseMode: 'HTML', replyMarkup: keyboard })
}
