# YouTube Thumbnail Design System Reference

## Technical Specifications

| Parameter | Value |
|-----------|-------|
| Resolution | 1280 x 720 px (minimum); 1920 x 1080 px (recommended) |
| Aspect Ratio | 16:9 |
| File Size | Under 2 MB |
| Formats | JPG (photos), PNG (text-heavy/sharp edges) |

## Safe Zones (at 1280x720)

```
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │    ✅ SAFE ZONE (center 1076x576)      │  │
│  │    All text & critical elements here   │  │
│  │                                        │  │
│  │                                        │  │
│  │                              ┌─────┐   │  │
│  └──────────────────────────────┤TIMER│───┘  │
│     ↑ 102px margin (8%)        └─────┘  ↑   │
│     ↑ 72px margin (10%)     duration     │   │
│                              badge       │   │
└──────────────────────────────────────────────┘
```

- **Side margins**: 102px (8%) from left/right edges
- **Top/bottom margins**: 72px (10%) from top/bottom
- **Duration badge**: Bottom-right ~14% width x 10% height
- **Progress bar**: Full bottom edge, ~4px
- **NEVER** place text/key elements in bottom-right quadrant
- **Bottom avoidance**: Keep 150-200px above bottom edge

## The 120px Test (Mobile-First)

Mobile displays thumbnails at **120x68px** (smallest) to **168x94px**.
63-70% of all YouTube views are on mobile.

**At 120px width, viewers must identify:**
1. Mood/emotion (from colors and expression)
2. General subject (from composition)
3. Text (only if large enough — max 3-5 words)

**Rule**: If it's a muddy blur at 120px, redesign.

## Text Rules

| Parameter | Value |
|-----------|-------|
| Maximum characters | 20 |
| Maximum words | 3-5 (ideal: 3-4) |
| Font type | Bold sans-serif only (Impact, Bebas Neue, Montserrat ExtraBold) |
| Minimum font size | 150-200px for primary headlines; 80-120px secondary (at 1280x720) |
| Contrast ratio | Minimum 4.5:1 (WCAG AA); 3:1 for large text |
| Text effects | White text + black outline/stroke + dark shadow |
| High-contrast combos | Yellow/black, white/red, black/yellow, white/dark blue |
| Placement | Upper or middle area (rule of thirds) |
| AVOID | Bottom-right (duration badge), bottom 15%, all corners, thin fonts |

## Color Strategy

### High-Impact Colors for CTR

| Color | Psychology | Use Case |
|-------|-----------|----------|
| Yellow | Optimism, alertness, grabs attention | Headlines, badges, accent elements |
| Orange | Enthusiasm, warmth, energy | Brand accents, CTAs, tech channels |
| Red | Urgency, excitement | Breaking news (BUT avoid YouTube's red UI) |
| Blue | Trust, stability, professionalism | Tech, education, corporate |
| Purple | Luxury, mystery, creativity | AI, premium content |
| Green | Growth, positive outcomes | Results, before/after |

### Color Rules
- Max **3 colors** per thumbnail
- Background and text must be **complementary or high-contrast**
- Avoid same-temperature colors touching (red on orange = mud)
- Saturate more than real life (thumbnails compete with bright UI)
- **Avoid**: YouTube's red (#FF0000), pure white backgrounds (blends with light mode)

### Tech/News Channel Palette
- Deep navy/black backgrounds + bright orange/yellow text = premium news look
- Blues, blacks, greys with orange or red accents
- Our brand: Dark navy #0a1628 → dark purple #1a0a3e + orange #FF7A00

## Composition Rules

| Rule | Value |
|------|-------|
| Dominant subject | Fill 40-60% of frame |
| Maximum elements | 2-3 visual elements (>3 drops CTR by 23%) |
| Negative space | 30-40% of frame |
| Rule of thirds | Position subjects at intersection points |
| Layer depth | Background → Subject → Text (front) |
| 1-second rule | Topic and tone must be clear within 1 second |
| Squint test | Primary focal point visible when squinting |

## Faceless Channel Thumbnail Styles

Since our channel is automated/faceless (no presenter face), these styles work best:

1. **Minimal Object + Bold Text**: Single object (laptop, phone, chart) on strong contrast background
2. **Chart & Dashboard Style**: Clean line graph/bar chart + dashboard elements
3. **Dark Subject on Light Background**: High contrast, premium modern look
4. **Bold Color Blocks**: Diagonal color blocks, collage style, article count badge
5. **Screenshot + Highlight**: Interface screenshot with bright highlight on key area
6. **Abstract Tech Visuals**: Geometric patterns, grid overlays, glow effects

## AI Prompt Engineering (Gemini-Specific)

### Effective Prompt Formula
```
[Shot type] + [Subject/visual] + [Background description with colors] +
[Lighting/mood] + [Text placement zone] + [Aspect ratio] +
[Style reference] + [Positive framing for clean output]
```

### Best Practices
1. **Describe narratively**: "A photorealistic wide-angle shot of..." beats keyword lists
2. **Be hyper-specific**: "dark navy gradient with subtle hexagonal grid pattern and soft orange glow from lower left"
3. **Specify text exactly**: "the text 'NYHETER' in bold, white, sans-serif font at top-left"
4. **Use camera terms**: "wide-angle shot", "elevated 45-degree angle", "studio lighting"
5. **Control composition**: "subject at right third of frame, empty zone on left for text"
6. **Positive framing**: Instead of "no clutter" → "clean minimalist composition with ample negative space"
7. **Max 5-7 words** for Gemini text rendering
8. **Font specifics**: Specify weight ("bold"), style ("sans-serif"), color ("bright white with dark shadow")

### Text in AI Thumbnails
- Gemini works well for 5-7 words maximum
- For perfect legibility: generate clean background, add text programmatically (Remotion fallback)
- Always specify: font weight, style, color, shadow/outline, position

## CTR Benchmarks

| Tier | CTR |
|------|-----|
| Exceptional | 9.0%+ |
| Good | 7.0-8.9% |
| Average (Tech niche) | 7.5% |
| Poor | <4.0% |

## Common Mistakes

1. Visual overload (>3 elements = -23% CTR)
2. Too much text (>5 words = illegible on mobile)
3. Dark text on dark backgrounds (always high contrast)
4. Thin/decorative fonts (invisible at small sizes)
5. Text in bottom-right (covered by duration badge)
6. Desktop-only design (70% views are mobile)
7. Generic/blurry images (significantly reduces clicks)
8. Inconsistent branding (weakens channel recognition)
9. Misleading thumbnails (high bounce, algorithm punishment)
10. Auto-generated thumbnails (90% top videos use custom)

## Checklist

- [ ] 1280x720+ resolution, 16:9 aspect
- [ ] Under 2MB file size
- [ ] Passes 120px squint test
- [ ] No critical elements in bottom-right or bottom-left
- [ ] Max 3 colors, high contrast
- [ ] Text max 5 words, bold sans-serif, contrast stroke
- [ ] 2-3 visual elements maximum
- [ ] Works on light AND dark YouTube backgrounds
- [ ] Clear topic within 1 second
- [ ] Consistent brand style (dark + orange #FF7A00)
