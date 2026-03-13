/**
 * Pexels API Helper — Stock Images & B-Roll Videos
 *
 * Searches and downloads landscape images and short b-roll video clips
 * from Pexels for each segment of the daily news video compilation.
 *
 * Expects PEXELS_API_KEY environment variable.
 * Graceful fallback: if anything fails the segment gets empty arrays
 * and the video pipeline falls back to the article's own image.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const PEXELS_BASE = 'https://api.pexels.com';

// ---------------------------------------------------------------------------
// Concurrency limiter — at most `limit` promises running at once
// ---------------------------------------------------------------------------

function makeLimiter(limit) {
  let running = 0;
  const queue = [];

  function next() {
    if (queue.length === 0 || running >= limit) return;
    running++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      running--;
      next();
    });
  }

  return function run(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

function getApiKey() {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('Missing PEXELS_API_KEY environment variable');
  return key;
}

async function pexelsFetch(path, params = {}) {
  const url = new URL(path, PEXELS_BASE);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: getApiKey() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Pexels API ${res.status}: ${body}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Search functions
// ---------------------------------------------------------------------------

/**
 * Search Pexels for landscape photos.
 *
 * @param {string} query  - Search terms
 * @param {number} count  - Number of results (default 3)
 * @returns {Promise<Array<{id:number, url:string, downloadUrl:string, width:number, height:number, photographer:string, photographerUrl:string}>>}
 */
export async function searchPexelsImages(query, count = 3) {
  const data = await pexelsFetch('/v1/search', {
    query,
    per_page: Math.min(count * 2, 30), // fetch extra so we can filter
    orientation: 'landscape',
    size: 'large',
  });

  const photos = (data.photos || [])
    .filter((p) => p.width > p.height) // enforce landscape
    .slice(0, count);

  return photos.map((p) => ({
    id: p.id,
    url: p.url,
    downloadUrl: p.src.large2x || p.src.large || p.src.original,
    width: p.width,
    height: p.height,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
  }));
}

/**
 * Search Pexels for short landscape b-roll videos.
 *
 * @param {string} query  - Search terms
 * @param {number} count  - Number of results (default 1)
 * @returns {Promise<Array<{id:number, url:string, downloadUrl:string, width:number, height:number, duration:number, fileSize:number, photographer:string}>>}
 */
export async function searchPexelsVideos(query, count = 1) {
  const data = await pexelsFetch('/videos/search', {
    query,
    per_page: Math.min(count * 4, 30), // extra headroom for filtering
    orientation: 'landscape',
    size: 'medium',
  });

  const MAX_DURATION = 30;
  const MIN_DURATION = 5;
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

  const results = [];

  for (const v of data.video_files ? [] : []) {
    // handled below
  }

  for (const video of data.videos || []) {
    if (video.duration < MIN_DURATION || video.duration > MAX_DURATION) continue;
    if (video.width < video.height) continue; // skip portrait

    // Pick the best video file: prefer HD, landscape, under size limit
    const candidates = (video.video_files || [])
      .filter((f) => f.width >= f.height) // landscape file
      .filter((f) => !f.file_size || f.file_size <= MAX_FILE_SIZE)
      .sort((a, b) => {
        // Prefer HD (720p-1080p) over larger or smaller
        const aScore = a.height >= 720 && a.height <= 1080 ? 1 : 0;
        const bScore = b.height >= 720 && b.height <= 1080 ? 1 : 0;
        if (bScore !== aScore) return bScore - aScore;
        // Then prefer larger resolution
        return (b.width * b.height) - (a.width * a.height);
      });

    const best = candidates[0];
    if (!best) continue;

    results.push({
      id: video.id,
      url: video.url,
      downloadUrl: best.link,
      width: best.width,
      height: best.height,
      duration: video.duration,
      fileSize: best.file_size || 0,
      photographer: video.user?.name || 'Unknown',
    });

    if (results.length >= count) break;
  }

  return results;
}

// ---------------------------------------------------------------------------
// File download helper
// ---------------------------------------------------------------------------

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(destPath, buf);
  return buf.length;
}

// ---------------------------------------------------------------------------
// Main pipeline function
// ---------------------------------------------------------------------------

/**
 * Download Pexels stock images and b-roll videos for each segment.
 *
 * @param {Array<{headline:string, category:string, keyQuote?:string}>} segments
 * @param {string} publicDir - Absolute path to download directory
 * @returns {Promise<Record<number, {images:string[], videos:string[], attribution:string[]}>>}
 */
