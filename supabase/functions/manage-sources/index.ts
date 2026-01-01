import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const { action, names, ids } = await req.json().catch(() => ({}))

    if (action === 'disable') {
      // Disable sources by name
      if (names && names.length > 0) {
        const { data, error } = await supabase
          .from('news_sources')
          .update({ is_active: false })
          .in('name', names)
          .select('name, is_active')

        if (error) throw error
        return new Response(JSON.stringify({ ok: true, disabled: data }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    if (action === 'enable') {
      // Enable sources by name
      if (names && names.length > 0) {
        const { data, error } = await supabase
          .from('news_sources')
          .update({ is_active: true })
          .in('name', names)
          .select('name, is_active')

        if (error) throw error
        return new Response(JSON.stringify({ ok: true, enabled: data }), {
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    if (action === 'list') {
      const { data, error } = await supabase
        .from('news_sources')
        .select('id, name, url, is_active')
        .order('name')

      if (error) throw error
      return new Response(JSON.stringify({ ok: true, sources: data }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (action === 'delete_rejected') {
      // Delete rejected news
      const { data, error } = await supabase
        .from('news')
        .delete()
        .eq('pre_moderation_status', 'rejected')
        .select('id')

      if (error) throw error
      return new Response(JSON.stringify({
        ok: true,
        deleted: data?.length || 0,
        message: `Deleted ${data?.length || 0} rejected news`
      }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({
      ok: false,
      error: 'Invalid action. Use: disable, enable, or list',
      usage: {
        disable: { action: 'disable', names: ['channel1', 'channel2'] },
        enable: { action: 'enable', names: ['channel1'] },
        list: { action: 'list' }
      }
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
