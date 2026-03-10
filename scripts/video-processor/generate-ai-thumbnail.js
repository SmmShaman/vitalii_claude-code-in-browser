/**
 * generate-ai-thumbnail.js
 *
 * AI-powered YouTube thumbnail generator using Gemini.
 * Uses REAL article images as base + Gemini composition for text overlays.
 * Generates 1280x720 PNG thumbnails with bold text, news aesthetic, vitalii.no branding.
 *
 * Exports:
 *   generateAIThumbnail(articles, clickbaitTitle, dateStr) → single thumbnail path
 *   generateThumbnailVariants(articles, clickbaitTitle, dateStr, count) → array of {style, buffer}
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const MODELS = ['gemini-3-pro-image-preview', 'gemini-2.5-pro-image', 'gemini-2.5-flash-image'];
const TIMEOUT_MS = 60_000;

// ── 4 Overlay Styles (applied on real article images) ──

const VISUAL_STYLES = [
  {
    id: 'dark_overlay',
    name: 'Темне затемнення',
    prompt: 'Darken the entire image to approximately 35-40% of its original brightness. Apply a smooth dark gradient overlay that is darkest on the left side (for text readability) and slightly lighter on the right. Keep the main subject still recognizable.',
  },
  {
    id: 'blur_glass',
    name: 'Blur + Glass',
    prompt: 'Apply a moderate Gaussian blur to the entire image. Then add a semi-transparent frosted glass panel (dark, 70% opacity) covering the left 60% where text will be placed. The right 40% shows the blurred photo more clearly. The glass panel has a subtle border glow in orange (#FF7A00).',
  },
  {
    id: 'zoom_vignette',
    name: 'Zoom + Vignette',
    prompt: 'Crop and zoom into the most visually interesting part of the image to fill the 1280x720 frame. Apply a strong vignette effect — dark corners fading to near-black at edges. Center-right remains brightest. Add slight warm color grading.',
  },
  {
    id: 'split_layout',
    name: 'Split Layout',
    prompt: 'Create a split composition: LEFT half is solid dark navy (#0a1628) to purple (#1a0a3e) gradient (for text). RIGHT half shows the original image, slightly darkened with cinematic color grade. Add a bright orange (#FF7A00) diagonal line (3px with glow) as divider at ~80 degrees.',
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

// ── Image helpers ──

async function downloadImageAsBase64(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) return null;
    const buffer = await resp.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch {
    return null;
  }
}

function getPngDimensions(buffer) {
  if (buffer.length < 24 || buffer[0] !== 137 || buffer[1] !== 80) return null;
  const width = (buffer[16] << 24) | (buffer[17] << 16) | (buffer[18] << 8) | buffer[19];
  const height = (buffer[20] << 24) | (buffer[21] << 16) | (buffer[22] << 8) | buffer[23];
  return { width, height };
}

async function ensureSize(buffer) {
  try {
    const sharp = (await import('sharp')).default;
    const meta = await sharp(buffer).metadata();
    console.log(`📐 Output: ${meta.width}×${meta.height} (${meta.format})`);
    if (meta.width !== 1280 || meta.height !== 720) {
      console.log(`🔧 Resizing to 1280×720...`);
      return await sharp(buffer).resize(1280, 720, { fit: 'cover' }).png().toBuffer();
    }
  } catch (e) {
    // Fallback: try PNG header parsing
    const dims = getPngDimensions(buffer);
    if (dims) {
      console.log(`📐 Output (PNG header): ${dims.width}×${dims.height}`);
    } else {
      console.warn(`⚠️ Cannot determine dimensions: ${e.message}, using original`);
    }
  }
  return buffer;
}

// ── Core Gemini API call ──

async function callGeminiImage(prompt, apiKey, inputImageBase64) {
  const parts = [{ text: prompt }];
  if (inputImageBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/jpeg',
        data: inputImageBase64,
      },
    });
  }

  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '16:9',
        imageSize: '1K',
      },
    },
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
        console.error(`❌ ${model}: ${response.status}`);
        clearTimeout(timeout);
        continue;
      }

      const result = await response.json();
      const candidate = result.candidates?.[0];
      if (candidate?.finishReason === 'IMAGE_OTHER') {
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
      clearTimeout(timeout);
    } catch (error) {
      clearTimeout(timeout);
      if (error.name === 'AbortError') {
        console.error(`⏱️ ${model} timed out`);
      } else {
        console.error(`❌ ${model}: ${error.message}`);
      }
    }
  }
  return null;
}

// ── Prompt Builder ──

function buildThumbnailPrompt(headline, displayDate, articleCount, style, hasImage) {
  const imageInstruction = hasImage
    ? `Take the provided news article image and transform it into a YouTube thumbnail.

IMAGE PROCESSING:
${style.prompt}`
    : `Generate a professional YouTube thumbnail with a dark gradient background (navy #0a1628 to purple #1a0a3e).
${style.prompt}`;

  return `${imageInstruction}

OUTPUT: 16:9 landscape image.

TEXT OVERLAYS — render these EXACTLY as specified:

1. MAIN HEADLINE (dominant element, upper-left area):
"${headline}"
- Font: Impact or Montserrat ExtraBold, 160-220px height
- Color: pure white (#FFFFFF)
- Add thick black outline (3-4px stroke) AND strong drop shadow for readability
- Maximum 2 lines, left-aligned
- This is the MOST important visual element — it must DOMINATE the thumbnail

2. ARTICLE COUNT BADGE (top-right corner):
"${articleCount}" inside an orange (#FF7A00) circle or rounded square
- Number should be large and bold (80-100px)
- White text on solid orange background

3. CHANNEL BRANDING (bottom-left, subtle):
"vitalii.no" — small white text (24-28px), semi-transparent

COMPOSITION RULES:
- Text in LEFT 60% of frame, image detail visible in RIGHT 40%
- Bottom-right corner MUST be empty (YouTube duration badge zone)
- All text within center 84% safe area
- Strong visual hierarchy: headline > badge > branding
- Maximum 3 colors: dark background, orange #FF7A00 accent, white text

TEXT LANGUAGE: Norwegian Bokmal ONLY. No emojis anywhere.
OUTPUT: Image only, no text response.`;
}

// ── Single Thumbnail (backward compat) ──

export async function generateAIThumbnail(articles, clickbaitTitle, dateStr) {
  if (!GOOGLE_API_KEY) {
    console.log('⚠️ GOOGLE_API_KEY not set, skipping AI thumbnail');
    return null;
  }

  const displayDate = formatDateNorwegian(dateStr);

  // Try to use the first article's image
  let imageBase64 = null;
  for (const a of articles) {
    const imgUrl = a.processed_image_url || a.image_url;
    if (imgUrl) {
      imageBase64 = await downloadImageAsBase64(imgUrl);
      if (imageBase64) break;
    }
  }

  const prompt = buildThumbnailPrompt(clickbaitTitle, displayDate, articles.length, VISUAL_STYLES[0], !!imageBase64);
  console.log(`🖼️ Generating thumbnail (${imageBase64 ? 'with article image' : 'text-only'})...`);

  let buffer = await callGeminiImage(prompt, GOOGLE_API_KEY, imageBase64);
  if (!buffer) {
    console.warn('⚠️ All Gemini models failed for thumbnail');
    return null;
  }

  buffer = await ensureSize(buffer);
  const outputPath = join(tmpdir(), `yt_thumb_${dateStr}_${Date.now()}.png`);
  await writeFile(outputPath, buffer);
  console.log(`✅ AI thumbnail saved: ${outputPath} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return outputPath;
}

// ── 4 Variant Generation ──

export async function generateThumbnailVariants(articles, clickbaitTitle, dateStr, count = 4) {
  const apiKey = GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('⚠️ GOOGLE_API_KEY not set');
    return [];
  }

  const displayDate = formatDateNorwegian(dateStr);
  const styles = VISUAL_STYLES.slice(0, count);

  // Collect article images
  const articleImages = [];
  for (const a of articles) {
    const imgUrl = a.processed_image_url || a.image_url;
    if (imgUrl) {
      articleImages.push(imgUrl);
      if (articleImages.length >= count) break;
    }
  }

  // Download images in parallel
  console.log(`📥 Downloading ${articleImages.length} article images...`);
  const imageBase64List = await Promise.all(articleImages.map(downloadImageAsBase64));
  const validImages = imageBase64List.filter(Boolean);
  console.log(`✅ Downloaded ${validImages.length}/${articleImages.length} images`);

  console.log(`🖼️ Generating ${styles.length} variants sequentially...`);
  const variants = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    const img = validImages.length > 0 ? validImages[i % validImages.length] : null;
    console.log(`  🎨 ${i + 1}/${styles.length}: ${style.name} (${img ? 'with image' : 'text-only'})`);

    const prompt = buildThumbnailPrompt(clickbaitTitle, displayDate, articles.length, style, !!img);
    let buffer = await callGeminiImage(prompt, apiKey, img);

    if (buffer) {
      buffer = await ensureSize(buffer);
      console.log(`  ✅ ${style.name}: ${(buffer.length / 1024).toFixed(0)} KB`);
      variants.push({ style: style.id, styleName: style.name, buffer });
    } else {
      console.warn(`  ⚠️ ${style.name} failed, skipping`);
    }
  }

  console.log(`✅ Generated ${variants.length}/${styles.length} variants`);
  return variants;
}

export { VISUAL_STYLES };
