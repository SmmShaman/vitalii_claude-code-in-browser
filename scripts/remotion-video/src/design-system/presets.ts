/**
 * Theme Presets — content-aware visual themes.
 *
 * Each preset overrides default theme tokens to create
 * a distinct look matching the content category.
 */
import type { VideoTheme } from "./theme";

export type PresetId = 'default' | 'breaking-news' | 'tech-ai' | 'business' | 'lifestyle' | 'science';

export interface ThemePreset {
  id: PresetId;
  name: string;
  triggerCategories: string[];
  theme: Partial<VideoTheme>;
}

// Shallow color overrides for each preset
const breakingNewsColors = {
  brand: "#FF4444",
  brandLight: "#FF6666",
  brandDark: "#CC0000",
} as const;

const techAiColors = {
  brand: "#667EEA",
  brandLight: "#8B9CF7",
  brandDark: "#764BA2",
} as const;

const businessColors = {
  brand: "#2D5016",
  brandLight: "#C9A961",
  brandDark: "#1A3A0A",
} as const;

const lifestyleColors = {
  brand: "#FFB366",
  brandLight: "#FFCC99",
  brandDark: "#FF99CC",
} as const;

const scienceColors = {
  brand: "#0F5C75",
  brandLight: "#1B9CFC",
  brandDark: "#0A4258",
} as const;

export const presets: Record<PresetId, ThemePreset> = {
  default: {
    id: 'default',
    name: 'Default (vitalii.no)',
    triggerCategories: [],
    theme: {},
  },
  'breaking-news': {
    id: 'breaking-news',
    name: 'Breaking News',
    triggerCategories: ['politics', 'crisis', 'breaking'],
    theme: {
      colors: {
        ...({} as any),
        ...breakingNewsColors,
      },
    },
  },
  'tech-ai': {
    id: 'tech-ai',
    name: 'Tech & AI',
    triggerCategories: ['tech', 'ai', 'startup', 'software'],
    theme: {
      colors: {
        ...({} as any),
        ...techAiColors,
      },
    },
  },
  business: {
    id: 'business',
    name: 'Business & Finance',
    triggerCategories: ['business', 'finance', 'corporate', 'markets'],
    theme: {
      colors: {
        ...({} as any),
        ...businessColors,
      },
    },
  },
  lifestyle: {
    id: 'lifestyle',
    name: 'Lifestyle & Culture',
    triggerCategories: ['lifestyle', 'entertainment', 'food', 'travel', 'culture'],
    theme: {
      colors: {
        ...({} as any),
        ...lifestyleColors,
      },
    },
  },
  science: {
    id: 'science',
    name: 'Science & Research',
    triggerCategories: ['science', 'research', 'medical', 'environment', 'health'],
    theme: {
      colors: {
        ...({} as any),
        ...scienceColors,
      },
    },
  },
};

/** Get preset by ID (fallback to default) */
export function getPreset(id?: string): ThemePreset {
  if (id && id in presets) return presets[id as PresetId];
  return presets.default;
}

/** Auto-detect preset from article category */
export function detectPreset(category?: string): ThemePreset {
  if (!category) return presets.default;
  const cat = category.toLowerCase();
  for (const preset of Object.values(presets)) {
    if (preset.triggerCategories.includes(cat)) return preset;
  }
  return presets.default;
}
