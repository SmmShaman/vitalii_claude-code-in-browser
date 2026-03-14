/**
 * Article Image Scraper
 *
 * Fetches the original article page and extracts all relevant images.
 * Returns real article images (product photos, event photos, infographics)
 * instead of generic stock photos.
 *
 * No external dependencies — uses regex-based HTML parsing.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_IMAGES_PER_ARTICLE = 8;
const MIN_IMAGE_WIDTH = 300;     // skip tiny icons/logos
const MIN_IMAGE_SIZE = 20_000;   // 20 KB minimum
const MAX_IMAGE_SIZE = 10_000_000; // 10 MB maximum
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'Mozilla/5.0 (compatible; DailyNewsBot/1.0)';

// Domains to skip (ad networks, trackers, social widgets)
const BLOCKED_DOMAINS = new Set([
  'facebook.com', 'fbcdn.net', 'doubleclick.net', 'googlesyndication.com',
  'googleadservices.com', 'google-analytics.com', 'twitter.com',
  'platform.twitter.com', 'ads.', 'pixel.', 'tracking.',
  'gravatar.com', 'wp.com/latex', 'shields.io', 'badge.',
]);

// File patterns to skip
const BLOCKED_PATTERNS = [
  /logo/i, /icon/i, /favicon/i, /avatar/i, /badge/i, /button/i,
  /spinner/i, /loading/i, /placeholder/i, /spacer/i, /pixel\./i,
  /1x1/i, /blank\./i, /transparent\./i, /emoji/i, /smiley/i,
  /share/i, /social/i, /widget/i, /banner-ad/i, /advert/i,
];

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, no dependencies)
// ---------------------------------------------------------------------------

/**
 * Extract Open Graph and meta images from HTML head.
 */
