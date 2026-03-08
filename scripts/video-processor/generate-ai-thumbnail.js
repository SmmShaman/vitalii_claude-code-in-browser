/**
 * generate-ai-thumbnail.js
 *
 * AI-powered YouTube thumbnail generator using Gemini (nanobanana style).
 * Generates 1280x720 PNG thumbnails with bold text, news aesthetic, and vitalii.no branding.
 *
 * Exports:
 *   generateAIThumbnail(articles, clickbaitTitle, dateStr) → single thumbnail path
 *   generateThumbnailVariants(articles, clickbaitTitle, dateStr, count) → array of {style, buffer}
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const MODELS = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
const TIMEOUT_MS = 60_000;

// ── 4 Visual Styles for Variant Generation ──

const VISUAL_STYLES = [
  {
    id: 'minimal',
    name: 'Мінімалістичний',
    desc: 'Single tech object (glowing laptop or smartphone) on the right third of the frame. Ultra-clean composition with vast negative space. Title text dominates the left 60%. Background: smooth dark gradient. One soft orange accent glow behind the object.',
  },
  {
    id: 'dashboard',
    name: 'Дашборд / Дані',
    desc: 'Data visualization style: a holographic floating bar chart or line graph on the right side with glowing data points in orange. HUD-style thin grid overlay at 5% opacity. Title text on the left with a subtle frosted glass panel behind it. Futuristic analytics aesthetic.',
  },
  {
    id: 'geometric',
    name: 'Геометричний',
    desc: 'Abstract geometric composition: interconnected hexagons and circuit trace lines forming a network pattern across the background at 15% opacity. Bold diagonal orange accent line cutting across the lower-right area. Title text in the upper-left with strong perspective depth effect.',
  },
  {
    id: 'blocks',
    name: 'Кольорові блоки',
    desc: 'Bold angular color blocks: a large diagonal division — dark navy on the left (with title text) and deep purple on the right (with a collage of small abstract news icons). The diagonal cut line is bright orange (#FF7A00) with a glow effect. High contrast, editorial magazine layout style.',
  },
];

function formatDateNorwegian(dateStr) {
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember',
  ];
  const d = new Date(dateStr);
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// ── Core Gemini API call ──

async function callGeminiImage(prompt, apiKey) {
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
  };

  for (const model of MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${model} error: ${response.status} - ${errorText.substring(0, 200)}`);
        clearTimeout(timeout);
        continue;
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];

      if (candidate?.finishReason === 'IMAGE_OTHER') {
        console.warn(`⚠️ ${model} content policy blocked`);
        clearTimeout(timeout);
        continue;
      }

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          const imageData = part.inline_data || part.inlineData;
          if (imageData?.data) {
            clearTimeout(timeout);
            return Buffer.from(imageData.data, 'base64');
          }
        }
      }

      console.warn(`⚠️ ${model}: no image in response`);
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`⏱️ ${model} timed out after ${TIMEOUT_MS / 1000}s`);
      } else {
        console.error(`❌ ${model} error:`, error.message);
      }
    }
  }

  return null;
}

// ── Single Thumbnail (backward compat) ──

/**
 * Generate a single AI thumbnail (picks best of first successful variant).
 */
