import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { loadScheduleConfig, isInsidePublishingWindow, countInFlight, getOsloNow } from '../_shared/schedule-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const VERSION = '2026-04-03-v2-oslo-time-fix'

/**
 * Schedule Publisher: triggered by cron every 5 min.
 * Picks the next due scheduled article and fires auto-publish-news.
 */
serve(async (req) => {
  console.log(`📅 Schedule Publisher ${VERSION} started`)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // 1. Load config, check enabled
    const config = await loadScheduleConfig(supabase)
    if (!config.enabled) {
      console.log('Schedule publishing is disabled')
      return new Response(
        JSON.stringify({ success: true, action: 'disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Check if inside active window
    const { inside, currentWindow } = isInsidePublishingWindow(config)
    if (!inside) {
      console.log('Outside publishing window, skipping')
      return new Response(
        JSON.stringify({ success: true, action: 'outside_window' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`Inside window: ${currentWindow}`)

    // 3. Check in-flight count
    const inFlight = await countInFlight(supabase)
    if (inFlight > 0) {
      console.log(`${inFlight} article(s) already in-flight, waiting`)
      return new Response(
        JSON.stringify({ success: true, action: 'in_flight', count: inFlight }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Pick next due scheduled article
    // scheduled_publish_at is stored in Oslo-as-UTC format (from computeScheduledTime),
    // so compare with Oslo time, not real UTC
    const now = getOsloNow().toISOString()
    const { data: nextArticle, error } = await supabase
      .from('news')
      .select('id, telegram_message_id, preset_config')
      .eq('auto_publish_status', 'scheduled')
      .lte('scheduled_publish_at', now)
      .order('scheduled_publish_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !nextArticle) {
      console.log('No scheduled articles due right now')
      return new Response(
        JSON.stringify({ success: true, action: 'no_due_articles' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Publishing scheduled article: ${nextArticle.id}`)

    // 5. Transition from 'scheduled' to 'queued' to prevent double-pick
    // auto-publish-news will set 'pending' on entry
    await supabase
      .from('news')
      .update({ auto_publish_status: 'queued', auto_publish_started_at: new Date().toISOString() })
      .eq('id', nextArticle.id)

    // 6. Fire auto-publish-news
    const preset = nextArticle.preset_config || undefined
    const body: Record<string, any> = {
      newsId: nextArticle.id,
      telegramMessageId: nextArticle.telegram_message_id || null,
    }
    if (preset) {
      body.preset = preset
    }

    fetch(`${SUPABASE_URL}/functions/v1/auto-publish-news`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).catch(e => console.warn('Fire auto-publish error:', e))

    return new Response(
      JSON.stringify({ success: true, action: 'fired', newsId: nextArticle.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Schedule publisher error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
