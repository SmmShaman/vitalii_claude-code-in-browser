# Typography Audit & Recommendations

**Site:** vitalii.no
**Date:** 2026-04-04
**Status:** Audit complete, improvements proposed

---

## 1. Current Typography System

### Fonts Loaded

| Font | Weights | Subsets | Usage |
|------|---------|--------|-------|
| **Comfortaa** | 400, 700 | latin, cyrillic | Primary — all UI |
| **Host Grotesk** | 400 | (inline import) | Services detail descriptions only |

### CSS Variable Scale (globals.css)

| Token | Value | Computed (1440px) |
|-------|-------|-------------------|
| `--text-display` | `clamp(1.5rem, 3vw, 2.5rem)` | ~43px |
| `--text-heading` | `clamp(1rem, 1.7vw, 1.5rem)` | ~24px |
| `--text-subheading` | `clamp(0.95rem, 1.4vw, 1.35rem)` | ~20px |
| `--text-body` | `clamp(0.875rem, 1.2vw, 1rem)` | ~17px |
| `--text-small` | `clamp(0.75rem, 1vw, 0.875rem)` | ~14px |
| `--text-caption` | `0.75rem` | 12px |

### Actual Usage Distribution

| Size Class | Count | % of Total |
|------------|-------|------------|
| `text-sm` (14px) | 489 | 53% |
| `text-xs` (12px) | 255 | 28% |
| `text-lg` (18px) | 75 | 8% |
| `text-2xl` (24px) | 69 | 7% |
| `text-xl` (20px) | 19 | 2% |
| `text-3xl` (30px) | 11 | 1% |
| `text-base` (16px) | 4 | <1% |

**Plus 79 arbitrary micro-sizes:** `text-[7px]` to `text-[11px]`

### Weight Distribution

| Weight | Count | Role |
|--------|-------|------|
| `font-medium` (500) | 255 | Default for most UI |
| `font-bold` (700) | 163 | Headings, emphasis |
| `font-semibold` (600) | 121 | Sub-headings, labels |
| `font-normal` (400) | 4 | Rarely used explicitly |
| `fontWeight: 900` | 2 | Services animation only |

---

## 2. Issues Found

### P0: Font Loading Gap
**Comfortaa loads only weights 400 and 700**, but code uses:
- `font-medium` (500) — 255 times!
- `font-semibold` (600) — 121 times!
- `fontWeight: 900` — 2 times

**Impact:** Browser synthesizes these weights from 400/700, causing:
- font-medium (500) renders as 400 (looks too thin)
- font-semibold (600) renders as 700 (looks too thick, same as bold)
- No visible difference between medium, semibold, and bold

**Fix:** Load weights 300, 500, 600, 700 (Comfortaa supports 300-700)

### P1: Small Text Bias
**81% of text uses text-sm (14px) or text-xs (12px).** Only 4 instances of `text-base` (16px) — the recommended body text minimum.

**Impact:** Everything feels small and dense. Reading fatigue on longer content.

**Fix:** Promote body text from `text-sm` to `text-base` (16px). Keep `text-sm` for secondary/metadata, `text-xs` for badges/captions.

### P1: Arbitrary Micro-Sizes Chaos
79 instances of `text-[7px]`, `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]` — these bypass the type scale entirely.

**Impact:** No consistent smallest size. 7px is below readable threshold. Accessibility failure.

**Fix:** Consolidate to 2 micro sizes:
- Badges/counts: `text-[10px]` (keep)
- Remove `text-[7px]`, `text-[8px]` — promote to `text-[10px]`
- Replace `text-[9px]`, `text-[11px]` with `text-xs` (12px)

### P1: Scale Ratio Inconsistency
Current scale jumps are uneven:

```
12px → 14px (ratio 1.17)
14px → 16px (ratio 1.14)
16px → 18px (ratio 1.13)
18px → 20px (ratio 1.11)
20px → 24px (ratio 1.20)
24px → 30px (ratio 1.25)
```

No consistent mathematical ratio. Steps 14→16→18→20 are too close — muddy hierarchy.

### P2: Line Height Gaps
Only 33 explicit line-height classes across entire site:
- `leading-relaxed` (1.625): 20 uses
- `leading-tight` (1.25): 8 uses
- `leading-none` (1): 3 uses

**Impact:** Most text relies on Tailwind default (1.5). No distinction between heading tightness and body comfort.

### P2: Comfortaa as Body Font
Comfortaa is a **display font** (rounded geometric). Works well for headings and brand identity but is suboptimal for long-form body text (blog articles, news content):
- Rounded terminals reduce readability at small sizes
- Limited x-height compared to text-optimized fonts
- No italic variant

