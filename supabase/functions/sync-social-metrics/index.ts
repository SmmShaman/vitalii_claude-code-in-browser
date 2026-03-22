import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import {
  getFacebookPostInsights,
  getInstagramMediaInsights,
  getFacebookPageInfo,
  getInstagramAccountInfo,
  isFacebookConfigured,
  isInstagramConfigured,
  type PostInsights
} from '../_shared/facebook-helpers.ts'
import { type Platform } from '../_shared/social-media-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface MetricsSyncResult {
  platform: Platform
  postsChecked: number
  postsUpdated: number
  errors: string[]
}

/**
 * Sync Social Media Metrics
 *
 * Fetches engagement metrics (impressions, likes, comments, shares, saves)
 * from Facebook and Instagram for all posted content.
 * Also tracks follower counts and saves daily analytics snapshots.
 *
 * LinkedIn: stubbed until Community Management API access is approved.
 *
 * Version: 2026-03-22-v1
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('📊 sync-social-metrics v2026-03-22-v1 starting...')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const results: MetricsSyncResult[] = []

  try {
    // Get all posted social media posts from last 90 days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 90)

    const { data: posts, error: postsError } = await supabase
      .from('social_media_posts')
      .select('*')
      .eq('status', 'posted')
      .gte('posted_at', cutoffDate.toISOString())
      .not('platform_post_id', 'is', null)

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`)
    }

    console.log(`📊 Found ${posts?.length || 0} posts to sync metrics for`)

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

    // Sync Facebook metrics
    if (isFacebookConfigured() && postsByPlatform.facebook.length > 0) {
      const fbResult = await syncPlatformMetrics(supabase, 'facebook', postsByPlatform.facebook)
      results.push(fbResult)
    }

    // Sync Instagram metrics
    if (isInstagramConfigured() && postsByPlatform.instagram.length > 0) {
      const igResult = await syncPlatformMetrics(supabase, 'instagram', postsByPlatform.instagram)
      results.push(igResult)
    }

    // Sync LinkedIn metrics (stubbed)
    if (postsByPlatform.linkedin.length > 0) {
      const liResult = await syncLinkedInMetrics(supabase, postsByPlatform.linkedin)
      results.push(liResult)
    }

    // Track follower counts
    await trackFollowers(supabase)

    // Save daily analytics snapshots
    await saveDailySnapshots(supabase)

    // Update last_synced_at for all checked posts
    const allPostIds = (posts || []).map(p => p.id)
    if (allPostIds.length > 0) {
      await supabase
        .from('social_media_posts')
        .update({ last_synced_at: new Date().toISOString() })
        .in('id', allPostIds)
    }

    // Summary
    const totalUpdated = results.reduce((sum, r) => sum + r.postsUpdated, 0)
    console.log(`✅ Metrics sync completed. Posts updated: ${totalUpdated}`)

    return new Response(
      JSON.stringify({
        success: true,
        results,
        totalPostsSynced: totalUpdated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Metrics sync error:', error)
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
 * Sync metrics for Facebook or Instagram posts
 */
