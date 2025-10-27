import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔍 DEBUG: Starting news monitoring...')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get active RSS sources only
    const { data: sources, error } = await supabase
      .from('news_sources')
      .select('*')
      .eq('is_active', true)
      .eq('source_type', 'rss')

    console.log('🔍 DEBUG: Sources query result:', { sources, error })

    if (error) {
      console.error('❌ Error fetching sources:', error)
      throw error
    }

    console.log(`✅ Found ${sources?.length || 0} active RSS sources`)

    if (!sources || sources.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No RSS sources found',
          checked: 0,
          processed: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const debugInfo = []

    // Test first source only for debugging
    const source = sources[0]
    console.log(`🔍 Testing source: ${source.name}`)
    console.log(`🔍 RSS URL: ${source.rss_url}`)

    try {
      // Fetch RSS
      console.log('🔍 Fetching RSS...')
      const response = await fetch(source.rss_url)
      console.log(`🔍 Response status: ${response.status}`)

      const xml = await response.text()
      console.log(`🔍 XML length: ${xml.length} characters`)
      console.log(`🔍 First 500 chars of XML:`, xml.substring(0, 500))

      // Try to parse
      console.log('🔍 Attempting to parse XML...')

      // Test with native XML parser
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(xml, 'text/html')
        console.log('✅ Parsed successfully with text/html')

        const items = doc.querySelectorAll('item')
        console.log(`🔍 Found ${items.length} <item> elements`)

        if (items.length === 0) {
          // Try different selectors
          const entries = doc.querySelectorAll('entry')
          console.log(`🔍 Found ${entries.length} <entry> elements (Atom format)`)
        }

        debugInfo.push({
          source: source.name,
          rss_url: source.rss_url,
          fetch_status: response.status,
          xml_length: xml.length,
          items_found: items.length,
          parse_method: 'text/html',
          success: true
        })

      } catch (parseError) {
        console.error('❌ Parse error:', parseError)
        debugInfo.push({
          source: source.name,
          error: parseError.message,
          success: false
        })
      }

    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError)
      debugInfo.push({
        source: source.name,
        error: fetchError.message,
        success: false
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        debug_mode: true,
        message: 'Debug run completed - check logs for details',
        sources_available: sources.length,
        debug_info: debugInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Fatal error:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
