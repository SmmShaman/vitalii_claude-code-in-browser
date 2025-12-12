export interface DailyImage {
  id: string;
  date: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url: string | null;
  source: 'bing' | 'nasa' | 'unsplash';
  copyright: string | null;
  colors: ColorPalette;
  theme: string | null;
  effect: EffectType | null;
  created_at: string;
  updated_at: string;
  fetch_duration_ms: number | null;
  last_viewed_at: string | null;
}

export interface ColorPalette {
  vibrant?: string;
  darkVibrant?: string;
  lightVibrant?: string;
  muted?: string;
  darkMuted?: string;
  lightMuted?: string;
}

export type EffectType = 'snow' | 'rain' | 'stars' | 'sparkles' | 'particles' | 'none';

export type ThemeType = 'winter' | 'space' | 'nature' | 'fire' | 'rain' | 'abstract';

export interface ParticleConfig {
  count: number;
  color: string;
  size: { min: number; max: number };
  speed: { min: number; max: number };
  opacity: { min: number; max: number };
}