async function syncPlatformMetrics(
  supabase: any,
  platform: 'facebook' | 'instagram',
  posts: any[]
): Promise<MetricsSyncResult> {
  const result: MetricsSyncResult = {
    platform,
    postsChecked: 0,
    postsUpdated: 0,
    errors: []
  }

  const emoji = platform === 'facebook' ? '📘' : '📸'
  console.log(`${emoji} Syncing ${platform} metrics for ${posts.length} posts`)

  for (const post of posts) {
    try {
      result.postsChecked++

      let insights: PostInsights | null = null

      if (platform === 'facebook') {
        insights = await getFacebookPostInsights(post.platform_post_id)
      } else {
        insights = await getInstagramMediaInsights(post.platform_post_id)
      }

      if (!insights) {
        // Insights not available for this post (Stories, old posts, etc.)
        continue
      }

      // Calculate engagement rate
      const totalEngagement = insights.likes + insights.comments + insights.shares
      const engagementRate = insights.impressions > 0
        ? (totalEngagement / insights.impressions) * 100
        : insights.reach > 0
          ? (totalEngagement / insights.reach) * 100
          : null

      // Update post metrics
      const { error: updateError } = await supabase
        .from('social_media_posts')
        .update({
          impressions_count: insights.impressions,
          reach_count: insights.reach,
          likes_count: insights.likes,
          comments_count: insights.comments,
          shares_count: insights.shares,
          saves_count: insights.saves,
          views_count: insights.impressions, // Use impressions as views proxy
          engagement_rate: engagementRate,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (updateError) {
        result.errors.push(`Post ${post.id}: ${updateError.message}`)
        continue
      }

      result.postsUpdated++

    } catch (error: any) {
      result.errors.push(`Post ${post.id}: ${error.message}`)
    }
  }

  console.log(`${emoji} ${platform}: checked ${result.postsChecked}, updated ${result.postsUpdated}`)
  return result
}

/**
 * Sync LinkedIn metrics (stubbed — requires Community Management API)
 */
async function syncLinkedInMetrics(
  supabase: any,
  posts: any[]
): Promise<MetricsSyncResult> {
  const result: MetricsSyncResult = {
    platform: 'linkedin',
    postsChecked: 0,
    postsUpdated: 0,
    errors: []
  }

  console.log(`🔗 LinkedIn metrics sync: ${posts.length} posts`)
  console.log('⚠️ LinkedIn Analytics API requires Community Management API approval. Skipping for now.')

  // TODO: When Community Management API access is approved, use:
  // GET /organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity={orgUrn}&shares[0]={shareUrn}
  // to fetch impressions, clicks, likes, comments, shares per post

  result.postsChecked = posts.length
  result.errors.push('LinkedIn Analytics API not enabled - requires Community Management API approval')

  return result
}

/**
 * Track follower counts for all configured platforms
 * Upserts one row per platform per day into follower_history
 */
async function trackFollowers(supabase: any): Promise<void> {
  console.log('👥 Tracking follower counts...')
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  // Facebook followers
  if (isFacebookConfigured()) {
    try {
      const pageInfo = await getFacebookPageInfo()
      if (pageInfo?.followers_count) {
        await supabase
          .from('follower_history')
          .upsert({
            platform: 'facebook',
            follower_count: pageInfo.followers_count,
            recorded_date: today
          }, { onConflict: 'platform,recorded_date' })
        console.log(`  📘 Facebook followers: ${pageInfo.followers_count}`)
      }
    } catch (error: any) {
      console.warn('⚠️ Failed to track Facebook followers:', error.message)
    }
  }

  // Instagram followers
  if (isInstagramConfigured()) {
    try {
      const igInfo = await getInstagramAccountInfo()
      if (igInfo?.followers_count) {
        await supabase
          .from('follower_history')
          .upsert({
            platform: 'instagram',
            follower_count: igInfo.followers_count,
            recorded_date: today
          }, { onConflict: 'platform,recorded_date' })
        console.log(`  📸 Instagram followers: ${igInfo.followers_count}`)
      }
    } catch (error: any) {
      console.warn('⚠️ Failed to track Instagram followers:', error.message)
    }
  }

  // LinkedIn: stubbed
  console.log('  🔗 LinkedIn follower tracking: pending API approval')
}

/**
 * Aggregate daily metrics into analytics_snapshots
 * Creates per-platform + 'all' summary rows
 */
async function saveDailySnapshots(supabase: any): Promise<void> {
  console.log('📸 Saving daily analytics snapshots...')
  const today = new Date().toISOString().split('T')[0]

  const platforms: Platform[] = ['facebook', 'instagram', 'linkedin', 'tiktok']

  let grandTotals = {
    total_posts: 0,
    total_impressions: 0,
    total_reach: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0,
    total_saves: 0,
    total_views: 0,
    engagement_sum: 0,
    engagement_count: 0,
  }

  for (const platform of platforms) {
    // Get all posted posts for this platform
    const { data: posts } = await supabase
      .from('social_media_posts')
      .select('id, impressions_count, reach_count, likes_count, comments_count, shares_count, saves_count, views_count, engagement_rate')
      .eq('platform', platform)
      .eq('status', 'posted')

    if (!posts || posts.length === 0) continue

    const totals = posts.reduce((acc: any, p: any) => ({
      total_posts: acc.total_posts + 1,
      total_impressions: acc.total_impressions + (p.impressions_count || 0),
      total_reach: acc.total_reach + (p.reach_count || 0),
      total_likes: acc.total_likes + (p.likes_count || 0),
      total_comments: acc.total_comments + (p.comments_count || 0),
      total_shares: acc.total_shares + (p.shares_count || 0),
      total_saves: acc.total_saves + (p.saves_count || 0),
      total_views: acc.total_views + (p.views_count || 0),
    }), {
      total_posts: 0, total_impressions: 0, total_reach: 0, total_likes: 0,
      total_comments: 0, total_shares: 0, total_saves: 0, total_views: 0,
    })

    // Calculate avg engagement rate from posts that have it
    const postsWithRate = posts.filter((p: any) => p.engagement_rate != null && p.engagement_rate > 0)
    const avgRate = postsWithRate.length > 0
      ? postsWithRate.reduce((sum: number, p: any) => sum + p.engagement_rate, 0) / postsWithRate.length
      : 0

    // Find top post by impressions
    const topPost = posts.reduce((best: any, p: any) =>
      (p.impressions_count || 0) > (best?.impressions_count || 0) ? p : best
    , posts[0])

    await supabase
      .from('analytics_snapshots')
      .upsert({
        platform,
        snapshot_date: today,
        ...totals,
        avg_engagement_rate: Math.round(avgRate * 100) / 100,
        top_post_id: topPost?.id || null
      }, { onConflict: 'platform,snapshot_date' })

    // Add to grand totals
    grandTotals.total_posts += totals.total_posts
    grandTotals.total_impressions += totals.total_impressions
    grandTotals.total_reach += totals.total_reach
    grandTotals.total_likes += totals.total_likes
    grandTotals.total_comments += totals.total_comments
    grandTotals.total_shares += totals.total_shares
    grandTotals.total_saves += totals.total_saves
    grandTotals.total_views += totals.total_views
    grandTotals.engagement_sum += avgRate * postsWithRate.length
    grandTotals.engagement_count += postsWithRate.length
  }

  // Save 'all' platform aggregate
  const overallAvgRate = grandTotals.engagement_count > 0
    ? grandTotals.engagement_sum / grandTotals.engagement_count
    : 0

  await supabase
    .from('analytics_snapshots')
    .upsert({
      platform: 'all',
      snapshot_date: today,
      total_posts: grandTotals.total_posts,
      total_impressions: grandTotals.total_impressions,
      total_reach: grandTotals.total_reach,
      total_likes: grandTotals.total_likes,
      total_comments: grandTotals.total_comments,
      total_shares: grandTotals.total_shares,
      total_saves: grandTotals.total_saves,
      total_views: grandTotals.total_views,
      avg_engagement_rate: Math.round(overallAvgRate * 100) / 100,
    }, { onConflict: 'platform,snapshot_date' })

  console.log(`📸 Snapshots saved for ${today}`)
}
