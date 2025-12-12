import type { DailyImage } from '@/types/doodle';

const API_BASE_URL = '/.netlify/functions';

// Check if we're in the browser
const isBrowser = typeof window !== 'undefined';

export class DailyImageService {
  private static cache: DailyImage | null = null;
  private static lastFetch: string | null = null;

  /**
   * Fetch today's image (cached for 24 hours)
   */
  static async getTodaysImage(): Promise<DailyImage> {
    const today = new Date().toISOString().split('T')[0];

    // Return cached if same day
    if (this.cache && this.lastFetch === today) {
      console.log('📦 Returning cached daily image');
      return this.cache;
    }

    console.log('🌐 Fetching new daily image from API');
    try {
      const response = await fetch(`${API_BASE_URL}/daily-image`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data: DailyImage = await response.json();

      // Update cache
      this.cache = data;
      this.lastFetch = today;

      // Also store in localStorage for persistence (only in browser)
      if (isBrowser) {
        localStorage.setItem('dailyImage', JSON.stringify(data));
        localStorage.setItem('dailyImageDate', today);
      }

      return data;
    } catch (error) {
      console.error('❌ Failed to fetch daily image:', error);

      // Try to return from localStorage (only in browser)
      if (isBrowser) {
        const cachedData = localStorage.getItem('dailyImage');
        const cachedDate = localStorage.getItem('dailyImageDate');

        if (cachedData && cachedDate === today) {
          console.log('📦 Returning localStorage fallback');
          const data: DailyImage = JSON.parse(cachedData);
          this.cache = data;
          this.lastFetch = today;
          return data;
        }
      }

      // Ultimate fallback - return dummy data
      console.warn('⚠️ Using fallback image');
      return this.getFallbackImage();
    }
  }

  /**
   * Fallback image when API fails
   */
  private static getFallbackImage(): DailyImage {
    return {
      id: 'fallback',
      date: new Date().toISOString().split('T')[0],
      title: 'Starry Night',
      description: 'A beautiful cosmic scene',
      image_url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&q=80',
      source: 'unsplash',
      copyright: 'Unsplash',
      colors: {
        vibrant: '#1E3A8A',
        darkVibrant: '#0F172A',
        lightVibrant: '#60A5FA',
        muted: '#475569',
        darkMuted: '#1E293B',
        lightMuted: '#94A3B8',
      },
      theme: 'space',
      effect: 'stars',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      fetch_duration_ms: 0,
      last_viewed_at: null,
    };
  }

  /**
   * Clear cache (useful for testing)
   */
  static clearCache(): void {
    this.cache = null;
    this.lastFetch = null;
    if (isBrowser) {
      localStorage.removeItem('dailyImage');
      localStorage.removeItem('dailyImageDate');
    }
    console.log('🗑️ Daily image cache cleared');
  }
}
