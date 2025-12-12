import type { ColorPalette } from '@/types/doodle';

// Note: Vibrant.js is only imported client-side
let Vibrant: any = null;
if (typeof window !== 'undefined') {
  import('node-vibrant/browser').then(module => {
    Vibrant = module.Vibrant;
  });
}

export class ColorAnalyzer {
  /**
   * Extract color palette from image URL using Vibrant.js
   */
  static async analyzeImage(imageUrl: string): Promise<ColorPalette> {
    try {
      console.log('🎨 Analyzing image colors:', imageUrl);

      const vibrant = new Vibrant(imageUrl);
      const palette = await vibrant.getPalette();

      const colors: ColorPalette = {
        vibrant: palette.Vibrant?.hex,
        darkVibrant: palette.DarkVibrant?.hex,
        lightVibrant: palette.LightVibrant?.hex,
        muted: palette.Muted?.hex,
        darkMuted: palette.DarkMuted?.hex,
        lightMuted: palette.LightMuted?.hex,
      };

      console.log('✅ Color analysis complete:', colors);
      return colors;
    } catch (error) {
      console.error('❌ Color analysis failed:', error);

      // Return default palette
      return {
        vibrant: '#3B82F6',
        darkVibrant: '#1E40AF',
        lightVibrant: '#93C5FD',
        muted: '#6B7280',
        darkMuted: '#374151',
        lightMuted: '#D1D5DB',
      };
    }
  }

  /**
   * Get dominant color (prefer vibrant, fallback to others)
   */
  static getDominant(colors: ColorPalette): string {
    return (
      colors.vibrant ||
      colors.darkVibrant ||
      colors.lightVibrant ||
      colors.muted ||
      '#3B82F6'
    );
  }

  /**
   * Get accent color (complementary to dominant)
   */
  static getAccent(colors: ColorPalette): string {
    return (
      colors.lightVibrant ||
      colors.vibrant ||
      colors.lightMuted ||
      '#93C5FD'
    );
  }

  /**
   * Get background color (muted, dark)
   */
  static getBackground(colors: ColorPalette): string {
    return colors.darkMuted || colors.darkVibrant || '#1E293B';
  }

  /**
   * Convert hex to RGB
   */
  static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  /**
   * Get CSS rgba string
   */
  static hexToRgba(hex: string, alpha: number = 1): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
