/**
 * generate-ai-thumbnail.js
 *
 * AI-powered YouTube thumbnail generator using Gemini 2.5 Flash (nanobanana style).
 * Generates a 1280x720 PNG with bold text, news aesthetic, and vitalii.no branding.
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const MODELS = ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'];
const TIMEOUT_MS = 60_000;

function formatDateNorwegian(dateStr) {
  const months = [
    'januar', 'februar', 'mars', 'april', 'mai', 'juni',
    'juli', 'august', 'september', 'oktober', 'november', 'desember',
  ];
  const d = new Date(dateStr);
  return `${d.getUTCDate()}. ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Generate an AI thumbnail for a daily news video.
 *
 * @param {Array} articles - News articles
 * @param {string} clickbaitTitle - The AI-generated clickbait title
 * @param {string} dateStr - Target date (YYYY-MM-DD)
 * @returns {Promise<string|null>} Path to generated thumbnail PNG, or null on failure
 */
export async function generateAIThumbnail(articles, clickbaitTitle, dateStr) {
  if (!GOOGLE_API_KEY) {
    console.log('⚠️ GOOGLE_API_KEY not set, skipping AI thumbnail');
    return null;
  }

  const displayDate = formatDateNorwegian(dateStr);
  const topHeadlines = articles.slice(0, 3).map(a =>
    a.title_no || a.title_en || a.original_title || ''
  );

  const prompt = buildThumbnailPrompt(clickbaitTitle, topHeadlines, displayDate, articles.length);

  console.log(`🖼️ Generating AI thumbnail via Gemini...`);

  const requestBody = {
    contents: [{
      parts: [{ text: prompt }],
    }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  for (const model of MODELS) {
    console.log(`🔄 Trying model: ${model}`);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_API_KEY,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${model} error: ${response.status} - ${errorText.substring(0, 200)}`);
        clearTimeout(timeout);
        continue; // try next model
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
            const buffer = Buffer.from(imageData.data, 'base64');
            const outputPath = join(tmpdir(), `yt_thumb_${dateStr}_${Date.now()}.png`);
            await writeFile(outputPath, buffer);
            console.log(`✅ AI thumbnail saved via ${model}: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
            clearTimeout(timeout);
            return outputPath;
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

  console.warn('⚠️ All Gemini models failed for thumbnail');
  return null;
}

function buildThumbnailPrompt(title, topHeadlines, displayDate, articleCount) {
  return `Generate a professional YouTube thumbnail image at exactly 1280x720 pixels (16:9 landscape).

MAIN TITLE TO DISPLAY ON THE IMAGE (large, bold, must be fully readable):
"${title}"

This is a thumbnail for a Norwegian daily tech news show from vitalii.no.

LAYOUT REQUIREMENTS:
- The title text must be PROMINENTLY displayed — large enough to read on a phone screen
- Maximum 2-3 lines of title text, centered or left-aligned
- Use bold sans-serif font, white or bright text with dark outline/shadow for contrast
- Dark gradient background (deep navy #0a1628 to dark purple #1a0a3e)
- Bright orange accent elements matching brand color #FF7A00
- News-style visual: slight glow effects, geometric accent shapes, professional look

VISUAL ELEMENTS:
- Small "NYHETER" or "${articleCount} SAKER" badge in orange (#FF7A00) at top-left corner
- Abstract tech/news icons or patterns in background (subtle, not distracting)
- Date "${displayDate}" in small text at bottom-left
- "vitalii.no" watermark at bottom-right in white

TOP 3 HEADLINES (for visual context, these can appear as small text or be represented abstractly):
1. ${topHeadlines[0] || ''}
2. ${topHeadlines[1] || ''}
3. ${topHeadlines[2] || ''}

STYLE:
- Modern, professional news channel aesthetic
- High contrast for small screen readability
- Vibrant but not cluttered — clean composition
- Similar to premium YouTube news channels

TEXT LANGUAGE: Norwegian Bokmaal ONLY.
CRITICAL: Make the title text LARGE, BOLD, and READABLE even at thumbnail size (120x68px).`;
}
