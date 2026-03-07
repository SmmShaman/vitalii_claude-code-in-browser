/**
 * AI Video Director
 *
 * Uses Azure OpenAI (GPT-4.1-mini) to analyze a news article and generate
 * a structured scene plan for Remotion multi-scene video composition.
 *
 * The AI acts as a "video director" — analyzing the article content,
 * deciding the optimal scene structure, picking key quotes and facts,
 * choosing the visual mood and accent colors.
 *
 * Runs inside GitHub Actions — no always-on PC needed.
 */

const SCENE_TYPES_DESCRIPTION = `
Available scene types and their properties:

1. "intro" (2-3 seconds) - Brand intro with category badge
   - category: string (e.g., "tech", "business", "ai", "startup", "science", "politics", "crypto", "health")
   - accentColor: hex color string

2. "headline" (3-5 seconds) - Kinetic typography, words appear one by one
   - text: string (the headline, 5-12 words)
   - imageSrc: will be filled automatically
   - accentColor: hex color string

3. "content" (8-15 seconds) - Main storytelling scene with image + key quote
   - imageSrc: will be filled automatically
   - keyQuote: string (one impactful sentence from the article, 8-15 words)
   - accentColor: hex color string

4. "stats" (4-6 seconds) - Animated facts and numbers
   - facts: array of {value: string, label: string} (2-4 items)
   - title: string (e.g., "Key Facts", "By the Numbers")
   - accentColor: hex color string

5. "outro" (2-3 seconds) - Call-to-action
   - message: string (e.g., "Read the full story on")
   - accentColor: hex color string
`;

/**
 * Call Azure OpenAI chat completion.
 */
