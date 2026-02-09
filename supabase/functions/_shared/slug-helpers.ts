/**
 * Shared slug generation with transliteration for Norwegian and Ukrainian
 */

const NORWEGIAN_MAP: Record<string, string> = {
  'æ': 'ae', 'ø': 'oe', 'å': 'aa',
  'é': 'e', 'ö': 'o', 'ä': 'a', 'ü': 'u',
}

const UKRAINIAN_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g',
  'д': 'd', 'е': 'e', 'є': 'ye', 'ж': 'zh', 'з': 'z',
  'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k',
  'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p',
  'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f',
  'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
  'ь': '', 'ю': 'yu', 'я': 'ya', 'ъ': '',
}

function transliterate(text: string, lang: 'en' | 'no' | 'ua'): string {
  if (lang === 'en') return text

  const map = lang === 'no' ? NORWEGIAN_MAP : UKRAINIAN_MAP
  let result = ''
  for (const char of text) {
    const lower = char.toLowerCase()
    if (lower in map) {
      const replacement = map[lower]
      // Preserve case for single-char replacements
      if (replacement.length === 1 && char !== lower) {
        result += replacement.toUpperCase()
      } else {
        result += replacement
      }
    } else {
      result += char
    }
  }
  return result
}

export function generateLocalizedSlug(text: string, lang: 'en' | 'no' | 'ua', uniqueSuffix: string): string {
  const transliterated = transliterate(text, lang)
  const baseSlug = transliterated
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)
  return `${baseSlug}-${uniqueSuffix}`
}
