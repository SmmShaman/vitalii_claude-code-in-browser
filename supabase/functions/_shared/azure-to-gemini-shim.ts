/**
 * Azure OpenAI → Gemini compatibility shim
 * Drop-in replacement: just import this and Azure calls will use Gemini
 * 
 * Usage in each function:
 *   import { azureFetch } from '../_shared/azure-to-gemini-shim.ts'
 *   // Replace: await fetch(azureUrl, {...}) 
 *   // With:    await azureFetch(azureUrl, {...})
 */

const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY') || ''
const GEMINI_MODEL = 'gemini-2.5-flash'

export async function azureFetch(
  _url: string,  // ignored — we call Gemini instead
  options: RequestInit,
): Promise<Response> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY not configured for Gemini shim')
  }

  // Parse the Azure-style request body
  const body = JSON.parse(options.body as string)
  const messages: Array<{role: string; content: string}> = body.messages || []
  const temperature = body.temperature ?? 0.5
  const maxTokens = body.max_tokens ?? 8000

  // Combine system + user messages into single prompt
  const parts = messages.map(m => m.content).join('\n\n')

  // Call Gemini
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`
  
  const geminiRes = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: parts }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  })

  if (!geminiRes.ok) {
    const err = await geminiRes.text()
    // Return Azure-compatible error response
    return new Response(JSON.stringify({ error: { message: `Gemini error: ${err.slice(0, 200)}` } }), {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const geminiData = await geminiRes.json()
  const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Return Azure-compatible response format
  const azureResponse = {
    choices: [{
      message: {
        content: text,
        role: 'assistant',
      },
      finish_reason: 'stop',
    }],
    usage: { total_tokens: 0 },
  }

  return new Response(JSON.stringify(azureResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