async function callAzureOpenAI(systemPrompt, userPrompt, maxTokens = 1500) {
  const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
  const AZURE_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'Jobbot-gpt-4.1-mini';

  if (!AZURE_ENDPOINT || !AZURE_KEY) {
    throw new Error('Missing Azure OpenAI credentials');
  }

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
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Azure OpenAI error: ${response.status} ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('Azure OpenAI returned empty response');
  }

  const usage = data.usage;
  if (usage) {
    console.log(`💰 Tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
  }

  return content;
}

/**
 * Generate a video direction plan using Azure OpenAI.
 *
 * @param {string} articleText - The news article text
 * @param {string} headline - The article headline
 * @param {number} targetDuration - Target video duration in seconds (20-45)
 * @returns {Promise<Object>} Director plan with scenes and voiceover script
 */
export async function directVideo(articleText, headline, targetDuration = 25) {
  const hasAI = process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY;

  if (!hasAI) {
    console.log('⚠️ No Azure OpenAI credentials, falling back to template director');
    return templateDirector(articleText, headline, targetDuration);
  }

  console.log('🎬 AI Director: analyzing article...');

  const systemPrompt = `You are an expert video director for short-form news videos (TikTok/Reels/Shorts style).

Your job is to analyze a news article and create a scene-by-scene plan for a ${targetDuration}-second video.

${SCENE_TYPES_DESCRIPTION}

RULES:
- Total duration of all scenes MUST equal exactly ${targetDuration} seconds
- Every video MUST have: intro (2-3s) + headline (3-5s) + at least one content (8-15s) + outro (2-3s)
- Add a "stats" scene ONLY if the article contains clear numbers, stats, or quantifiable facts
- The voiceoverScript must be a COMPLETE story (hook + body + conclusion) that fits the duration
- voiceoverScript word count: ~${targetDuration * 2} words (TTS speaks at ~2 words/sec)
- Choose accentColor based on the article mood/category:
  - Tech/AI: blue-purple (#667eea, #9b59b6)
  - Business/Startup: green-gold (#2ecc71, #f5a623)
  - Science: teal (#4ecdc4)
  - Politics/Breaking: red (#e74c3c)
  - Crypto/Finance: orange (#f39c12)
- keyQuote should be the most impactful or surprising sentence from the article
- For stats facts, extract REAL numbers from the article (funding amounts, percentages, dates, quantities)
- Do NOT invent facts or numbers that aren't in the article

Return valid JSON with this structure:
{
  "scenes": [...],
  "voiceoverScript": "...",
  "totalDurationSeconds": ${targetDuration},
  "accentColor": "#..."
}`;

  const userPrompt = `Direct a ${targetDuration}-second video for this news article:

HEADLINE: ${headline}

ARTICLE:
${articleText.substring(0, 4000)}`;

  try {
    const content = await callAzureOpenAI(systemPrompt, userPrompt);

    let plan;
    try {
      const jsonStr = content.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
      plan = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content.substring(0, 200));
      throw new Error(`Invalid JSON from AI: ${e.message}`);
    }

    // Validate plan
    if (!plan.scenes || !Array.isArray(plan.scenes) || plan.scenes.length < 3) {
      throw new Error(`Invalid plan: need at least 3 scenes, got ${plan.scenes?.length}`);
    }
    if (!plan.voiceoverScript) {
      throw new Error('Missing voiceoverScript in plan');
    }

    // Ensure durations add up
    const totalSceneDuration = plan.scenes.reduce((sum, s) => sum + s.durationSeconds, 0);
    if (Math.abs(totalSceneDuration - targetDuration) > 2) {
      console.log(`⚠️ Scene durations sum to ${totalSceneDuration}s, adjusting to ${targetDuration}s`);
      const scale = targetDuration / totalSceneDuration;
      plan.scenes.forEach(s => {
        s.durationSeconds = Math.round(s.durationSeconds * scale * 10) / 10;
      });
    }

    plan.totalDurationSeconds = targetDuration;

    const sceneTypes = plan.scenes.map(s => s.type).join(' → ');
    console.log(`🎬 Director plan: ${sceneTypes}`);
    console.log(`📝 Voiceover: ${plan.voiceoverScript.split(/\s+/).length} words`);
    console.log(`🎨 Accent: ${plan.accentColor}`);

    return plan;

  } catch (error) {
    console.error(`⚠️ AI Director failed: ${error.message}`);
    console.log('↩️ Falling back to template director');
    return templateDirector(articleText, headline, targetDuration);
  }
}

/**
 * Fallback template director when AI API is unavailable.
 */
function templateDirector(articleText, headline, targetDuration) {
  console.log('📋 Using template director (no AI API)');

  const text = (articleText + ' ' + headline).toLowerCase();
  let category = 'news';
  let accentColor = '#667eea';

  if (text.match(/\b(ai|artificial intelligence|machine learning|gpt|llm|neural)\b/)) {
    category = 'ai'; accentColor = '#9b59b6';
  } else if (text.match(/\b(startup|funding|raised|investment|venture|seed|series)\b/)) {
    category = 'startup'; accentColor = '#2ecc71';
  } else if (text.match(/\b(crypto|bitcoin|blockchain|ethereum|web3|defi)\b/)) {
    category = 'crypto'; accentColor = '#f39c12';
  } else if (text.match(/\b(tech|software|app|platform|saas|cloud|api)\b/)) {
    category = 'tech'; accentColor = '#667eea';
  } else if (text.match(/\b(science|research|study|discovery|university)\b/)) {
    category = 'science'; accentColor = '#4ecdc4';
  } else if (text.match(/\b(business|company|market|revenue|profit|ceo)\b/)) {
    category = 'business'; accentColor = '#f5a623';
  }

  const numberMatches = articleText.match(/[\$€£]?\d[\d,.]*([\s]*(million|billion|percent|%|k|m|b))?/gi) || [];
  const hasFacts = numberMatches.length >= 2;

  const scenes = [];
  let remaining = targetDuration;

  scenes.push({ type: 'intro', durationSeconds: 2, category, accentColor });
  remaining -= 2;

  scenes.push({ type: 'headline', durationSeconds: 4, text: headline.substring(0, 80), accentColor });
  remaining -= 4;

  if (hasFacts && remaining > 12) {
    const facts = numberMatches.slice(0, 3).map(n => ({
      value: n.trim(),
      label: 'from the article',
    }));
    scenes.push({ type: 'stats', durationSeconds: 5, facts, title: 'Key Facts', accentColor });
    remaining -= 5;
  }

  scenes.push({ type: 'outro', durationSeconds: 3, message: 'Read the full story on', accentColor });
  remaining -= 3;

  const firstSentence = articleText.split(/[.!?]/)[0]?.trim();
  scenes.splice(hasFacts ? 3 : 2, 0, {
    type: 'content',
    durationSeconds: remaining,
    imageSrc: '',
    keyQuote: firstSentence?.substring(0, 100) || '',
    accentColor,
  });

  const wordTarget = Math.round(targetDuration * 2);
  const voiceoverScript = articleText
    .split(/[.!?]/)
    .filter(s => s.trim().length > 10)
    .join('. ')
    .split(/\s+/)
    .slice(0, wordTarget)
    .join(' ') + '.';

  return {
    scenes,
    voiceoverScript,
    totalDurationSeconds: targetDuration,
    accentColor,
  };
}
