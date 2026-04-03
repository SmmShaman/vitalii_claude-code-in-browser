/**
 * Color Palette System
 * Defines 4 palettes and runtime switching via CSS custom properties.
 * CSS vars use RGB triplets (e.g., "26 26 28") for Tailwind opacity support.
 */

const THEME_STORAGE_KEY = 'vitalii_active_palette'
const MODE_STORAGE_KEY = 'vitalii_color_mode'

export type ColorMode = 'dark' | 'light'

export interface ColorPalette {
  id: string
  name: string
  description: string
  colors: Record<string, string> // CSS var name → RGB triplet (dark mode)
  light: Record<string, string>  // CSS var name → RGB triplet (light mode)
  particleHex: number // THREE.js hex color (dark)
  particleHexLight: number // THREE.js hex color (light)
  backgroundGradient: string // CSS gradient for dark mode
  backgroundGradientLight: string // CSS gradient for light mode
}

export const PALETTES: ColorPalette[] = [
  {
    id: 'neutral-dark',
    name: 'Neutral Dark',
    description: 'Clean neutral — Linear/Raycast style',
    colors: {
      '--surface-dark': '26 26 28',
      '--surface-darker': '17 17 19',
      '--surface-deep': '20 20 22',
      '--surface-elevated': '35 35 38',
      '--surface-border': '46 46 50',
      '--surface-border-hover': '74 74 80',
      '--text-primary': '238 237 245',
      '--text-secondary': '200 197 214',
      '--text-muted': '155 151 176',
      '--text-faint': '107 102 128',
      '--accent-brand': '13 148 136',
      '--accent-brand-light': '45 212 191',
      '--accent-brand-lighter': '94 234 212',
      '--accent-brand-dark': '15 118 110',
      '--accent-brand-darker': '17 94 89',
      '--focus-ring': '45 212 191',
      '--focus-ring-dark': '94 234 212',
      '--surface-listing': '36 36 40',
      '--surface-listing-elevated': '46 46 52',
      '--surface-listing-hover': '56 56 62',
      '--surface-listing-border': '60 60 68',
      '--text-listing-secondary': '176 176 184',
      '--text-listing-muted': '138 138 148',
      '--particle-color': '212 212 220',
    },
    light: {
      '--surface-dark': '245 245 248',
      '--surface-darker': '238 238 242',
      '--surface-deep': '242 242 246',
      '--surface-elevated': '255 255 255',
      '--surface-border': '218 218 225',
      '--surface-border-hover': '195 195 205',
      '--text-primary': '28 28 32',
      '--text-secondary': '70 68 80',
      '--text-muted': '110 108 125',
      '--text-faint': '155 152 170',
      '--accent-brand': '13 148 136',
      '--accent-brand-light': '15 118 110',
      '--accent-brand-lighter': '17 94 89',
      '--accent-brand-dark': '45 212 191',
      '--accent-brand-darker': '94 234 212',
      '--focus-ring': '13 148 136',
      '--focus-ring-dark': '15 118 110',
      '--surface-listing': '240 240 244',
      '--surface-listing-elevated': '248 248 252',
      '--surface-listing-hover': '232 232 238',
      '--surface-listing-border': '210 210 220',
      '--text-listing-secondary': '80 78 95',
      '--text-listing-muted': '120 118 135',
      '--particle-color': '150 150 165',
    },
    particleHex: 0xD4D4DC,
    particleHexLight: 0x9696A5,
    backgroundGradient: 'linear-gradient(135deg, rgba(180, 180, 190, 0.05) 0%, rgba(140, 140, 155, 0.08) 100%)',
    backgroundGradientLight: 'linear-gradient(135deg, rgba(180, 180, 210, 0.08) 0%, rgba(200, 200, 220, 0.12) 100%)',
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: '2026 blue-green trend — calm & futuristic',
    colors: {
      '--surface-dark': '16 32 50',
      '--surface-darker': '10 22 36',
      '--surface-deep': '12 26 42',
      '--surface-elevated': '24 44 65',
      '--surface-border': '35 58 82',
      '--surface-border-hover': '55 82 110',
      '--text-primary': '226 232 240',
      '--text-secondary': '186 198 214',
      '--text-muted': '140 160 185',
      '--text-faint': '100 120 150',
      '--accent-brand': '8 145 178',
      '--accent-brand-light': '34 211 238',
      '--accent-brand-lighter': '125 211 252',
      '--accent-brand-dark': '14 116 144',
      '--accent-brand-darker': '22 78 99',
      '--focus-ring': '34 211 238',
      '--focus-ring-dark': '125 211 252',
      '--surface-listing': '18 35 52',
      '--surface-listing-elevated': '25 45 65',
      '--surface-listing-hover': '32 55 78',
      '--surface-listing-border': '40 62 85',
      '--text-listing-secondary': '170 190 210',
      '--text-listing-muted': '120 145 175',
      '--particle-color': '125 211 252',
    },
    light: {
      '--surface-dark': '235 245 252',
      '--surface-darker': '225 238 248',
      '--surface-deep': '230 242 250',
      '--surface-elevated': '245 252 255',
      '--surface-border': '195 218 238',
      '--surface-border-hover': '170 198 222',
      '--text-primary': '10 25 42',
      '--text-secondary': '30 55 82',
      '--text-muted': '80 110 145',
      '--text-faint': '120 148 178',
      '--accent-brand': '8 145 178',
      '--accent-brand-light': '14 116 144',
      '--accent-brand-lighter': '22 78 99',
      '--accent-brand-dark': '34 211 238',
      '--accent-brand-darker': '125 211 252',
      '--focus-ring': '8 145 178',
      '--focus-ring-dark': '14 116 144',
      '--surface-listing': '230 242 252',
      '--surface-listing-elevated': '240 248 255',
      '--surface-listing-hover': '218 235 248',
      '--surface-listing-border': '190 215 235',
      '--text-listing-secondary': '40 65 92',
      '--text-listing-muted': '90 120 155',
      '--particle-color': '80 160 200',
    },
    particleHex: 0x7DD3FC,
    particleHexLight: 0x50A0C8,
    backgroundGradient: 'linear-gradient(135deg, rgba(8, 145, 178, 0.06) 0%, rgba(13, 27, 42, 0.10) 100%)',
    backgroundGradientLight: 'linear-gradient(135deg, rgba(8, 145, 178, 0.05) 0%, rgba(235, 245, 252, 0.1) 100%)',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Retro-futurism — electric & bold',
    colors: {
      '--surface-dark': '12 12 22',
      '--surface-darker': '6 6 14',
      '--surface-deep': '9 9 18',
      '--surface-elevated': '22 22 36',
      '--surface-border': '35 35 52',
      '--surface-border-hover': '55 55 75',
      '--text-primary': '240 253 250',
      '--text-secondary': '204 251 241',
      '--text-muted': '153 246 228',
      '--text-faint': '94 190 170',
      '--accent-brand': '34 211 238',
      '--accent-brand-light': '103 232 249',
      '--accent-brand-lighter': '165 243 252',
      '--accent-brand-dark': '8 145 178',
      '--accent-brand-darker': '22 78 99',
      '--focus-ring': '103 232 249',
      '--focus-ring-dark': '165 243 252',
      '--surface-listing': '14 14 22',
      '--surface-listing-elevated': '22 22 34',
      '--surface-listing-hover': '30 30 44',
      '--surface-listing-border': '38 38 54',
      '--text-listing-secondary': '190 240 230',
      '--text-listing-muted': '130 180 170',
      '--particle-color': '103 232 249',
    },
    light: {
      '--surface-dark': '238 240 248',
      '--surface-darker': '228 230 242',
      '--surface-deep': '232 234 245',
      '--surface-elevated': '248 250 255',
      '--surface-border': '200 205 225',
      '--surface-border-hover': '175 180 205',
      '--text-primary': '8 8 18',
      '--text-secondary': '25 25 45',
      '--text-muted': '70 70 100',
      '--text-faint': '110 110 140',
      '--accent-brand': '6 182 212',
      '--accent-brand-light': '8 145 178',
      '--accent-brand-lighter': '22 78 99',
      '--accent-brand-dark': '103 232 249',
      '--accent-brand-darker': '165 243 252',
      '--focus-ring': '6 182 212',
      '--focus-ring-dark': '8 145 178',
      '--surface-listing': '232 234 248',
      '--surface-listing-elevated': '242 244 255',
      '--surface-listing-hover': '222 225 240',
      '--surface-listing-border': '195 200 220',
      '--text-listing-secondary': '35 35 60',
      '--text-listing-muted': '85 85 115',
      '--particle-color': '80 140 180',
    },
    particleHex: 0x67E8F9,
    particleHexLight: 0x508CB4,
    backgroundGradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(10, 10, 15, 0.10) 100%)',
    backgroundGradientLight: 'linear-gradient(135deg, rgba(34, 211, 238, 0.06) 0%, rgba(238, 240, 248, 0.1) 100%)',
  },
  {
    id: 'midnight-rose',
    name: 'Midnight Rose',
    description: 'Jewel tones — warm & luxurious',
    colors: {
      '--surface-dark': '38 22 28',
      '--surface-darker': '22 12 16',
      '--surface-deep': '30 16 22',
      '--surface-elevated': '52 34 40',
      '--surface-border': '68 48 55',
      '--surface-border-hover': '90 68 76',
      '--text-primary': '253 232 239',
      '--text-secondary': '245 208 220',
      '--text-muted': '210 165 180',
      '--text-faint': '160 120 135',
      '--accent-brand': '244 63 94',
      '--accent-brand-light': '251 113 133',
      '--accent-brand-lighter': '253 164 175',
      '--accent-brand-dark': '225 29 72',
      '--accent-brand-darker': '159 18 57',
      '--focus-ring': '251 113 133',
      '--focus-ring-dark': '253 164 175',
      '--surface-listing': '32 22 26',
      '--surface-listing-elevated': '42 30 35',
      '--surface-listing-hover': '52 38 44',
      '--surface-listing-border': '62 45 52',
      '--text-listing-secondary': '230 200 210',
      '--text-listing-muted': '180 150 160',
      '--particle-color': '253 164 175',
    },
    light: {
      '--surface-dark': '252 240 244',
      '--surface-darker': '248 232 238',
      '--surface-deep': '250 236 242',
      '--surface-elevated': '255 248 250',
      '--surface-border': '235 210 218',
      '--surface-border-hover': '220 188 200',
      '--text-primary': '35 18 25',
      '--text-secondary': '72 40 52',
      '--text-muted': '125 90 105',
      '--text-faint': '165 130 145',
      '--accent-brand': '225 29 72',
      '--accent-brand-light': '190 18 60',
      '--accent-brand-lighter': '159 18 57',
      '--accent-brand-dark': '251 113 133',
      '--accent-brand-darker': '253 164 175',
      '--focus-ring': '225 29 72',
      '--focus-ring-dark': '190 18 60',
      '--surface-listing': '248 235 240',
      '--surface-listing-elevated': '252 242 246',
      '--surface-listing-hover': '240 225 232',
      '--surface-listing-border': '225 205 215',
      '--text-listing-secondary': '60 35 45',
      '--text-listing-muted': '110 80 92',
      '--particle-color': '220 130 150',
    },
    particleHex: 0xFDA4AF,
    particleHexLight: 0xDC8296,
    backgroundGradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(26, 18, 21, 0.10) 100%)',
    backgroundGradientLight: 'linear-gradient(135deg, rgba(244, 63, 94, 0.04) 0%, rgba(252, 240, 244, 0.1) 100%)',
  },
]

