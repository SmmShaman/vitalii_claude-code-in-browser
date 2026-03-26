import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { voiceFileId } = await req.json()
    if (!voiceFileId) throw new Error('voiceFileId required')

    // Get Google API key from env or api_settings
    let apiKey = GOOGLE_API_KEY
    if (!apiKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.0')
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      const { data } = await supabase.from('api_settings').select('key_value').eq('key_name', 'GOOGLE_API_KEY').single()
      apiKey = data?.key_value || ''
    }
    if (!apiKey) throw new Error('Google API key not configured')

    // Step 1: Get file path from Telegram
    console.log(`📥 Getting file info for ${voiceFileId}...`)
    const fileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${voiceFileId}`)
    const fileData = await fileRes.json()
    if (!fileData.ok) throw new Error(`getFile failed: ${JSON.stringify(fileData)}`)

    const filePath = fileData.result.file_path
    const fileSize = fileData.result.file_size || 0
    console.log(`📁 File: ${filePath} (${Math.round(fileSize / 1024)}KB)`)

    // Step 2: Download voice file
    const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`
    const audioRes = await fetch(downloadUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
    console.log(`🎙️ Downloaded ${Math.round(audioBuffer.byteLength / 1024)}KB audio`)

    // Step 3: Send to Gemini for transcription
    const mimeType = filePath.endsWith('.oga') || filePath.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg'

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Transcribe this audio message. Return ONLY the spoken text, nothing else. The language may be Ukrainian, Russian, English, or Norwegian. Preserve the original language." },
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4000 },
        }),
      },
    )

    if (!geminiRes.ok) {
      const err = await geminiRes.text()
      throw new Error(`Gemini ${geminiRes.status}: ${err.slice(0, 200)}`)
    }

    const geminiData = await geminiRes.json()
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log(`✅ Transcribed: ${text.slice(0, 100)}...`)

    return new Response(JSON.stringify({ success: true, text, audioSize: audioBuffer.byteLength }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('❌ Transcription failed:', err)
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
