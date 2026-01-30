import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Auto-reject news that have been approved but not published within 48 hours.
 * This prevents stale news from clogging up the moderation queue.
 *
 * Triggered by GitHub Actions cron every 6 hours.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🤖 Auto-reject stale news started')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Calculate 48 hours ago
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    console.log(`Looking for news created before: ${fortyEightHoursAgo}`)

    // Find and update stale news
    const { data, error } = await supabase
      .from('news')
      .update({
        pre_moderation_status: 'rejected',
        rejection_reason: 'Auto-rejected: 48h timeout without moderation'
      })
      .eq('pre_moderation_status', 'approved')
      .eq('is_published', false)
      .lt('created_at', fortyEightHoursAgo)
      .select('id, original_title')

    if (error) {
      console.error('Error updating stale news:', error)
      throw error
    }

    const rejectedCount = data?.length || 0
    console.log(`✅ Auto-rejected ${rejectedCount} stale news items`)

    if (data && data.length > 0) {
      console.log('Rejected items:')
      data.forEach(item => {
        console.log(`  - ${item.id}: ${item.original_title?.substring(0, 50)}...`)
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        rejected_count: rejectedCount,
        rejected_ids: data?.map(item => item.id) || [],
        threshold: fortyEightHoursAgo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('❌ Error in auto-reject-stale-news:', errorMessage)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        rejected_count: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
