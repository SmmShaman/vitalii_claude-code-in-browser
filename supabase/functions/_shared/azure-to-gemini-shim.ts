/**
 * LLM Router Shim — NVIDIA NIM (primary) → Gemini (fallback)
 * Drop-in replacement for Azure OpenAI calls.
 *
 * Usage:
 *   import { azureFetch } from '../_shared/azure-to-gemini-shim.ts'
 *   const response = await azureFetch('gemini', { method: 'POST', ... })
 */

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY') || ''
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''
const NVIDIA_MODEL = 'mistralai/mistral-small-4-119b-2603'
const GEMINI_MODEL = 'gemini-2.5-flash'

export async function azureFetch(
  _url: string,
  options: RequestInit,
): Promise<Response> {
  const body = JSON.parse(options.body as string)
  const messages: Array<{role: string; content: string}> = body.messages || []
  const temperature = body.temperature ?? 0.5
  const maxTokens = body.max_tokens ?? 8000

  // Try NVIDIA NIM first (free, 40 RPM)
  if (NVIDIA_API_KEY) {
    try {
      const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NVIDIA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      })

      if (nvidiaRes.ok) {
        const nvidiaData = await nvidiaRes.json()
        const text = nvidiaData?.choices?.[0]?.message?.content?.trim() || ''

        if (text) {
          console.log(`🟢 NVIDIA NIM (${NVIDIA_MODEL.split('/')[1]}) — ${text.length} chars`)

          // Strip markdown code fences if present
          let cleaned = text
          if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
          }

          return new Response(JSON.stringify({
            choices: [{
              message: { content: cleaned, role: 'assistant' },
              finish_reason: 'stop',
            }],
            usage: nvidiaData.usage || { total_tokens: 0 },
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
      }

      // NVIDIA failed — log and fall through to Gemini
      const errText = await nvidiaRes.text().catch(() => '')
      console.warn(`⚠️ NVIDIA NIM failed (${nvidiaRes.status}): ${errText.substring(0, 200)}`)
    } catch (e) {
      console.warn(`⚠️ NVIDIA NIM error: ${(e as Error).message}`)
    }
  }

  // Fallback: Gemini
  if (!GOOGLE_API_KEY) {
    throw new Error('Neither NVIDIA_API_KEY nor GOOGLE_API_KEY configured')
  }

  console.log(`🟡 Fallback to Gemini (${GEMINI_MODEL})`)

  // Detect if caller expects JSON
  const systemMsg = messages.find(m => m.role === 'system')?.content || ''
  const expectsJson = /json/i.test(systemMsg)

  const parts = messages.map(m => m.content).join('\n\n')

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`

  const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens: maxTokens }
  if (expectsJson) {
    generationConfig.responseMimeType = 'application/json'
  }

  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: parts }] }],
      generationConfig,
    }),
  })

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    console.error('❌ Gemini API error:', err.substring(0, 300))
    return new Response(JSON.stringify({ error: { message: `Gemini error: ${err.slice(0, 200)}` } }), {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const geminiData = await geminiRes.json()
  let text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    const blockReason = geminiData?.candidates?.[0]?.finishReason || geminiData?.promptFeedback?.blockReason || 'unknown'
    console.error('⚠️ Gemini returned empty text. Reason:', blockReason)
  }

  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
  }

  return new Response(JSON.stringify({
    choices: [{
      message: { content: text, role: 'assistant' },
      finish_reason: 'stop',
    }],
    usage: { total_tokens: 0 },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
