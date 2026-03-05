/**
 * Telegram message formatting helpers for compact bot messages
 */

/**
 * Extract a short summary (first sentence, max N words) from a full summary
 */
export function getShortSummary(summary: string, maxWords = 9): string {
  if (!summary) return ''
  // Take first sentence (split on . ! ?)
  const firstSentence = summary.split(/[.!?]/)[0]?.trim() || summary
  const words = firstSentence.split(/\s+/)
  if (words.length <= maxWords) return firstSentence
  return words.slice(0, maxWords).join(' ') + '...'
}

/** Variant emoji constants */
const VARIANT_EMOJIS = ['1\uFE0F\u20E3', '2\uFE0F\u20E3', '3\uFE0F\u20E3', '4\uFE0F\u20E3']

/**
 * Format variants as compact label-only lines (no descriptions)
 */
export function formatCompactVariants(
  variants: Array<{ label: string; description: string }>,
  escapeHtml: (s: string) => string
): string {
  let text = ''
  variants.forEach((v, i) => {
    text += `\n${VARIANT_EMOJIS[i] || `${i + 1}.`} ${escapeHtml(v.label)}`
  })
  return text
}

/** Short category labels */
export const CATEGORY_SHORT: Record<string, string> = {
  'tech_product': '\uD83D\uDCBB Tech',
  'marketing_campaign': '\uD83D\uDCE2 Marketing',
  'ai_research': '\uD83E\uDD16 AI',
  'business_news': '\uD83D\uDCBC Business',
  'science': '\uD83D\uDD2C Science',
  'lifestyle': '\uD83C\uDF1F Lifestyle',
  'other': '\uD83D\uDCF0 Other'
}

/**
 * Build preset keyboard for one-click publishing.
 * Replaces the multi-step variant->language->publish->social flow.
 *
 * Callback format: pr_VTL_<uuid> (43 chars, under 64-byte Telegram limit)
 *   V = variant: 'a' (AI auto), '1'-'4' (specific)
 *   T = type: 'n' (news), 'b' (blog)
 *   L = lang: 'e' (EN), 'n' (NO), 'u' (UA)
 */
export function buildPresetKeyboard(
  newsId: string,
  variantCount: number,
  hasDuplicates: boolean
): { inline_keyboard: any[][] } {
  const rows: any[][] = []

  // Row 1: Auto presets (News — AI selects variant)
  rows.push([
    { text: '\uD83D\uDE80 EN', callback_data: `pr_ane_${newsId}` },
    { text: '\uD83D\uDE80 NO', callback_data: `pr_ann_${newsId}` },
    { text: '\uD83D\uDE80 UA', callback_data: `pr_anu_${newsId}` }
  ])

  // Variant-specific preset rows (only for existing variants)
  for (let i = 0; i < Math.min(variantCount, 4); i++) {
    rows.push([
      { text: `${VARIANT_EMOJIS[i]}EN`, callback_data: `pr_${i + 1}ne_${newsId}` },
      { text: `${VARIANT_EMOJIS[i]}NO`, callback_data: `pr_${i + 1}nn_${newsId}` },
      { text: `${VARIANT_EMOJIS[i]}UA`, callback_data: `pr_${i + 1}nu_${newsId}` }
    ])
  }

  // Blog presets
  rows.push([
    { text: '\uD83D\uDCDD EN', callback_data: `pr_abe_${newsId}` },
    { text: '\uD83D\uDCDD NO', callback_data: `pr_abn_${newsId}` },
    { text: '\uD83D\uDCDD UA', callback_data: `pr_abu_${newsId}` }
  ])

  // Manual + Duplicate + Skip
  const lastRow: any[] = [
    { text: '\uD83D\uDD27 \u0412\u0440\u0443\u0447\u043D\u0443', callback_data: `manual_${newsId}` }
  ]
  if (hasDuplicates) {
    lastRow.push({ text: '\uD83D\uDD01 \u0414\u0443\u0431\u043B\u044C', callback_data: `skip_dup_${newsId}` })
  }
  lastRow.push({ text: '\u274C Skip', callback_data: `reject_${newsId}` })
  rows.push(lastRow)

  return { inline_keyboard: rows }
}