### P3: Host Grotesk Orphan
Host Grotesk is loaded via inline `fontFamily` in only ONE component (`ServicesDetail.tsx`). Loading an entire font family for one element is wasteful.

### P3: CSS Variable Scale Underused
The 6 typography tokens are defined but rarely referenced:
- `var(--text-display)`: 1 use
- `var(--text-heading)`: 1 use
- `var(--text-body)`: 0 direct uses
- Most components use Tailwind classes instead

---

## 3. Recommended Improvements

### Fix 1: Load Correct Font Weights (P0)

```tsx
// layout.tsx — Before:
const comfortaa = Comfortaa({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-comfortaa',
})

// After:
const comfortaa = Comfortaa({
  subsets: ['latin', 'cyrillic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-comfortaa',
})
```

**Impact:** font-medium and font-semibold will now render correctly with distinct visual weights.

### Fix 2: Establish Clear Type Scale (P1)

**Proposed 1.25 ratio scale:**

| Role | Current | Proposed | Ratio |
|------|---------|----------|-------|
| Caption/Badge | 10-12px | `0.75rem` (12px) | base |
| Small/Meta | 12-14px | `0.875rem` (14px) | 1.17 |
| Body | 14px (!) | `1rem` (16px) | 1.14 |
| Subheading | varies | `1.25rem` (20px) | 1.25 |
| Heading | varies | `1.5rem` (24px) | 1.20 |
| Display | varies | `2rem` (32px) | 1.33 |
| Hero | varies | `clamp(2.5rem, 5vw, 4rem)` | — |

### Fix 3: Weight Strategy (P1)

| Role | Weight | Usage |
|------|--------|-------|
| Body text | 400 (Regular) | Paragraphs, descriptions |
| UI labels, buttons | 500 (Medium) | Navigation, tags, metadata |
| Subheadings, card titles | 600 (Semibold) | Section cards, feature titles |
| Headings | 700 (Bold) | Page titles, section names |

Eliminate `fontWeight: 900` (not loaded) and `fontWeight: 800` (not loaded).

### Fix 4: Line Height Rules (P2)

| Context | Line Height | Why |
|---------|-------------|-----|
| Display/Hero | `leading-tight` (1.25) | Large text needs tight spacing |
| Headings | `leading-snug` (1.375) | Moderate — readable but compact |
| Body text | `leading-relaxed` (1.625) | Maximum comfort for reading |
| Captions/Labels | `leading-normal` (1.5) | Default is fine |
| Dark backgrounds | +0.05 | Light-on-dark needs more space |

### Fix 5: Consider Body Font Pairing (P2)

For blog/news articles (long-form reading), consider adding a text-optimized font:

**Option A:** Use system font stack for articles:
```css
.prose { font-family: system-ui, -apple-system, sans-serif; }
```

**Option B:** Add Inter for body (optimized for screen reading):
```tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-body' })
```

**Option C:** Keep Comfortaa everywhere (brand consistency over readability).

**Recommendation:** Option A — zero additional font loading, excellent readability on all platforms, Comfortaa stays as brand font for headings/UI.

### Fix 6: Consolidate Micro-Sizes (P1)

| Current | Count | Action |
|---------|-------|--------|
| `text-[7px]` | 4 | Promote to `text-[10px]` |
| `text-[8px]` | 3 | Promote to `text-[10px]` |
| `text-[9px]` | 8 | Promote to `text-[10px]` |
| `text-[10px]` | 51 | Keep (badge standard) |
| `text-[11px]` | 13 | Replace with `text-xs` (12px) |

---

## 4. Priority Matrix

| # | Fix | Severity | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | Load font weights 300-700 | P0 | 1 line | Fixes 376 elements rendering wrong weights |
| 2 | Consolidate micro-sizes | P1 | 28 edits | Accessibility + consistency |
| 3 | Body text 14px → 16px | P1 | Many files | Readability across site |
| 4 | Line height rules | P2 | ~30 edits | Reading comfort |
| 5 | Body font for articles | P2 | 2 files | Article readability |
| 6 | Remove Host Grotesk | P3 | 1 file | Performance (fewer fonts) |

---

## 5. Quick Win: Font Weight Fix

This is the highest-impact, lowest-effort change. One line in `layout.tsx` fixes 376 elements:

```diff
- weight: ['400', '700'],
+ weight: ['300', '400', '500', '600', '700'],
```

After this change:
- `font-medium` (255 uses) renders as actual weight 500 instead of fallback 400
- `font-semibold` (121 uses) renders as actual weight 600 instead of fallback 700
- Clear visual hierarchy: medium < semibold < bold