export async function downloadPexelsMedia(segments, publicDir) {
  const result = {};

  // Initialise empty result for every segment so callers always get a value
  for (let i = 0; i < segments.length; i++) {
    result[i] = { images: [], videos: [], attribution: [] };
  }

  // Bail out early if no API key — silent fallback
  if (!process.env.PEXELS_API_KEY) {
    console.log('[pexels] PEXELS_API_KEY not set — skipping stock media');
    return result;
  }

  // Ensure output directory exists
  await mkdir(publicDir, { recursive: true });

  const limiter = makeLimiter(2);
  const INTER_SEGMENT_DELAY_MS = 400;

  for (let segIndex = 0; segIndex < segments.length; segIndex++) {
    const seg = segments[segIndex];
    const searchQuery = buildSearchQuery(seg);
    console.log(`[pexels] Segment ${segIndex}: searching "${searchQuery}"`);

    try {
      // Run image + video searches concurrently (still throttled by limiter)
      const [images, videos] = await Promise.all([
        limiter(() => searchPexelsImages(searchQuery, 3)),
        limiter(() => searchPexelsVideos(searchQuery, 1)),
      ]);

      console.log(`[pexels] Segment ${segIndex}: found ${images.length} images, ${videos.length} videos`);

      // Download images
      for (const img of images) {
        try {
          const filename = `pexels_img_${segIndex}_${img.id}.jpg`;
          const destPath = join(publicDir, filename);
          const bytes = await limiter(() => downloadFile(img.downloadUrl, destPath));
          result[segIndex].images.push(filename);
          result[segIndex].attribution.push(`Photo by ${img.photographer} on Pexels`);
          console.log(`[pexels]   Downloaded ${filename} (${(bytes / 1024).toFixed(0)} KB)`);
        } catch (err) {
          console.log(`[pexels]   Image download failed (id=${img.id}): ${err.message}`);
        }
      }

      // Download videos
      for (const vid of videos) {
        try {
          const filename = `pexels_vid_${segIndex}_${vid.id}.mp4`;
          const destPath = join(publicDir, filename);
          const bytes = await limiter(() => downloadFile(vid.downloadUrl, destPath));
          result[segIndex].videos.push(filename);
          result[segIndex].attribution.push(`Video by ${vid.photographer} on Pexels`);
          console.log(`[pexels]   Downloaded ${filename} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
        } catch (err) {
          console.log(`[pexels]   Video download failed (id=${vid.id}): ${err.message}`);
        }
      }
    } catch (err) {
      console.log(`[pexels] Segment ${segIndex} search failed: ${err.message}`);
      // result[segIndex] already has empty arrays — graceful fallback
    }

    // Small delay between segments to stay well within rate limits
    if (segIndex < segments.length - 1) {
      await sleep(INTER_SEGMENT_DELAY_MS);
    }
  }

  const totalImages = Object.values(result).reduce((n, s) => n + s.images.length, 0);
  const totalVideos = Object.values(result).reduce((n, s) => n + s.videos.length, 0);
  console.log(`[pexels] Done: ${totalImages} images + ${totalVideos} videos across ${segments.length} segments`);

  return result;
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------

/**
 * Turn a segment's headline + category into a Pexels search query.
 * Extracts company names, products, and key concepts for relevant results.
 * Expects English headline (Pexels is English-language API).
 */
function buildSearchQuery(segment) {
  const { headline = '', category = '' } = segment;

  // Common English stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'for', 'and', 'nor', 'but',
    'or', 'yet', 'so', 'in', 'on', 'at', 'to', 'from', 'by', 'with',
    'about', 'into', 'through', 'after', 'before', 'above', 'below',
    'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
    'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
    'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'new',
    'its', 'his', 'her', 'their', 'our', 'your', 'this', 'that', 'these',
    'says', 'said', 'also', 'now', 'get', 'gets', 'got', 'make', 'makes',
  ]);

  // Extract meaningful words: capitalize = likely proper noun (company/product)
  const words = headline
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w.toLowerCase()));

  // Prioritize capitalized words (company names, products) — up to 4
  const properNouns = words.filter((w) => /^[A-Z]/.test(w)).slice(0, 4);
  const otherWords = words.filter((w) => !/^[A-Z]/.test(w)).slice(0, 3);

  // Build query: proper nouns first, then descriptive words
  const queryParts = [...properNouns, ...otherWords].slice(0, 6);

  // Add category context if query is too short
  const categoryMap = {
    tech: 'technology',
    ai: 'artificial intelligence',
    business: 'business office',
    startup: 'startup technology',
    science: 'science laboratory',
    crypto: 'cryptocurrency digital',
    health: 'health medical',
  };

  if (queryParts.length < 3) {
    const extra = categoryMap[category.toLowerCase()] || '';
    if (extra) queryParts.push(extra);
  }

  return queryParts.join(' ') || 'technology business';
}