function extractMetaImages(html) {
  const images = [];

  // og:image
  const ogMatches = html.matchAll(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/gi);
  for (const m of ogMatches) images.push({ url: m[1], priority: 10, source: 'og:image' });

  // og:image reverse attribute order
  const ogMatches2 = html.matchAll(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/gi);
  for (const m of ogMatches2) images.push({ url: m[1], priority: 10, source: 'og:image' });

  // twitter:image
  const twMatches = html.matchAll(/<meta[^>]*(?:name|property)=["']twitter:image["'][^>]*content=["']([^"']+)["']/gi);
  for (const m of twMatches) images.push({ url: m[1], priority: 9, source: 'twitter:image' });

  // twitter:image reverse
  const twMatches2 = html.matchAll(/<meta[^>]*content=["']([^"']+)["'][^>]*(?:name|property)=["']twitter:image["']/gi);
  for (const m of twMatches2) images.push({ url: m[1], priority: 9, source: 'twitter:image' });

  return images;
}

/**
 * Extract images from article body content.
 * Prioritizes images inside <article>, <main>, or content divs.
 */
function extractBodyImages(html) {
  const images = [];

  // Try to find article/main content region
  let contentHtml = '';
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const contentDivMatch = html.match(/<div[^>]*class=["'][^"']*(?:article|post|entry|story|content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (articleMatch) contentHtml = articleMatch[1];
  else if (mainMatch) contentHtml = mainMatch[1];
  else if (contentDivMatch) contentHtml = contentDivMatch[1];
  else contentHtml = html; // fallback to full page

  // Extract all <img> tags
  const imgMatches = contentHtml.matchAll(/<img[^>]*\bsrc=["']([^"']+)["'][^>]*/gi);
  for (const m of imgMatches) {
    const tag = m[0];
    const src = m[1];

    // Check dimensions if available
    const widthMatch = tag.match(/width=["']?(\d+)/i);
    const heightMatch = tag.match(/height=["']?(\d+)/i);
    const width = widthMatch ? parseInt(widthMatch[1]) : 0;
    const height = heightMatch ? parseInt(heightMatch[1]) : 0;

    // Skip if explicitly small
    if (width > 0 && width < MIN_IMAGE_WIDTH) continue;
    if (height > 0 && height < 100) continue;

    // Extract alt text for relevance scoring
    const altMatch = tag.match(/alt=["']([^"']*?)["']/i);
    const alt = altMatch ? altMatch[1] : '';

    // Priority: larger images and those with alt text rank higher
    let priority = 5;
    if (width >= 600 || (alt && alt.length > 10)) priority = 7;
    if (width >= 1000) priority = 8;

    images.push({ url: src, priority, source: 'img', width, height, alt });
  }

  // Extract <picture><source> tags (modern responsive images)
  const sourceMatches = contentHtml.matchAll(/<source[^>]*\bsrcset=["']([^"'\s,]+)/gi);
  for (const m of sourceMatches) {
    images.push({ url: m[1], priority: 6, source: 'picture' });
  }

  // Extract CSS background images from figure/div tags
  const bgMatches = contentHtml.matchAll(/style=["'][^"']*background(?:-image)?\s*:\s*url\(["']?([^"')]+)["']?\)/gi);
  for (const m of bgMatches) {
    images.push({ url: m[1], priority: 4, source: 'bg-image' });
  }

  return images;
}

/**
 * Extract images from JSON-LD structured data.
 */
function extractJsonLdImages(html) {
  const images = [];
  const scriptMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const m of scriptMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.image) {
          const imgs = Array.isArray(item.image) ? item.image : [item.image];
          for (const img of imgs) {
            const url = typeof img === 'string' ? img : img?.url;
            if (url) images.push({ url, priority: 8, source: 'json-ld' });
          }
        }
        if (item.thumbnailUrl) {
          images.push({ url: item.thumbnailUrl, priority: 7, source: 'json-ld-thumb' });
        }
      }
    } catch { /* ignore invalid JSON-LD */ }
  }

  return images;
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function resolveUrl(imageUrl, baseUrl) {
  try {
    if (imageUrl.startsWith('data:')) return null; // skip data URIs
    if (imageUrl.startsWith('//')) return `https:${imageUrl}`;
    return new URL(imageUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function isBlockedUrl(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const blocked of BLOCKED_DOMAINS) {
      if (hostname.includes(blocked)) return true;
    }
  } catch {
    return true;
  }
  const path = url.toLowerCase();
  return BLOCKED_PATTERNS.some((p) => p.test(path));
}

function getImageExtension(url, contentType) {
  if (contentType?.includes('jpeg') || contentType?.includes('jpg')) return '.jpg';
  if (contentType?.includes('png')) return '.png';
  if (contentType?.includes('webp')) return '.webp';
  if (contentType?.includes('gif')) return '.gif';
  if (contentType?.includes('avif')) return '.avif';

  const ext = url.match(/\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i);
  if (ext) return `.${ext[1].toLowerCase()}`;
  return '.jpg'; // default
}

// ---------------------------------------------------------------------------
// Download with validation
// ---------------------------------------------------------------------------

async function downloadImage(url, destPath) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('image')) return null;

    const contentLength = parseInt(res.headers.get('content-length') || '0');
    if (contentLength > 0 && contentLength < MIN_IMAGE_SIZE) return null;
    if (contentLength > MAX_IMAGE_SIZE) return null;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < MIN_IMAGE_SIZE) return null;
    if (buf.length > MAX_IMAGE_SIZE) return null;

    await writeFile(destPath, buf);
    return { size: buf.length, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Scrape images from an article's source URL.
 *
 * @param {string} articleUrl - The source article URL
 * @param {string} publicDir - Directory to save downloaded images
 * @param {string} prefix - Filename prefix (e.g., "article_0")
 * @param {object} options
 * @param {number} options.maxImages - Max images to return (default 5)
 * @param {string[]} options.existingImages - Already known image URLs to include
 * @returns {Promise<{images: string[], attribution: string[]}>}
 */
export async function scrapeArticleImages(articleUrl, publicDir, prefix, options = {}) {
  const { maxImages = MAX_IMAGES_PER_ARTICLE, existingImages = [] } = options;
  const result = { images: [], attribution: [] };

  if (!articleUrl) return result;

  await mkdir(publicDir, { recursive: true });

  console.log(`[scraper] Fetching: ${articleUrl}`);

  let html;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[scraper] HTTP ${res.status} for ${articleUrl}`);
      return result;
    }
    html = await res.text();
  } catch (e) {
    console.log(`[scraper] Fetch failed: ${e.message}`);
    return result;
  }

  // Collect all candidate images from different sources
  const candidates = [
    ...extractMetaImages(html),
    ...extractJsonLdImages(html),
    ...extractBodyImages(html),
  ];

  // Add existing images from DB (highest priority)
  for (const url of existingImages) {
    if (url) candidates.unshift({ url, priority: 11, source: 'db' });
  }

  // Resolve URLs, deduplicate, filter blocked
  const seen = new Set();
  const resolved = [];
  for (const c of candidates) {
    const url = resolveUrl(c.url, articleUrl);
    if (!url) continue;
    if (seen.has(url)) continue;
    if (isBlockedUrl(url)) continue;
    // Skip SVGs (usually icons/logos)
    if (url.toLowerCase().endsWith('.svg')) continue;
    seen.add(url);
    resolved.push({ ...c, url });
  }

  // Sort by priority (highest first)
  resolved.sort((a, b) => b.priority - a.priority);

  // Download top candidates
  let downloaded = 0;
  for (const candidate of resolved) {
    if (downloaded >= maxImages) break;

    const ext = getImageExtension(candidate.url, '');
    const filename = `${prefix}_scraped_${downloaded}${ext}`;
    const destPath = join(publicDir, filename);

    const dl = await downloadImage(candidate.url, destPath);
    if (dl) {
      result.images.push(filename);
      result.attribution.push(`Source: ${new URL(articleUrl).hostname}`);
      console.log(`[scraper]   ✅ ${filename} (${(dl.size / 1024).toFixed(0)} KB, ${candidate.source})`);
      downloaded++;
    }
  }

  console.log(`[scraper] ${articleUrl}: ${downloaded}/${resolved.length} images downloaded`);
  return result;
}

/**
 * Scrape images for all segments from their source articles.
 *
 * @param {Array<{sourceLink: string, existingImages?: string[]}>} articles
 * @param {string} publicDir
 * @returns {Promise<Record<number, {images: string[], attribution: string[]}>>}
 */
export async function scrapeAllArticleImages(articles, publicDir) {
  const result = {};

  for (let i = 0; i < articles.length; i++) {
    result[i] = { images: [], attribution: [] };
  }

  // Process sequentially to be polite to source servers
  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    if (!article.sourceLink) {
      console.log(`[scraper] Segment ${i}: no source link, skipping`);
      continue;
    }

    try {
      const scraped = await scrapeArticleImages(
        article.sourceLink,
        publicDir,
        `seg_${i}`,
        { maxImages: 4, existingImages: article.existingImages || [] },
      );
      result[i] = scraped;
    } catch (e) {
      console.log(`[scraper] Segment ${i} failed: ${e.message}`);
    }
  }

  const total = Object.values(result).reduce((n, s) => n + s.images.length, 0);
  console.log(`[scraper] Done: ${total} images across ${articles.length} articles`);

  return result;
}
