/**
 * LLM Helper for Video Processor scripts (Node.js)
 *
 * Priority: NVIDIA NIM (free, 40 RPM) → Gemini 2.5 Flash (fallback)
 * Replaces all Azure OpenAI calls removed in March 2026.
 */

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const LLM_TIMEOUT_MS = 60_000;

/** Fetch with AbortController timeout */
async function fetchWithTimeout(url, options, timeoutMs = LLM_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call LLM with system + user prompt. Returns raw text.
 * Accumulates errors from all providers for better diagnostics.
 */
export async function callLLM(systemPrompt, userPrompt, options = {}) {
  const { maxTokens = 4000, temperature = 0.7, jsonMode = false } = options;
  const errors = [];

  // Try NVIDIA NIM first (free tier, OpenAI-compatible)
  if (NVIDIA_API_KEY) {
    try {
      return await callNvidia(systemPrompt, userPrompt, { maxTokens, temperature, jsonMode });
    } catch (err) {
      errors.push(`NVIDIA: ${err.message}`);
      console.warn(`⚠️ NVIDIA NIM failed: ${err.message}, falling back to Gemini`);
    }
  }

  // Fallback to Gemini
  if (GOOGLE_API_KEY) {
    try {
      return await callGemini(systemPrompt, userPrompt, { maxTokens, temperature, jsonMode });
    } catch (err) {
      errors.push(`Gemini: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`All LLM backends failed:\n  - ${errors.join('\n  - ')}`);
  }
  throw new Error('No LLM credentials available (NVIDIA_API_KEY or GOOGLE_API_KEY required)');
}

/**
 * Call LLM and parse JSON response. Safe JSON extraction with fallback.
 */
export async function callLLMJson(systemPrompt, userPrompt, options = {}) {
  const raw = await callLLM(systemPrompt, userPrompt, { ...options, jsonMode: true });

  // Extract JSON — try markdown fences first, then raw
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  const jsonStr = fenceMatch ? fenceMatch[1].trim() : raw.trim();

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // Fallback: extract first {...} block (non-greedy)
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try { return JSON.parse(objMatch[0]); } catch { /* fall through */ }
    }
    console.error(`LLM JSON parse failed. Raw (500 chars): ${raw.substring(0, 500)}`);
    throw new Error(`LLM JSON parse failed: ${e.message}`);
  }
}

// ── NVIDIA NIM (OpenAI-compatible) ──

async function callNvidia(systemPrompt, userPrompt, { maxTokens, temperature, jsonMode }) {
  const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'mistralai/mistral-small-24b-instruct-2501',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    let err;
    try { err = JSON.stringify(await response.json()); } catch { err = await response.text(); }
    throw new Error(`NVIDIA NIM ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty NVIDIA NIM response');

  const usage = data.usage;
  if (usage) {
    console.log(`💰 NVIDIA tokens: ${usage.prompt_tokens}+${usage.completion_tokens}`);
  }

  return content;
}

// ── Gemini 2.5 Flash ──

async function callGemini(systemPrompt, userPrompt, { maxTokens, temperature, jsonMode }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!content) throw new Error('Empty Gemini response');

  const usage = data.usageMetadata;
  if (usage) {
    console.log(`💰 Gemini tokens: ${usage.promptTokenCount}+${usage.candidatesTokenCount}`);
  }

  return content;
}
