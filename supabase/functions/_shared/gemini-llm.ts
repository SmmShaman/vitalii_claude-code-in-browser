/**
 * Shared LLM helper — Gemini primary, Claude fallback
 * Usage: import { callLLM } from '../_shared/gemini-llm.ts'
 */

const DEFAULT_MODEL = 'gemini-2.5-flash'

interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Call LLM with system + user prompt. Gemini primary → Claude Sonnet fallback.
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {},
): Promise<string> {
  const geminiKey = Deno.env.get('GOOGLE_API_KEY') || ''
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || ''

  // Try Gemini first
  if (geminiKey) {
    try {
      return await callGemini(systemPrompt, userPrompt, options, geminiKey)
    } catch (e: any) {
      console.warn(`⚠️ Gemini failed: ${e.message}, falling back to Claude`)
    }
  }

  // Fallback to Claude
  if (anthropicKey) {
    return await callClaude(systemPrompt, userPrompt, options, anthropicKey)
  }

  throw new Error('No LLM configured (GOOGLE_API_KEY or ANTHROPIC_API_KEY required)')
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions,
  apiKey: string,
): Promise<string> {
  const model = options.model || DEFAULT_MODEL
  const temperature = options.temperature ?? 0.5
  const maxTokens = options.maxTokens ?? 8000

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini ${model} error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!text) throw new Error('Gemini returned empty response')
  return text
}

async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions,
  apiKey: string,
): Promise<string> {
  const temperature = options.temperature ?? 0.5
  const maxTokens = options.maxTokens ?? 8000

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Claude error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = (data.content || [])
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('Claude returned empty response')

  const usage = data.usage
  if (usage) console.log(`💰 Claude tokens: ${usage.input_tokens}+${usage.output_tokens}`)
  return text
}

/**
 * Extract JSON from LLM response (handles markdown fences)
 */
export function extractJSON(text: string): string {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON found in response: ${cleaned.slice(0, 200)}`)
  return match[0]
}
