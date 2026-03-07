/**
 * AI Script Generator
 *
 * Uses Azure OpenAI to generate a short, punchy voiceover script
 * from the original news article text.
 *
 * This runs inside the GitHub Actions video-processor pipeline
 * BEFORE the Remotion render step.
 */

/**
 * Generate a voiceover script from news article text.
 *
 * @param {string} articleText - The original news article text
 * @param {string} language - Target language: 'en', 'no', or 'ua'
 * @param {number} maxDurationSeconds - Target duration for the voiceover (default: 45)
 * @returns {Promise<string>} The generated script text
 */
export async function generateScript(articleText, language = 'en', maxDurationSeconds = 45) {
  const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
  const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';

  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    throw new Error('Missing Azure OpenAI credentials (AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY)');
  }

  const languageNames = { en: 'English', no: 'Norwegian', ua: 'Ukrainian' };
  const langName = languageNames[language] || 'English';

  // ~2 words/sec for TTS. Reserve 3s for intro hook + 3s for outro
  const targetWordCount = Math.round(maxDurationSeconds * 2);
  const hookSeconds = Math.min(3, Math.round(maxDurationSeconds * 0.15));
  const outroSeconds = Math.min(3, Math.round(maxDurationSeconds * 0.15));
  const bodySeconds = maxDurationSeconds - hookSeconds - outroSeconds;

  const systemPrompt = `You are a professional newsreader creating a voiceover for a ${Math.round(maxDurationSeconds)}-second news video.

The video is EXACTLY ${Math.round(maxDurationSeconds)} seconds long. Your script must tell a COMPLETE story that fits this duration — with a beginning, middle, and end. Do NOT cut off mid-thought.

STRUCTURE (${Math.round(maxDurationSeconds)}s total):
1. HOOK (first ~${hookSeconds}s): One punchy sentence that grabs attention immediately
2. BODY (~${bodySeconds}s): The core story — what happened, why it matters. 2-4 short sentences.
3. OUTRO (~${outroSeconds}s): A concluding thought, takeaway, or call-to-action. One sentence.

RULES:
- Write in ${langName}
- Output ONLY the spoken text — no stage directions, no timestamps, no [brackets], no labels
- STRICTLY ${targetWordCount} words maximum (this is critical — TTS will speak at ~2 words/sec)
- Short, punchy sentences. Conversational tone, not robotic.
- The story must feel COMPLETE — never end mid-sentence or mid-thought
- Do NOT try to cover every detail from the article — pick the most compelling angle`;

  const userPrompt = `Write a ${Math.round(maxDurationSeconds)}-second voiceover script (max ${targetWordCount} words) for this news:\n\n${articleText.substring(0, 3000)}`;

  const url = `${AZURE_ENDPOINT}/openai/deployments/${AZURE_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const script = data.choices?.[0]?.message?.content?.trim();

  if (!script) {
    throw new Error('Azure OpenAI returned empty script');
  }

  console.log(`📝 Generated script (${script.split(/\s+/).length} words, ~${Math.round(script.split(/\s+/).length / 2)}s for ${Math.round(maxDurationSeconds)}s video):`);
  console.log(`   "${script.substring(0, 100)}..."`);

  return script;
}