/**
 * Build manual (old-style) keyboard for step-by-step publishing.
 * Used when moderator clicks "Вручну" from preset keyboard.
 */
export function buildManualKeyboard(
  newsId: string,
  options: {
    hasVideo: boolean
    hasVariants: boolean
    variantCount: number
    hasImage: boolean
    isRss: boolean
    hasDuplicates: boolean
  }
): { inline_keyboard: any[][] } {
  const { hasVideo, hasVariants, variantCount, hasImage, isRss, hasDuplicates } = options
  const rows: any[][] = []
  const uploadCallback = isRss ? `upload_rss_image_${newsId}` : `create_custom_${newsId}`

  if (hasVideo) {
    rows.push([
      { text: '\uD83D\uDCF0 \u0412 \u043D\u043E\u0432\u0438\u043D\u0438', callback_data: `publish_news_${newsId}` },
      { text: '\uD83D\uDCDD \u0412 \u0431\u043B\u043E\u0433', callback_data: `publish_blog_${newsId}` }
    ])
    if (hasImage) {
      rows.push([
        { text: '\uD83D\uDDBC + \u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B \u0444\u043E\u0442\u043E', callback_data: `keep_orig_${newsId}` },
        { text: '\uD83D\uDCF8 + \u0421\u0432\u043E\u0454 \u0444\u043E\u0442\u043E', callback_data: uploadCallback }
      ])
    }
  } else if (hasVariants) {
    const variantRow: any[] = []
    for (let i = 0; i < Math.min(variantCount, 4); i++) {
      variantRow.push({ text: VARIANT_EMOJIS[i], callback_data: `select_variant_${i + 1}_${newsId}` })
    }
    rows.push(variantRow)
    rows.push([
      { text: '\uD83D\uDD04 \u041D\u043E\u0432\u0456 \u0432\u0430\u0440\u0456\u0430\u043D\u0442\u0438', callback_data: `new_variants_${newsId}` },
      { text: '\uD83C\uDFA8 Creative Builder', callback_data: `cb_hub_${newsId}` }
    ])
    rows.push([
      ...(hasImage ? [{ text: '\uD83D\uDDBC \u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B', callback_data: `keep_orig_${newsId}` }] : []),
      { text: '\uD83D\uDCF8 \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438', callback_data: uploadCallback }
    ])
  } else if (hasImage && isRss) {
    rows.push([
      { text: '\uD83D\uDDBC \u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B', callback_data: `keep_orig_${newsId}` },
      { text: '\uD83D\uDD04 \u0417\u0433\u0435\u043D\u0435\u0440\u0443\u0432\u0430\u0442\u0438 AI', callback_data: `regenerate_rss_image_${newsId}` }
    ])
    rows.push([
      { text: '\uD83D\uDCF8 \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438 \u0441\u0432\u043E\u0454', callback_data: uploadCallback }
    ])
  } else {
    rows.push([
      { text: '\uD83C\uDFB2 Random Variants', callback_data: `new_variants_${newsId}` },
      { text: '\uD83C\uDFA8 Creative Builder', callback_data: `cb_hub_${newsId}` }
    ])
    rows.push([
      ...(hasImage ? [{ text: '\uD83D\uDDBC \u041E\u0440\u0438\u0433\u0456\u043D\u0430\u043B', callback_data: `keep_orig_${newsId}` }] : []),
      { text: '\uD83D\uDCF8 \u0417\u0430\u0432\u0430\u043D\u0442\u0430\u0436\u0438\u0442\u0438', callback_data: uploadCallback }
    ])
  }

  // Reject + duplicate row
  const rejectRow: any[] = [{ text: '\u274C Reject', callback_data: `reject_${newsId}` }]
  if (hasDuplicates) {
    rejectRow.push({ text: '\uD83D\uDD01 Skip (\u0434\u0443\u0431\u043B\u044C)', callback_data: `skip_dup_${newsId}` })
  }
  rows.push(rejectRow)

  return { inline_keyboard: rows }
}
