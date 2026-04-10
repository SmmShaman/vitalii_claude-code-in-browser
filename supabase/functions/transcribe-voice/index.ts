import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
const VERSION_STAMP = '2026-03-29-force-redeploy'

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
    // Chunk-based base64 encoding to avoid stack overflow on large files
    const bytes = new Uint8Array(audioBuffer)
    let audioBase64 = ''
    const chunkSize = 32768
    for (let i = 0; i < bytes.length; i += chunkSize) {
      audioBase64 += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)))
    }
    audioBase64 = btoa(audioBase64)
    console.log(`🎙️ Downloaded ${Math.round(audioBuffer.byteLength / 1024)}KB audio`)

    // Step 3: Send to Gemini for transcription (with retry + model fallback)
    const mimeType = filePath.endsWith('.oga') || filePath.endsWith('.ogg') ? 'audio/ogg' : 'audio/mpeg'
    const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash']

    let text = ''
    let lastError = ''

    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          console.log(`🧠 Trying ${model} (attempt ${attempt + 1})...`)
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

          if (geminiRes.status === 429 || geminiRes.status === 503) {
            lastError = `${model} ${geminiRes.status}: overloaded`
            console.log(`  ⏳ ${lastError}, ${attempt === 0 ? 'retrying...' : 'trying next model...'}`)
            if (attempt === 0) await new Promise(r => setTimeout(r, 3000))
            continue
          }

          if (!geminiRes.ok) {
            const err = await geminiRes.text()
            lastError = `${model} ${geminiRes.status}: ${err.slice(0, 100)}`
            console.log(`  ❌ ${lastError}`)
            break // Try next model
          }

          const geminiData = await geminiRes.json()
          text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''
          if (text) {
            console.log(`✅ Transcribed with ${model}: ${text.slice(0, 100)}...`)
            break
          }
        } catch (e: any) {
          lastError = `${model}: ${e.message}`
          console.log(`  ❌ ${lastError}`)
        }
      }
      if (text) break
    }

    if (!text) throw new Error(`All models failed. Last: ${lastError}`)

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
