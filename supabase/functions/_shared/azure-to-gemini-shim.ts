/**
 * LLM Router Shim — NVIDIA NIM (primary, 40 RPM free) → Gemini (fallback)
 * Drop-in replacement for Azure OpenAI calls.
 *
 * Features: timeout (25s), error categorization, retry on 429/503.
 *
 * Usage:
 *   import { azureFetch } from '../_shared/azure-to-gemini-shim.ts'
 *   const response = await azureFetch('gemini', { method: 'POST', ... })
 */

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY') || ''
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''
const NVIDIA_MODEL = Deno.env.get('NVIDIA_MODEL') || 'mistralai/mistral-small-4-119b-2603'
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') || 'gemini-2.5-flash'
const FETCH_TIMEOUT_MS = 25_000

/** Fetch with AbortController timeout */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<globalThis.Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Check if error is transient (worth retrying) */
function isTransientError(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504
}

export async function azureFetch(
  _url: string,
  options: RequestInit,
): Promise<Response> {
  const body = JSON.parse(options.body as string)
  const messages: Array<{role: string; content: string}> = body.messages || []
  const temperature = body.temperature ?? 0.5
  const maxTokens = body.max_tokens ?? 8000

  // Try NVIDIA NIM first (free, 40 RPM) — with one retry on transient errors
  if (NVIDIA_API_KEY) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const nvidiaRes = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
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

        // Retry on transient errors, fallback on permanent
        const status = nvidiaRes.status
        const errText = await nvidiaRes.text().catch(() => '')
        console.warn(`⚠️ NVIDIA NIM failed (${status}): ${errText.substring(0, 200)}`)

        if (isTransientError(status) && attempt === 0) {
          const delay = status === 429 ? 5000 : 2000
          console.log(`🔄 Retrying NVIDIA in ${delay}ms (${status} transient)...`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
        break // permanent error — fall through to Gemini
      } catch (e) {
        const msg = (e as Error).message
        if (msg.includes('aborted') && attempt === 0) {
          console.warn(`⚠️ NVIDIA NIM timeout, retrying...`)
          continue
        }
        console.warn(`⚠️ NVIDIA NIM error: ${msg}`)
        break
      }
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

  const geminiRes = await fetchWithTimeout(geminiUrl, {
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