export async function generateAIThumbnail(articles, clickbaitTitle, dateStr) {
  if (!GOOGLE_API_KEY) {
    console.log('⚠️ GOOGLE_API_KEY not set, skipping AI thumbnail');
    return null;
  }

  const displayDate = formatDateNorwegian(dateStr);
  const prompt = buildThumbnailPrompt(clickbaitTitle, displayDate, articles.length, VISUAL_STYLES[0]);

  console.log(`🖼️ Generating AI thumbnail via Gemini...`);
  const buffer = await callGeminiImage(prompt, GOOGLE_API_KEY);

  if (buffer) {
    const outputPath = join(tmpdir(), `yt_thumb_${dateStr}_${Date.now()}.png`);
    await writeFile(outputPath, buffer);
    console.log(`✅ AI thumbnail saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
    return outputPath;
  }

  console.warn('⚠️ All Gemini models failed for thumbnail');
  return null;
}

// ── 4 Variant Generation ──

/**
 * Generate multiple thumbnail variants with different visual styles.
 *
 * @param {Array} articles - News articles
 * @param {string} clickbaitTitle - AI-generated clickbait title
 * @param {string} dateStr - Target date (YYYY-MM-DD)
 * @param {number} count - Number of variants (default 4)
 * @returns {Promise<Array<{style: string, styleName: string, buffer: Buffer}>>}
 */
export async function generateThumbnailVariants(articles, clickbaitTitle, dateStr, count = 4) {
  const apiKey = GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️ GOOGLE_API_KEY not set');
    return [];
  }

  const displayDate = formatDateNorwegian(dateStr);
  const styles = VISUAL_STYLES.slice(0, count);

  console.log(`🖼️ Generating ${styles.length} thumbnail variants in parallel...`);

  const results = await Promise.allSettled(
    styles.map(async (style) => {
      console.log(`  🎨 Style: ${style.name}`);
      const prompt = buildThumbnailPrompt(clickbaitTitle, displayDate, articles.length, style);
      const buffer = await callGeminiImage(prompt, apiKey);
      if (!buffer) throw new Error(`Failed for style ${style.id}`);
      console.log(`  ✅ ${style.name}: ${(buffer.length / 1024).toFixed(0)} KB`);
      return { style: style.id, styleName: style.name, buffer };
    }),
  );

  const variants = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  console.log(`✅ Generated ${variants.length}/${styles.length} variants`);
  return variants;
}

/**
 * Generate variants using a custom API key (for Edge Functions).
 */
export async function generateThumbnailVariantsWithKey(apiKey, articles, clickbaitTitle, dateStr, count = 4) {
  const displayDate = formatDateNorwegian(dateStr);
  const styles = VISUAL_STYLES.slice(0, count);

  const results = await Promise.allSettled(
    styles.map(async (style) => {
      const prompt = buildThumbnailPrompt(clickbaitTitle, displayDate, articles.length, style);
      const buffer = await callGeminiImage(prompt, apiKey);
      if (!buffer) throw new Error(`Failed for style ${style.id}`);
      return { style: style.id, styleName: style.name, buffer };
    }),
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
}

// ── Prompt Builder ──

function buildThumbnailPrompt(title, displayDate, articleCount, style) {
  const shortTitle = title.split(/\s+/).slice(0, 5).join(' ');

  return `Generate a professional YouTube thumbnail image at exactly 1280x720 pixels (16:9 landscape).

CONTEXT: Thumbnail for a Norwegian daily tech news show "vitalii.no" — a faceless automated channel. No human faces.

═══ VISUAL STYLE: ${style.id.toUpperCase()} ═══

${style.desc}

═══ COMPOSITION (2-3 elements max) ═══

- Title text fills 40-60% of frame, positioned in safe zone (not in corners)
- Clean composition with 30-40% negative space
- Rule of thirds layout

═══ TEXT ON IMAGE (readable at 120x68px mobile) ═══

PRIMARY TEXT (150-200px font height):
"${shortTitle}"
- Bold sans-serif (Impact / Montserrat ExtraBold)
- Bright white with 2-3px black outline/stroke and dark drop shadow
- Maximum 2 lines, left-aligned, upper-left safe zone

BADGE (top-left corner):
"${articleCount} SAKER" — bold white text on orange (#FF7A00) rounded pill

BRANDING (bottom-left, small):
"vitalii.no" white + "${displayDate}" next to it

═══ SAFE ZONES ═══

- NEVER place text in bottom-right (YouTube duration badge)
- All text within center 84% (102px margin sides, 72px top/bottom)
- Avoid bottom 150px for critical elements

═══ COLORS (max 3) ═══

- Background: Dark gradient navy (#0a1628) to purple (#1a0a3e)
- Accent: Orange #FF7A00
- Text: White #FFFFFF with black outline
- Avoid YouTube red (#FF0000), pure white backgrounds

═══ QUALITY ═══

- Sharp focus, studio lighting, cinematic
- Must work on light AND dark YouTube backgrounds
- 1-SECOND TEST: viewer on phone must instantly get topic + energy

TEXT LANGUAGE: Norwegian Bokmaal ONLY.
IMAGE ONLY — no text response.`;
}

export { VISUAL_STYLES };
