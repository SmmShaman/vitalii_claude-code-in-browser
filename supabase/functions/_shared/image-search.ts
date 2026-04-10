/**
 * Image Search Module (shared)
 *
 * Extracted from daily-video-bot for reuse across video generation pipelines.
 * Provides Serper (Google Images), Pexels (stock), and article scraping.
 */

export const IMAGE_SEARCH_VERSION = "2026-04-10-v1";

// Blocked image domains (flags, icons, stock illustrations)
const BLOCKED_HOSTS = [
  "wikimedia.org", "wikipedia.org", "flagsource", "flagfactory",
  "flagcdn", "countryflags", "worldflags", "flaticon.com",
  "icons8.com", "clipartmax", "pngitem", "cleanpng", "seekpng",
  "kindpng", "vecteezy.com",
];

/**
 * Search Google Images via Serper.dev API
 */
export async function searchSerperImages(
  query: string,
  count = 5,
  serperApiKey?: string,
): Promise<string[]> {
  const apiKey = serperApiKey || Deno.env.get("SERPER_API_KEY");
  if (!apiKey) {
    console.log(`  ⚠️ SERPER_API_KEY not set, skipping image search`);
    return [];
  }
  try {
    console.log(`    📡 Serper query: "${query}" (count=${count})`);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: Math.min(count * 2, 20), tbs: "qdr:m" }),
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.log(`  ⚠️ Serper API ${res.status}: ${await res.text().catch(() => "")}`);
      return [];
    }
    const data = await res.json();
    const results = (data.images || [])
      .map((img: any) => img.imageUrl)
      .filter((url: string) => {
        if (!url || !url.startsWith("http")) return false;
        const urlLower = url.toLowerCase();
        if (urlLower.includes(".svg")) return false;
        if (urlLower.includes("icon") || urlLower.includes("favicon")) return false;
        if (urlLower.includes("flag_of_") || urlLower.includes("flag-of-") || urlLower.includes("/flags/")) return false;
        if (BLOCKED_HOSTS.some(h => urlLower.includes(h))) return false;
        return true;
      })
      .slice(0, count);
    console.log(`    📡 Serper found: ${results.length} images (filtered)`);
    return results;
  } catch (e: any) {
    console.log(`  ⚠️ Serper error: ${e.message}`);
    return [];
  }
}

/**
 * Search Pexels for stock photos (landscape orientation)
 */
export async function searchPexelsImages(
  query: string,
  count = 5,
  pexelsKey?: string,
): Promise<string[]> {
  const apiKey = pexelsKey || Deno.env.get("PEXELS_API_KEY");
  if (!apiKey) return [];
  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count * 2}&orientation=landscape&size=large`;
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Authorization: apiKey },
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || [])
      .filter((p: any) => p.width > p.height)
      .slice(0, count)
      .map((p: any) => p.src?.large2x || p.src?.large || p.src?.original)
      .filter(Boolean);
  } catch { return []; }
}

/**
 * Scrape source page for OG/Twitter/img images
 */
export async function scrapeSourceImages(sourceLink: string): Promise<string[]> {
  if (!sourceLink) return [];
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000);
    const res = await fetch(sourceLink, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return [];
    const html = await res.text();
    const found: string[] = [];
    // og:image + twitter:image
    for (const m of (html.match(/(?:property|name)="(?:og:image|twitter:image)"\s+content="([^"]+)"/gi) || [])) {
      const urlMatch = m.match(/content="([^"]+)"/);
      if (urlMatch?.[1] && !found.includes(urlMatch[1])) found.push(urlMatch[1]);
    }
    // <img> tags with jpg/png/webp
    for (const m of (html.match(/<img[^>]+src="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp))[^"]*"/gi) || []).slice(0, 15)) {
      const srcMatch = m.match(/src="([^"]+)"/);
      if (srcMatch?.[1] && !found.includes(srcMatch[1])) found.push(srcMatch[1]);
    }
    return found;
  } catch { return []; }
}

/**
 * Entity info extracted by LLM for targeted image search
 */
export interface ArticleEntities {
  people: string[];
  companies: string[];
  products: string[];
  locations: string[];
  imageQueries: string[];
}

/**
 * Collect images from multiple sources with priority ordering
 *
 * Priority: DB images → source page → Serper (entity-based) → Pexels
 */
export async function collectImages(opts: {
  dbImages?: string[];
  processedImageUrl?: string;
  imageUrl?: string;
  sourceLink?: string;
  title: string;
  tags?: string[];
  entities?: ArticleEntities;
  targetCount?: number;
}): Promise<{ images: string[]; sources: string }> {
  const {
    dbImages = [],
    processedImageUrl,
    imageUrl,
    sourceLink,
    title,
    tags = [],
    entities,
    targetCount = 8,
  } = opts;
  const images: string[] = [];
  const srcInfo: string[] = [];

  // 1. DB images
  for (const img of dbImages) {
    if (img && typeof img === "string" && img.startsWith("http")) images.push(img);
  }
  if (processedImageUrl) images.push(processedImageUrl);
  if (imageUrl && !images.includes(imageUrl)) images.push(imageUrl);
  if (images.length > 0) srcInfo.push(`DB:${images.length}`);

  // 2. Scrape source page
  if (sourceLink) {
    const scraped = await scrapeSourceImages(sourceLink);
    for (const img of scraped) {
      if (!images.includes(img)) images.push(img);
    }
    if (scraped.length > 0) srcInfo.push(`Src:${scraped.length}`);
  }

  // 3. Google Image Search
  if (title) {
    let serperTotal = 0;

    if (entities && entities.imageQueries.length > 0) {
      for (let qi = 0; qi < Math.min(entities.imageQueries.length, 3); qi++) {
        const cnt = qi === 0 ? 5 : 3;
        const sImgs = await searchSerperImages(entities.imageQueries[qi], cnt);
        for (const img of sImgs) {
          if (!images.includes(img)) images.push(img);
        }
        serperTotal += sImgs.length;
      }

      // Person portrait search
      if (entities.people.length > 0 && images.length < targetCount) {
        const personQuery = `${entities.people[0]} ${entities.companies[0] || ""}`.trim();
        const personImgs = await searchSerperImages(personQuery, 3);
        for (const img of personImgs) {
          if (!images.includes(img)) images.push(img);
        }
        serperTotal += personImgs.length;
      }
    } else {
      // Fallback: title-based
      const sImgs = await searchSerperImages(title, 5);
      for (const img of sImgs) {
        if (!images.includes(img)) images.push(img);
      }
      serperTotal += sImgs.length;

      // Broader keyword search
      if (images.length < targetCount && tags.length > 0) {
        const tagStr = tags.slice(0, 3).join(" ");
        const shortTitle = title.split(/[:.!?\-–—]/).slice(0, 2).join(" ").trim().substring(0, 40);
        const sImgs2 = await searchSerperImages(`${shortTitle} ${tagStr}`, 4);
        for (const img of sImgs2) {
          if (!images.includes(img)) images.push(img);
        }
        serperTotal += sImgs2.length;
      }
    }

    if (serperTotal > 0) srcInfo.push(`Serper:${serperTotal}`);
  }

  // 4. Pexels stock fallback
  if (images.length < targetCount && title) {
    const pexelsImgs = await searchPexelsImages(title, targetCount - images.length);
    for (const img of pexelsImgs) {
      if (!images.includes(img)) images.push(img);
    }
    if (pexelsImgs.length > 0) srcInfo.push(`Pexels:${pexelsImgs.length}`);
  }

  return { images, sources: srcInfo.join(" ") };
}