export function getPaletteById(id: string): ColorPalette {
  return PALETTES.find(p => p.id === id) || PALETTES[0]
}

export function getActivePaletteId(): string {
  if (typeof window === 'undefined') return 'neutral-dark'
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || 'neutral-dark'
  } catch {
    return 'neutral-dark'
  }
}

export function getActiveMode(): ColorMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    return (localStorage.getItem(MODE_STORAGE_KEY) as ColorMode) || 'dark'
  } catch {
    return 'dark'
  }
}

export function setActivePaletteId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch { /* SSR or quota */ }
}

export function setActiveMode(mode: ColorMode): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch { /* SSR or quota */ }
}

export function applyPalette(palette: ColorPalette, mode: ColorMode = 'dark'): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const colors = mode === 'light' ? palette.light : palette.colors
  for (const [varName, value] of Object.entries(colors)) {
    root.style.setProperty(varName, value)
  }
  // Set data-mode for CSS overrides (text-white → dark text in light mode)
  root.setAttribute('data-mode', mode)
}

export function loadAndApplyPalette(): ColorPalette {
  const id = getActivePaletteId()
  const mode = getActiveMode()
  const palette = getPaletteById(id)
  applyPalette(palette, mode)
  return palette
}

/** Convert RGB triplet "r g b" to hex number for THREE.js */
export function rgbToHex(rgb: string): number {
  const [r, g, b] = rgb.split(' ').map(Number)
  return (r << 16) | (g << 8) | b
}

/** Get inline script for flash prevention (call in layout.tsx) */
export function getThemeScript(): string {
  const palettesMap: Record<string, Record<string, string>> = {}
  for (const p of PALETTES) {
    if (p.id === 'neutral-dark') continue // defaults in CSS
    palettesMap[p.id] = p.colors
  }
  return `(function(){try{var id=localStorage.getItem('${THEME_STORAGE_KEY}');if(!id||id==='neutral-dark')return;var p=${JSON.stringify(palettesMap)}[id];if(!p)return;var s=document.documentElement.style;for(var k in p)s.setProperty(k,p[k])}catch(e){}})();`
}
