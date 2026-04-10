/**
 * Music Search Module
 *
 * Searches for background music via Pixabay Audio API with local file fallback.
 * Used by custom-video-bot for mood-matched BGM selection.
 */

export const MUSIC_SEARCH_VERSION = "2026-04-10-v1";

export interface MusicTrack {
  url: string;
  title: string;
  duration: number; // seconds
  source: 'pixabay' | 'local';
  mood: string;
}

// Mood → Pixabay search keyword mapping
const MOOD_KEYWORDS: Record<string, string[]> = {
  energetic: ['upbeat', 'energetic', 'dynamic'],
  corporate: ['corporate', 'business', 'professional'],
  cinematic: ['cinematic', 'epic', 'dramatic'],
  ambient: ['ambient', 'calm', 'relaxing'],
  electronic: ['electronic', 'technology', 'digital'],
  inspiring: ['inspiring', 'motivational', 'uplifting'],
  serious: ['serious', 'dark', 'tense'],
  lighthearted: ['happy', 'fun', 'playful'],
};

// Local fallback tracks (must exist in scripts/remotion-video/public/bgm/)
const LOCAL_TRACKS: Record<string, string> = {
  energetic: 'upbeat.mp3',
  corporate: 'corporate.mp3',
  cinematic: 'cinematic.mp3',
  ambient: 'ambient.mp3',
  electronic: 'electronic.mp3',
  inspiring: 'cinematic.mp3',     // fallback to cinematic
  serious: 'cinematic.mp3',       // fallback to cinematic
  lighthearted: 'upbeat.mp3',     // fallback to upbeat
};

/**
 * Map video content mood to a music mood keyword
 */
export function mapContentToMood(category: string, style: string): string {
  const moodMap: Record<string, string> = {
    // By category
    ai_automation: 'electronic',
    media_production: 'cinematic',
    bot_scraping: 'electronic',
    frontend_ux: 'corporate',
    devops_infra: 'ambient',
    // By style
    showcase: 'corporate',
    case_study: 'inspiring',
    overview: 'corporate',
    explainer: 'ambient',
  };

  return moodMap[style] || moodMap[category] || 'corporate';
}

/**
 * Search Pixabay Audio API for mood-matching music
 *
 * @param mood - Music mood (energetic, corporate, cinematic, ambient, electronic, etc.)
 * @param minDuration - Minimum track duration in seconds (default 60)
 * @param maxDuration - Maximum track duration in seconds (default 300)
 * @returns Array of matching tracks
 */
export async function searchPixabayMusic(
  mood: string,
  minDuration = 60,
  maxDuration = 300,
): Promise<MusicTrack[]> {
  const apiKey = Deno.env.get('PIXABAY_API_KEY');

  if (!apiKey) {
    console.warn('⚠️ PIXABAY_API_KEY not configured — using local fallback');
    return [];
  }

  const keywords = MOOD_KEYWORDS[mood] || [mood];
  const query = keywords[0]; // primary keyword

  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      per_page: '10',
      min_duration: String(minDuration),
      max_duration: String(maxDuration),
      order: 'popular',
    });

    const resp = await fetch(`https://pixabay.com/api/music/?${params}`, {
      headers: { 'User-Agent': 'VitaliiPortfolio/1.0' },
    });

    if (!resp.ok) {
      console.error(`❌ Pixabay Music API error: ${resp.status} ${resp.statusText}`);
      return [];
    }

    const data = await resp.json();
    const hits = data.hits || [];

    console.log(`🎵 Pixabay Music: found ${hits.length} tracks for "${query}"`);

    return hits
      .filter((h: any) => h.audio && h.duration >= minDuration)
      .map((h: any) => ({
        url: h.audio,
        title: h.title || h.tags || query,
        duration: h.duration,
        source: 'pixabay' as const,
        mood,
      }));
  } catch (err: any) {
    console.error(`❌ Pixabay Music search failed: ${err.message}`);
    return [];
  }
}

/**
 * Get local fallback music track path
 */
export function getLocalTrack(mood: string): MusicTrack {
  const filename = LOCAL_TRACKS[mood] || LOCAL_TRACKS.corporate;
  return {
    url: '',
    title: `Local: ${filename}`,
    duration: 120,
    source: 'local',
    mood,
  };
}

/**
 * Get local track filename for Remotion (relative to public/ dir)
 */
export function getLocalTrackFilename(mood: string): string {
  return `bgm/${LOCAL_TRACKS[mood] || LOCAL_TRACKS.corporate}`;
}

/**
 * Search for background music with Pixabay API and local fallback
 * Returns the best matching track
 */
export async function findBestMusic(
  mood: string,
  targetDuration = 120,
): Promise<{ track: MusicTrack; localFile: string }> {
  // Try Pixabay first
  const tracks = await searchPixabayMusic(mood, 30, Math.max(targetDuration * 2, 300));

  if (tracks.length > 0) {
    // Pick the track closest to target duration
    const sorted = [...tracks].sort(
      (a, b) => Math.abs(a.duration - targetDuration) - Math.abs(b.duration - targetDuration),
    );
    const best = sorted[0];
    console.log(`🎵 Selected: "${best.title}" (${best.duration}s) from Pixabay`);
    return { track: best, localFile: '' };
  }

  // Fallback to local
  const localTrack = getLocalTrack(mood);
  const localFile = getLocalTrackFilename(mood);
  console.log(`🎵 Using local fallback: ${localFile}`);
  return { track: localTrack, localFile };
}
