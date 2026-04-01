#!/bin/bash
# Generate cover images for projects missing covers
# Calls Gemini 3 Pro Image Preview API directly (same as process-image edge function)
#
# Usage: ./scripts/generate-project-covers.sh
# Requires: GOOGLE_API_KEY env var (or in .env.local)
# Dependencies: node, curl, base64

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load env vars from .env.local if exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  export $(grep -E '^GOOGLE_API_KEY=' "$PROJECT_ROOT/.env.local" | xargs 2>/dev/null) || true
fi

GOOGLE_API_KEY="${GOOGLE_API_KEY:-}"

if [ -z "$GOOGLE_API_KEY" ]; then
  echo "Error: GOOGLE_API_KEY must be set (in env or .env.local)"
  exit 1
fi

OUTPUT_DIR="$PROJECT_ROOT/public/images/projects"
mkdir -p "$OUTPUT_DIR"

MODEL="gemini-3-pro-image-preview"
ENDPOINT="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"

# Node-based JSON helper (replaces jq)
njq() {
  node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const r=eval('('+process.argv[1]+')')(JSON.parse(d));process.stdout.write(String(r??''))}catch(e){process.stdout.write('')}})" "$1"
}

generate_cover() {
  local project_id="$1"
  local filename="$2"
  local prompt="$3"
  local output_path="$OUTPUT_DIR/$filename"

  if [ -f "$output_path" ]; then
    echo "[$project_id] Cover already exists — skipping"
    return 0
  fi

  echo "[$project_id] Generating cover image with $MODEL..."

  # Build request body via node
  local request_body
  request_body=$(node -e "
    const prompt = process.argv[1];
    const full = \`CRITICAL QUALITY REQUIREMENTS:
- Generate in highest possible resolution (8K quality)
- Use vibrant, saturated colors with strong contrast
- Ensure all details are sharp and crisp, no blur or artifacts
- Apply professional studio lighting with soft shadows
- Create rich textures and depth with photorealistic materials
- Use dynamic color range for visual impact

ALL text on the image must be in ENGLISH. No Norwegian or Ukrainian text.

BRANDING ELEMENTS (small, subtle, do not distract):
- Bottom-left corner: small date text \"April 1, 2026\"
- Bottom-right corner: small watermark \"vitalii.no\"

Generate a professional tech product hero image.

Visual concept: \${prompt}

Style: Modern, professional, 16:9 landscape (wide horizontal format).
IMPORTANT: The image MUST be in 16:9 aspect ratio.

REMINDER: All text on the image must be in ENGLISH. No Norwegian or Ukrainian text!\`;
    console.log(JSON.stringify({
      contents: [{ parts: [{ text: full }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
    }));
  " "$prompt")

  local response
  response=$(curl -s --max-time 90 \
    "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "x-goog-api-key: $GOOGLE_API_KEY" \
    -d "$request_body")

  # Parse response with node
  local result
  result=$(echo "$response" | node -e "
    let d='';
    process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      try {
        const r = JSON.parse(d);
        if (r.error) { console.log('ERROR:' + r.error.message); return; }
        const candidate = r.candidates?.[0];
        if (candidate?.finishReason === 'IMAGE_OTHER') { console.log('ERROR:Content policy blocked'); return; }
        const parts = candidate?.content?.parts || [];
        for (const p of parts) {
          const img = p.inlineData || p.inline_data;
          if (img?.data) { console.log('IMAGE:' + img.data); return; }
        }
        const textParts = parts.filter(p=>p.text).map(p=>p.text.substring(0,100));
        console.log('ERROR:No image in response. Text: ' + textParts.join('; '));
      } catch(e) { console.log('ERROR:JSON parse failed: ' + e.message); }
    });
  ")

  if [[ "$result" == ERROR:* ]]; then
    echo "[$project_id] ${result}"
    return 1
  fi

  if [[ "$result" == IMAGE:* ]]; then
    local image_data="${result#IMAGE:}"
    echo "$image_data" | base64 -d > "$output_path"
    local file_size
    file_size=$(stat -c%s "$output_path" 2>/dev/null || stat -f%z "$output_path" 2>/dev/null || echo "?")
    echo "[$project_id] Saved: $filename ($file_size bytes)"
    return 0
  fi

  echo "[$project_id] ERROR: Unexpected response"
  return 1
}

echo "=== Generating missing project covers ==="
echo ""

generate_cover "eyeplus" "eyeplus-cover.jpg" \
  "Eye+ Camera Cloud — a cloud-based security camera monitoring platform. Show a sleek modern dashboard interface on a large monitor displaying a grid of 6 security camera feeds with live status indicators, in a dark control room with subtle blue ambient lighting. Include a cloud icon with streaming data particles connecting the cameras. Clean, corporate, futuristic. Style: dark theme UI mockup with glowing cyan and white accents. 16:9 landscape."

echo ""

generate_cover "lingleverika" "lingleverika-cover.jpg" \
  "Lingva AI — an AI-powered video translation and understanding platform. Show a video player interface with real-time subtitle translation happening across multiple languages, with speech waveform visualization below the video. Multiple language flags (English, Norwegian, Arabic, Somali) as holographic badges. Dark gradient background with purple and blue tones. Style: modern AI SaaS product screenshot mockup. 16:9 landscape."

echo ""

generate_cover "youtube_manager" "youtube-manager-cover.jpg" \
  "YouTube Channel Manager — an automated YouTube channel management and content publishing system. Show a dashboard with YouTube video queue, scheduled uploads timeline, analytics charts (views, subscribers graph), and a Remotion video render preview panel. Red and white YouTube branding accents on a dark background. Gear/automation icons suggesting scheduled workflows. Style: dark theme admin dashboard mockup. 16:9 landscape."

echo ""
echo "=== Done ==="
