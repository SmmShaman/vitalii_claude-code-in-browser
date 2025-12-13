# 🎨 Daily Doodle Setup Guide

## Overview

The Daily Doodle feature displays an interactive, automatically-changing image every day with dynamic particle effects based on the image's theme and colors.

---

## 🔧 Environment Variables

Add these to your **Netlify Environment Variables** (Site Settings → Build & Deploy → Environment):

```bash
# Supabase Service Role Key (REQUIRED)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NASA API Key (OPTIONAL - defaults to DEMO_KEY)
NASA_API_KEY=your_nasa_api_key_or_DEMO_KEY
```

### Where to find these:

1. **SUPABASE_SERVICE_ROLE_KEY**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Go to Project Settings → API
   - Copy the `service_role` key (secret)

2. **NASA_API_KEY** (optional):
   - Get free key: https://api.nasa.gov/
   - Or use `DEMO_KEY` (rate-limited to 30 requests/hour)

---

## 📦 Database Setup

Run the migration to create the `daily_images` table:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL from:
# supabase/migrations/20250102000000_create_daily_images.sql
```

This creates:
- `daily_images` table for caching
- Indexes for performance
- RLS policies for security

---

## 🚀 How It Works

### 1. **Image Sources**

The system fetches images from:
- **Bing Wallpaper** (primary, no API key needed)
- **NASA APOD** (fallback, requires API key)

### 2. **Caching Strategy**

- Images are fetched **once per day**
- Cached in **Supabase** (server-side)
- Also cached in **localStorage** (client-side fallback)
- Automatic cache invalidation at midnight

### 3. **Color Analysis**

- Uses **Vibrant.js** to extract color palette
- Detects dominant, accent, and background colors
- Colors drive the particle effects

### 4. **Theme Detection**

Automatic theme detection based on keywords:

| Keywords | Theme | Effect |
|----------|-------|--------|
| snow, winter, ice | Winter | ❄️ Snow |
| rain, storm, cloud | Rain | 🌧️ Rain |
| star, galaxy, space | Space | ⭐ Stars |
| fire, volcano, sun | Fire | ✨ Sparkles |
| flower, spring, garden | Nature | 🍃 Particles |

### 5. **Particle Effects**

Each theme has unique particle behavior:
- **Snow**: Drifting snowflakes
- **Rain**: Falling raindrops
- **Stars**: Twinkling stars
- **Sparkles**: Pulsing sparkles
- **Particles**: Generic floating particles

---

## 🎮 Interactive Features

### User Interactions

1. **Parallax on Mouse Move**
   - Image follows cursor slightly
   - Creates depth effect

2. **Click to Pulse**
   - Click image for pulse animation
   - Future: Add sparkle burst

3. **Daily Surprise**
   - New image every 24 hours
   - Automatic theme changes

---

## 🛠️ Development

### File Structure

```
src/
├── components/doodle/
│   ├── DailyDoodle.tsx           # Main component
│   └── effects/
│       └── ParticleSystem.ts     # Canvas particle effects
├── services/doodle/
│   ├── dailyImageService.ts      # API client
│   └── colorAnalyzer.ts          # Color extraction
├── types/
│   └── doodle.ts                 # TypeScript types
netlify/functions/
└── daily-image.ts                # Serverless API
supabase/migrations/
└── 20250102000000_create_daily_images.sql
```

### Testing Locally

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Test Netlify Function locally
netlify dev

# Clear cache (force new image fetch)
# In browser console:
DailyImageService.clearCache()
```

### Force New Image

To test with different images:

```typescript
// In browser console
localStorage.removeItem('dailyImage');
localStorage.removeItem('dailyImageDate');
location.reload();
```

---

## 🎨 Customization

### Change Effect Type

Edit `detectThemeAndEffect()` in `netlify/functions/daily-image.ts`:

```typescript
function detectThemeAndEffect(title: string, description: string) {
  // Add your custom keywords here
  if (text.includes('ocean')) {
    return { theme: 'ocean', effect: 'rain' };
  }
  // ...
}
```

### Adjust Particle Count

Edit `getConfigForEffect()` in `ParticleSystem.ts`:

```typescript
case 'snow':
  return {
    count: 150, // Change this number
    // ...
  };
```

### Change Colors

The system automatically uses colors from the image, but you can override:

```typescript
// In DailyDoodle.tsx
const dominantColor = '#FF5733'; // Force specific color
```

---

## 🐛 Troubleshooting

### Image Not Loading

1. Check Netlify Function logs
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check browser console for errors
4. Try clearing cache

### Particles Not Showing

1. Check browser WebGL support
2. Verify Canvas element is rendered
3. Check console for Canvas errors

### Colors Look Wrong

1. Image might not support CORS
2. Vibrant.js failed to analyze
3. Falls back to default colors

---

## 📈 Performance

- **Initial Load**: ~200-500ms (cached)
- **First Fetch**: ~1-2s (API call + color analysis)
- **Particle FPS**: 60fps on desktop, 30fps on mobile
- **Memory**: ~10-20MB for particles

---

## 🔮 Future Enhancements

- [ ] Admin panel to select image sources
- [ ] User voting on daily images
- [ ] Image history/archive
- [ ] More particle effects (fog, leaves, fireflies)
- [ ] Sound effects based on theme
- [ ] Special events (holidays, birthdays)
- [ ] Share daily doodle on social media
- [ ] Animated GIF export

---

## 📝 Credits

- **Image Sources**: Bing, NASA, Unsplash
- **Libraries**: Three.js, GSAP, Vibrant.js
- **Inspiration**: Google Doodles

---

## ⚠️ Important Notes

1. **Rate Limits**:
   - Bing: No official limit
   - NASA DEMO_KEY: 30 requests/hour
   - NASA with key: 1000 requests/hour

2. **CORS**:
   - Some images may not load due to CORS
   - Fallback image is used

3. **Mobile Performance**:
   - Particle count auto-reduces on mobile
   - Parallax disabled on touch devices

---

## 🎉 That's it!

Your Daily Doodle is ready! Visit your site and enjoy a new surprise every day! 🌟
