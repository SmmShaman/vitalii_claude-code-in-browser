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

  // Approximate: ~2.5 words per second for natural speech
  const targetWordCount = Math.round(maxDurationSeconds * 2.5);

  const systemPrompt = `You are a professional newsreader and social media content creator. 
Your task is to create a voiceover script for a short news video (TikTok / YouTube Shorts / Instagram Reels style).

Rules:
- Write in ${langName}
- The script must be EXACTLY the spoken text — no stage directions, no timestamps, no [brackets]
- Target length: approximately ${targetWordCount} words (~${maxDurationSeconds} seconds when spoken)
- Start with a hook that grabs attention in the first 3 seconds
- Use short, punchy sentences
- End with a brief call-to-action or thought-provoking statement
- Keep the tone informative but engaging, not robotic
- Do NOT include any formatting, just plain spoken text`;

  const userPrompt = `Create a voiceover script for this news article:\n\n${articleText.substring(0, 3000)}`;

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

  console.log(`📝 Generated script (${script.split(/\s+/).length} words, ~${Math.round(script.split(/\s+/).length / 2.5)}s):`);
  console.log(`   "${script.substring(0, 100)}..."`);

  return script;
}
