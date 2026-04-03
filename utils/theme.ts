/**
 * Color Palette System
 * Defines 4 palettes and runtime switching via CSS custom properties.
 * CSS vars use RGB triplets (e.g., "26 26 28") for Tailwind opacity support.
 */

const THEME_STORAGE_KEY = 'vitalii_active_palette'

export interface ColorPalette {
  id: string
  name: string
  description: string
  colors: Record<string, string> // CSS var name → RGB triplet
  particleHex: number // THREE.js hex color
  backgroundGradient: string // CSS gradient for particle container
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
    particleHex: 0xD4D4DC,
    backgroundGradient: 'linear-gradient(135deg, rgba(180, 180, 190, 0.05) 0%, rgba(140, 140, 155, 0.08) 100%)',
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: '2026 blue-green trend — calm & futuristic',
    colors: {
      '--surface-dark': '13 27 42',
      '--surface-darker': '8 20 32',
      '--surface-deep': '10 22 35',
      '--surface-elevated': '21 37 53',
      '--surface-border': '30 50 70',
      '--surface-border-hover': '50 75 100',
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
    particleHex: 0x7DD3FC,
    backgroundGradient: 'linear-gradient(135deg, rgba(8, 145, 178, 0.06) 0%, rgba(13, 27, 42, 0.10) 100%)',
  },
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    description: 'Retro-futurism — electric & bold',
    colors: {
      '--surface-dark': '10 10 15',
      '--surface-darker': '6 6 10',
      '--surface-deep': '8 8 12',
      '--surface-elevated': '18 18 26',
      '--surface-border': '30 30 42',
      '--surface-border-hover': '50 50 68',
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
    particleHex: 0x67E8F9,
    backgroundGradient: 'linear-gradient(135deg, rgba(34, 211, 238, 0.05) 0%, rgba(10, 10, 15, 0.10) 100%)',
  },
  {
    id: 'midnight-rose',
    name: 'Midnight Rose',
    description: 'Jewel tones — warm & luxurious',
    colors: {
      '--surface-dark': '26 18 21',
      '--surface-darker': '15 10 12',
      '--surface-deep': '20 14 16',
      '--surface-elevated': '38 28 32',
      '--surface-border': '55 40 46',
      '--surface-border-hover': '80 60 68',
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
    particleHex: 0xFDA4AF,
    backgroundGradient: 'linear-gradient(135deg, rgba(244, 63, 94, 0.05) 0%, rgba(26, 18, 21, 0.10) 100%)',
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

export function setActivePaletteId(id: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch { /* SSR or quota */ }
}

export function applyPalette(palette: ColorPalette): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const [varName, value] of Object.entries(palette.colors)) {
    root.style.setProperty(varName, value)
  }
}

export function loadAndApplyPalette(): ColorPalette {
  const id = getActivePaletteId()
  const palette = getPaletteById(id)
  if (id !== 'neutral-dark') {
    applyPalette(palette)
  }
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
