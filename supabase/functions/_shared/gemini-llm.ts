/**
 * Shared Gemini LLM helper — replaces all Azure OpenAI calls
 * Usage: import { callLLM } from '../_shared/gemini-llm.ts'
 */

const DEFAULT_MODEL = 'gemini-2.5-flash'

interface LLMOptions {
  temperature?: number
  maxTokens?: number
  model?: string
}

/**
 * Call Gemini LLM with system + user prompt (OpenAI-compatible interface)
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  options: LLMOptions = {},
): Promise<string> {
  const apiKey = Deno.env.get('GOOGLE_API_KEY') || ''
  if (!apiKey) throw new Error('GOOGLE_API_KEY not configured')

  const model = options.model || DEFAULT_MODEL
  const temperature = options.temperature ?? 0.5
  const maxTokens = options.maxTokens ?? 8000

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const body = {
    contents: [{
      parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
    }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
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

/**
 * Extract JSON from LLM response (handles markdown fences)
 */
export function extractJSON(text: string): string {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`No JSON found in response: ${cleaned.slice(0, 200)}`)
  return match[0]
}
