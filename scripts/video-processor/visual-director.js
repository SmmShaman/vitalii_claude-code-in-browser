/**
 * Visual Director — phrase-level visual planning for DailyNewsShow.
 *
 * Analyses each segment's voiceover script and generates a visual plan:
 * - Splits text into phrases (2-4 second blocks) using subtitle timestamps
 * - Maps each phrase to a visual metaphor and effect
 * - Extracts numeric data for animated infographics (dataOverlays)
 * - Ensures variety between adjacent segments AND adjacent blocks
 *
 * Pipeline position: AFTER voiceover generation, BEFORE Remotion render.
 *
 * Usage:
 *   import { directVisuals } from './visual-director.js';
 *   const directives = await directVisuals(segmentScripts, segments, segmentVoiceovers);
 *   // directives[i] → { mood, transition, textReveal, visualBlocks[], dataOverlays[], ... }
 */

// ── Available options (must match design-system constants) ──

const MOODS = [
  'urgent', 'energetic', 'positive', 'analytical',
  'serious', 'contemplative', 'lighthearted', 'cautionary',
];

const TRANSITIONS = [
  'fade', 'wipeLeft', 'wipeRight', 'slideUp', 'slideDown',
  'zoomIn', 'zoomOut', 'filmBurn', 'glitchWipe',
];

const TEXT_EFFECTS = ['typewriter', 'fadeUp', 'blurReveal', 'springPop', 'splitScale'];

const HEADLINE_REVEALS = ['default', 'typewriter', 'splitFade', 'splitScale'];

const STATS_VISUAL_TYPES = ['list', 'counters', 'bars'];

const BACKGROUND_EFFECTS = ['kenBurns', 'zoomPulse', 'slowPan', 'colorShift'];

// ── Category → preferred mood/transition ──

const CATEGORY_MOOD_MAP = {
  tech:     ['energetic', 'analytical'],
  business: ['analytical', 'serious'],
  ai:       ['energetic', 'contemplative'],
  startup:  ['energetic', 'positive'],
  science:  ['analytical', 'contemplative'],
  politics: ['serious', 'cautionary'],
  crypto:   ['urgent', 'cautionary'],
  health:   ['serious', 'positive'],
  news:     ['positive', 'serious'],
};

const CATEGORY_TRANSITION_MAP = {
  tech:     ['wipeLeft', 'glitchWipe'],
  business: ['slideUp', 'fade'],
  ai:       ['glitchWipe', 'zoomIn'],
  startup:  ['wipeLeft', 'zoomIn'],
  science:  ['fade', 'slideUp'],
  politics: ['wipeRight', 'filmBurn'],
  crypto:   ['glitchWipe', 'zoomIn'],
  health:   ['fade', 'slideDown'],
  news:     ['fade', 'wipeLeft'],
};

// ── Keyword patterns for phrase classification (Norwegian + English) ──

const KEYWORD_PATTERNS = {
  numbers: /(\d+[\.,]?\d*)\s*(%|prosent|percent|millioner|milliarder|kroner|dollar|euro|brukere|users|ganger|times)/i,
  comparison: /(sammenlignet med|compared to|versus|vs\.?|fra\s+\d+.*?til\s+\d+|from\s+\d+.*?to\s+\d+|økte?\s+fra|reduced from|dobl|tredobl|halvert)/i,
  growth: /(vokser|vekst|øk[te]*|økning|increase|growth|rising|expanding|dobl|tredobl|oppsving|boost|surge|rekord|record|lansert|launch)/i,
  decline: /(fall[er]*|nedgang|reduksjon|decrease|decline|drop|falling|shrink|kutt|cuts|layoff|lost|mist[et]*|taper)/i,
  list: /(for det første|for det andre|for det tredje|firstly|secondly|thirdly|blant annet|including|several|mange|multiple|tre ting|three|four|five|fire|fem)/i,
  technology: /(teknologi|software|hardware|kunstig intelligens|algoritme|maskinlæring|machine learning|robot|automasjon|digital|chip|prosessor|GPU|server|cloud|sky|kode|plattform)/i,
  geography: /(land|country|region|verden|world|global|europa|europe|asia|amerika|america|norge|norway|kina|china|usa|india|japan|storbritannia|uk)/i,
  timeline: /(innen\s+\d{4}|by\s+\d{4}|neste år|next year|i fremtiden|in the future|planlegger|plans? to|roadmap|milestone|fase|phase|Q[1-4]\s+\d{4})/i,
  focus: /(spesielt|especially|særlig|notably|viktigst|most importantly|nøkkelen|the key|fokus|focus|sentral|central|hovedsakelig|primarily)/i,
  urgency: /(umiddelbart|immediately|breaking|akutt|kritisk|critical|haster|urgent|rask|quick|plutselig|suddenly|nå må|must now)/i,
};

// ── Metaphor → preferred text/background effects ──

const METAPHOR_TEXT_EFFECTS = {
  data:        ['springPop', 'fadeUp'],
  comparison:  ['splitScale', 'fadeUp'],
  growth:      ['springPop', 'blurReveal'],
  decline:     ['fadeUp', 'typewriter'],
  enumeration: ['fadeUp', 'splitScale'],
  technology:  ['blurReveal', 'typewriter'],
  geography:   ['fadeUp', 'blurReveal'],
  timeline:    ['typewriter', 'fadeUp'],
  focus:       ['springPop', 'blurReveal'],
  urgency:     ['springPop', 'typewriter'],
  narrative:   ['fadeUp', 'blurReveal', 'springPop'],
};

const METAPHOR_BG_EFFECTS = {
  data:        ['zoomPulse', 'static'],
  comparison:  ['slowPan', 'static'],
  growth:      ['kenBurns', 'zoomPulse'],
  decline:     ['slowPan', 'colorShift'],
  enumeration: ['static', 'kenBurns'],
  technology:  ['colorShift', 'zoomPulse'],
  geography:   ['kenBurns', 'slowPan'],
  timeline:    ['slowPan', 'kenBurns'],
  focus:       ['zoomPulse', 'kenBurns'],
  urgency:     ['zoomPulse', 'colorShift'],
  narrative:   ['kenBurns', 'slowPan'],
};

// ═══════════════════════════════════════════════════════════════════
//  Variety Tracker — ensures no two adjacent picks are the same
// ═══════════════════════════════════════════════════════════════════

class VarietyTracker {
  constructor() {
    /** @type {Record<string, string>} last value per dimension */
    this.last = {};
  }

  /**
   * Pick a value from `options` that differs from the last pick
   * for the given dimension. If `preferred` is valid and different
   * from last, use it; otherwise pick randomly from remaining.
   */
  pick(dimension, options, preferred = null) {
    const prev = this.last[dimension];
    let pool = prev ? options.filter(o => o !== prev) : [...options];
    if (pool.length === 0) pool = [...options];

    if (preferred && pool.includes(preferred)) {
      this.last[dimension] = preferred;
      return preferred;
    }

    const choice = pool[Math.floor(Math.random() * pool.length)];
    this.last[dimension] = choice;
    return choice;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Phrase Splitting — timestamps → 2-4 second blocks
// ═══════════════════════════════════════════════════════════════════

/**
 * Split a voiceover script into phrases using subtitle word timestamps.
 * Each phrase targets ~3 seconds of narration.
 *
 * @param {string}   scriptText       Full script text
 * @param {Array}    subtitles        [{text, startTime, endTime}, ...]
 * @param {number}   targetDuration   Seconds per phrase (default 3)
 * @returns {Array}  [{text, startTime, endTime, duration}, ...]
 */
function splitIntoPhrases(scriptText, subtitles, targetDuration = 3) {
  if (!subtitles || subtitles.length === 0) {
    return splitBySentences(scriptText);
  }

  const phrases = [];
  let buf = { words: [], start: 0, end: 0 };

  for (let i = 0; i < subtitles.length; i++) {
    const s = subtitles[i];
    if (buf.words.length === 0) buf.start = s.startTime;
    buf.words.push(s.text);
    buf.end = s.endTime;

    const dur = buf.end - buf.start;
    const word = s.text;
    const isSentenceEnd = /[.!?]$/.test(word);
    const isNaturalBreak = /[,;:]$/.test(word);

    const shouldSplit =
      (isSentenceEnd && dur >= 1.5) ||
      (isNaturalBreak && dur >= targetDuration) ||
      (dur >= 5);

    if (shouldSplit) {
      phrases.push({
        text: buf.words.join(' '),
        startTime: buf.start,
        endTime: buf.end,
        duration: buf.end - buf.start,
      });
      buf = { words: [], start: 0, end: 0 };
    }
  }

  // Flush remaining words
  if (buf.words.length > 0) {
    phrases.push({
      text: buf.words.join(' '),
      startTime: buf.start,
      endTime: buf.end,
      duration: buf.end - buf.start,
    });
  }

  return mergeTinyPhrases(phrases, 1.5);
}

/** Fallback: split by sentences when no timestamps available. */
function splitBySentences(text) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const WPS = 2; // words per second (TTS average)
  let t = 0;

  return sentences.map(raw => {
    const s = raw.trim();
    const dur = s.split(/\s+/).length / WPS;
    const phrase = { text: s, startTime: t, endTime: t + dur, duration: dur };
    t += dur;
    return phrase;
  });
}

/** Merge phrases shorter than `minDur` seconds with their neighbour. */
function mergeTinyPhrases(phrases, minDur) {
  if (phrases.length <= 1) return phrases;
  const out = [];
  let i = 0;

  while (i < phrases.length) {
    const cur = { ...phrases[i] };
    while (cur.duration < minDur && i + 1 < phrases.length) {
      i++;
      cur.text += ' ' + phrases[i].text;
      cur.endTime = phrases[i].endTime;
      cur.duration = cur.endTime - cur.startTime;
    }
    out.push(cur);
    i++;
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════════
//  Phrase Classification (heuristic)
// ═══════════════════════════════════════════════════════════════════

/**
 * Classify a phrase's dominant visual metaphor.
 * Returns { metaphor, graphicType }.
 */
function classifyPhrase(text) {
  const lc = text.toLowerCase();

  if (KEYWORD_PATTERNS.numbers.test(lc))    return { metaphor: 'data', graphicType: 'counter' };
  if (KEYWORD_PATTERNS.comparison.test(lc)) return { metaphor: 'comparison', graphicType: 'comparison' };
  if (KEYWORD_PATTERNS.growth.test(lc))     return { metaphor: 'growth', graphicType: 'keyFigure' };
  if (KEYWORD_PATTERNS.decline.test(lc))    return { metaphor: 'decline', graphicType: 'keyFigure' };
  if (KEYWORD_PATTERNS.list.test(lc))       return { metaphor: 'enumeration', graphicType: 'bulletList' };
  if (KEYWORD_PATTERNS.technology.test(lc)) return { metaphor: 'technology', graphicType: 'none' };
  if (KEYWORD_PATTERNS.geography.test(lc))  return { metaphor: 'geography', graphicType: 'none' };
  if (KEYWORD_PATTERNS.timeline.test(lc))   return { metaphor: 'timeline', graphicType: 'none' };
  if (KEYWORD_PATTERNS.focus.test(lc))      return { metaphor: 'focus', graphicType: 'none' };
  if (KEYWORD_PATTERNS.urgency.test(lc))    return { metaphor: 'urgency', graphicType: 'none' };

  return { metaphor: 'narrative', graphicType: 'none' };
}

// ═══════════════════════════════════════════════════════════════════
//  Data Extraction — pull numbers for infographic overlays
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract numeric data points from a phrase.
 * Returns an array of { type, value, label, raw, ... } objects.
 */
function extractDataPoints(text) {
  const pts = [];
  let m;

  // Percentages: "87%", "87 prosent"
  const pctRe = /(\d+[\.,]?\d*)\s*(%|prosent|percent)/gi;
  while ((m = pctRe.exec(text)) !== null) {
    pts.push({ type: 'percentage', value: m[1].replace(',', '.'), unit: '%', raw: m[0] });
  }

  // Comparisons: "from X to Y" / "fra X til Y"
  const cmpRe = /(?:fra|from)\s+(\d+[\.,]?\d*)\s*(%|prosent|percent)?\s+(?:til|to)\s+(\d+[\.,]?\d*)\s*(%|prosent|percent)?/gi;
  while ((m = cmpRe.exec(text)) !== null) {
    pts.push({
      type: 'comparison',
      from: m[1].replace(',', '.'),
      to: m[3].replace(',', '.'),
      unit: m[2] || m[4] || '',
      raw: m[0],
    });
  }

  // Money: "$5M", "50 millioner kroner"
  const monRe = /(?:\$\s*[\d,.]+(?:\s*(?:million|billion|trillion))?|(\d+[\.,]?\d*)\s*(millioner|milliarder|tusen|kroner|dollar|euro)(?:\s*(kroner|dollar|euro))?)/gi;
  while ((m = monRe.exec(text)) !== null) {
    pts.push({ type: 'money', value: m[0].trim(), raw: m[0] });
  }

  // Counts: "5000 brukere", "2.5 million users"
  const cntRe = /(\d+[\.,]?\d*)\s*(millioner?|milliarder?|million|billion|thousand|tusen)?\s*(brukere|users|enheter|devices|selskaper|companies|ansatte|employees|land|countries|kunder|customers)/gi;
  while ((m = cntRe.exec(text)) !== null) {
    pts.push({ type: 'count', value: m[0].trim(), raw: m[0] });
  }

  return pts;
}

/**
 * Convert a data point into a DataOverlayItem for InfoGraphicOverlay.
 *
 * @param {object}  dp          Extracted data point
 * @param {number}  showAt      0-1 fraction of segment
 * @param {number}  hideAt      0-1 fraction of segment
 * @param {string}  position    'left' | 'right'
 */
function dataPointToOverlay(dp, showAt, hideAt, position) {
  if (dp.type === 'percentage') {
    return {
      type: 'keyFigure',
      showAt, hideAt, position,
      data: {
        value: dp.value + '%',
        label: '',
        trend: parseFloat(dp.value) > 50 ? 'up' : 'neutral',
      },
    };
  }
  if (dp.type === 'comparison') {
    const u = dp.unit === '%' || dp.unit === 'prosent' || dp.unit === 'percent' ? '%' : '';
    return {
      type: 'comparison',
      showAt, hideAt, position,
      data: {
        left:  { label: 'Før', value: dp.from + u },
        right: { label: 'Nå',  value: dp.to + u },
      },
    };
  }
  if (dp.type === 'money' || dp.type === 'count') {
    return {
      type: 'keyFigure',
      showAt, hideAt, position,
      data: { value: dp.value, label: '', trend: 'neutral' },
    };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
//  AI Visual Director (Azure OpenAI)
// ═══════════════════════════════════════════════════════════════════

async function aiDirectVisuals(segmentScripts, segments) {
  const AZURE_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
  const AZURE_KEY = process.env.AZURE_OPENAI_API_KEY;
  const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'Jobbot-gpt-4.1-mini';

  if (!AZURE_ENDPOINT || !AZURE_KEY) return null;

  const segDescs = segmentScripts.map((script, i) => {
    const seg = segments[i] || {};
    return `SEGMENT ${i + 1} [${seg.category || 'news'}]:\n${script}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a cinematic Visual Director for a news video digest. You think in SCENES, not slides. Each phrase of narration becomes a unique visual moment with specific effects, animations, and motion graphics.

Given ${segmentScripts.length} voiceover scripts, create a detailed SCENE-BY-SCENE visual plan.

For each segment, split the script into phrases (3-4 seconds each) and for EACH phrase write:
1. "text" — the exact phrase from the script
2. "sceneDescription" — DETAILED cinematic description: what appears on screen, what animates, what transforms. Be SPECIFIC: "3D wireframe globe rotating with neon grid, light pulses moving across surface" NOT "globe animation".
3. "renderHint" — specific Remotion implementation hints: which effects, transforms, interpolations to use.
4. "metaphor" — the visual metaphor category
5. "textEffect" — how the phrase text animates on screen
6. "graphicType" + "graphicData" — if numbers present, extract for animated infographics
7. "backgroundEffect" — how the background behaves
8. "triggerImageChange" — cycle to next image

VISUAL THINKING GUIDE — translate MEANING into MOTION:
- Numbers/stats → animated counters ticking up, bar charts growing with spring, dashboard panels
- Comparisons → split-screen with animated divider, before/after dissolve, A→B transformation
- Growth/launch → scale-up from center, particle burst, icons assembling
- Decline/crisis → elements shattering into particles, red color shift, vignette darkening
- Technology/AI → glitch effects, data streams, Matrix-style code rain, circuit board patterns
- Geography/global → panning across regions, map highlights, flags appearing
- Lists/multiple items → staggered icon parade, items popping in one by one
- Urgency/breaking → rapid cuts, screen shake, alert pulses, red accent flashes
- Transition/change → morph dissolve old→new, pixel reassembly, shape transformation

SCENE DESCRIPTION EXAMPLES:
- GOOD: "Split screen with glass divider. Left: factory conveyor SVG with robotic arm. Right: dashboard with bar charts growing spring-animated, counter ticking 0→87%. Divider pulses accent color."
- BAD: "Shows manufacturing and marketing data"
- GOOD: "Large '8.6 milliarder' text center-screen with counter tick-up animation. Background: architectural blueprint wireframe rotating slowly. Glass card slides in from right showing cost breakdown bar chart."
- BAD: "Displays the budget number"

VARIETY RULES:
- Adjacent segments MUST differ in mood, transition, textReveal
- Adjacent phrases MUST differ in textEffect and backgroundEffect
- Every phrase must have a UNIQUE visual treatment — no two scenes look the same

Available values:
- mood: ${MOODS.join(', ')}
- transition: ${TRANSITIONS.join(', ')}
- textReveal: ${HEADLINE_REVEALS.join(', ')}
- textEffect: ${TEXT_EFFECTS.join(', ')}
- graphicType: counter | barChart | comparison | bulletList | keyFigure | none
- backgroundEffect: ${BACKGROUND_EFFECTS.join(', ')}

Output JSON:
{
  "segments": [
    {
      "mood": "...",
      "transition": "...",
      "textReveal": "...",
      "statsVisualType": "list|counters|bars",
      "phrases": [
        {
          "text": "exact phrase from script",
          "sceneDescription": "Detailed cinematic description of what appears on screen...",
          "renderHint": "Remotion implementation: interpolate scale 0→1 with spring(damping:10), CSS filter hue-rotate, particles rate 0.8...",
          "metaphor": "data|comparison|growth|decline|technology|geography|urgency|narrative",
          "textEffect": "typewriter|fadeUp|blurReveal|springPop|splitScale",
          "graphicType": "counter|keyFigure|comparison|barChart|bulletList|none",
          "graphicData": { "value": "87%", "label": "Markedsandel" },
          "backgroundEffect": "kenBurns|zoomPulse|slowPan|colorShift",
          "triggerImageChange": true
        }
      ]
    }
  ]
}

Rules:
- sceneDescription MUST be detailed and cinematic — minimum 2 sentences per phrase
- graphicData only when graphicType ≠ "none", values from ACTUAL script text only
- triggerImageChange ≈ true every other phrase
- renderHint should reference Remotion primitives: interpolate, spring, CSS filter, opacity, scale, translateX/Y`;

  try {
    const url = `${AZURE_ENDPOINT}/openai/deployments/${DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': AZURE_KEY },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate visual directives:\n\n${segDescs}` },
        ],
        temperature: 0.6,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) throw new Error(`Azure ${res.status}: ${await res.text()}`);

    const json = await res.json();
    const raw = json.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty AI response');

    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed)
      ? parsed
      : (parsed.segments || parsed.directives || []);

    if (arr.length === 0) throw new Error('Empty directives array');

    const usage = json.usage;
    if (usage) {
      console.log(`  💰 Visual Director tokens: ${usage.prompt_tokens} in + ${usage.completion_tokens} out`);
    }
    return arr;

  } catch (err) {
    console.error(`  ⚠️ AI Visual Director failed: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Fallback Visual Director (heuristic, no AI)
// ═══════════════════════════════════════════════════════════════════

function fallbackDirectVisuals(segmentScripts, segments, segmentVoiceovers) {
  const segTracker = new VarietyTracker();
  const result = [];
  const totalSegs = segmentScripts.length;

  for (let i = 0; i < totalSegs; i++) {
    const script = segmentScripts[i] || '';
    const seg = segments[i] || {};
    const subs = segmentVoiceovers[i]?.subtitles || [];
    const segDur = seg.durationSeconds || Number(segmentVoiceovers[i]?.durationSeconds) || 15;

    // ── Rhythm system: phrase duration adapts to position in show ──
    // Early segments → longer blocks (3.5s), later → shorter blocks (2s)
    // Creates natural acceleration through the show
    const positionRatio = totalSegs > 1 ? i / (totalSegs - 1) : 0;
    const rhythmTarget = 3.5 - positionRatio * 1.5; // 3.5s → 2.0s

    // 1. Split into phrases (rhythm-adjusted target duration)
    const phrases = splitIntoPhrases(script, subs, rhythmTarget);

    // 2. Classify each phrase + extract data
    const blockTracker = new VarietyTracker();
    const visualBlocks = phrases.map((phrase, j) => {
      const cls = classifyPhrase(phrase.text);
      const dataPoints = extractDataPoints(phrase.text);

      // Pick text effect (variety-ensured within segment)
      const teOpts = METAPHOR_TEXT_EFFECTS[cls.metaphor] || TEXT_EFFECTS;
      const textEffect = blockTracker.pick('te', teOpts);

      // Pick background effect (variety-ensured within segment)
      const bgOpts = METAPHOR_BG_EFFECTS[cls.metaphor] || BACKGROUND_EFFECTS;
      const backgroundEffect = blockTracker.pick('bg', bgOpts);

      // Resolve graphic data from actual extracted numbers
      let graphicType = cls.graphicType;
      let graphicData = null;

      if (graphicType !== 'none' && dataPoints.length > 0) {
        const dp = dataPoints[0];
        if (dp.type === 'percentage') {
          graphicType = 'counter';
          graphicData = { value: dp.value + '%', label: '' };
        } else if (dp.type === 'comparison') {
          graphicType = 'comparison';
          const u = (dp.unit === '%' || dp.unit === 'prosent') ? '%' : '';
          graphicData = {
            left:  { label: 'Før', value: dp.from + u },
            right: { label: 'Nå',  value: dp.to + u },
          };
        } else if (dp.type === 'money' || dp.type === 'count') {
          graphicType = 'keyFigure';
          graphicData = { value: dp.value, label: '' };
        }
      } else if (graphicType !== 'none' && dataPoints.length === 0) {
        // Keyword matched but no actual numbers — skip empty infographic
        graphicType = 'none';
      }

      return {
        phraseText: phrase.text,
        startTime: phrase.startTime,
        endTime: phrase.endTime,
        duration: phrase.duration,
        visualMetaphor: cls.metaphor,
        textEffect,
        graphicType,
        graphicData,
        backgroundEffect,
        triggerImageChange: j > 0 && j % 2 === 0,
      };
    });

    // 3. Segment-level directives (variety across segments)
    const cat = seg.category || 'news';
    const moodOpts = CATEGORY_MOOD_MAP[cat] || MOODS.slice(0, 4);
    const transOpts = CATEGORY_TRANSITION_MAP[cat] || TRANSITIONS.slice(0, 4);

    const mood = segTracker.pick('mood', moodOpts, seg.mood);
    const transition = segTracker.pick('transition', transOpts, seg.transition);
    const textReveal = segTracker.pick('textReveal', HEADLINE_REVEALS);
    const statsVisualType = segTracker.pick('statsViz', STATS_VISUAL_TYPES);

    // 4. Extract facts for StatsScene
    const allDp = phrases.flatMap(p => extractDataPoints(p.text));
    const facts = allDp
      .filter(dp => dp.type === 'percentage' || dp.type === 'money')
      .slice(0, 3)
      .map(dp => ({
        value: dp.type === 'percentage' ? dp.value + '%' : dp.value,
        label: dp.raw,
      }));

    // 5. Build dataOverlays from blocks with data
    const dataOverlays = [];
    for (let j = 0; j < visualBlocks.length; j++) {
      const blk = visualBlocks[j];
      if (blk.graphicType === 'none' || !blk.graphicData) continue;

      const showAt = Math.max(0, blk.startTime / segDur - 0.02);
      const hideAt = Math.min(1, blk.endTime / segDur + 0.02);
      const position = dataOverlays.length % 2 === 0 ? 'right' : 'left';

      const overlayType = blk.graphicType === 'counter' ? 'keyFigure' : blk.graphicType;
      dataOverlays.push({
        type: overlayType,
        showAt, hideAt, position,
        data: blk.graphicData,
      });
    }

    // 6. Faster image cycling: adapt to number of visual blocks
    const imageCycleDuration = Math.max(2, Math.min(4,
      Math.round(segDur / Math.max(visualBlocks.length, 3)),
    ));

    result.push({
      mood,
      transition,
      textReveal,
      statsVisualType,
      facts: facts.length > 0 ? facts : undefined,
      dataOverlays,
      imageCycleDuration,
      visualBlocks,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
//  Post-processing: guarantee cross-segment & intra-block variety
// ═══════════════════════════════════════════════════════════════════

function ensureVariety(directives) {
  // Cross-segment variety
  for (let i = 1; i < directives.length; i++) {
    const prev = directives[i - 1];
    const curr = directives[i];

    if (curr.transition === prev.transition) {
      const pool = TRANSITIONS.filter(t => t !== prev.transition);
      curr.transition = pool[Math.floor(Math.random() * pool.length)];
    }
    if (curr.mood === prev.mood) {
      const pool = MOODS.filter(m => m !== prev.mood);
      curr.mood = pool[Math.floor(Math.random() * pool.length)];
    }
    if (curr.textReveal === prev.textReveal) {
      const pool = HEADLINE_REVEALS.filter(r => r !== prev.textReveal);
      curr.textReveal = pool[Math.floor(Math.random() * pool.length)];
    }
    if (curr.statsVisualType === prev.statsVisualType) {
      const pool = STATS_VISUAL_TYPES.filter(s => s !== prev.statsVisualType);
      curr.statsVisualType = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  // Intra-block variety (adjacent blocks within each segment)
  for (const dir of directives) {
    if (!dir.visualBlocks) continue;
    for (let j = 1; j < dir.visualBlocks.length; j++) {
      const prev = dir.visualBlocks[j - 1];
      const curr = dir.visualBlocks[j];

      if (curr.textEffect === prev.textEffect) {
        const pool = TEXT_EFFECTS.filter(e => e !== prev.textEffect);
        curr.textEffect = pool[Math.floor(Math.random() * pool.length)];
      }
      if (curr.backgroundEffect === prev.backgroundEffect) {
        const pool = BACKGROUND_EFFECTS.filter(e => e !== prev.backgroundEffect);
        curr.backgroundEffect = pool[Math.floor(Math.random() * pool.length)];
      }
    }
  }

  return directives;
}

// ═══════════════════════════════════════════════════════════════════
//  Merge AI phrases with subtitle timestamps
// ═══════════════════════════════════════════════════════════════════

/**
 * AI returns phrases without precise timestamps.
 * We align them with subtitle-based phrase boundaries.
 */
function mergeAIWithTimestamps(aiDirective, scriptText, subtitles) {
  const timedPhrases = splitIntoPhrases(scriptText, subtitles);
  const aiPhrases = aiDirective.phrases || [];

  const visualBlocks = timedPhrases.map((tp, j) => {
    // Pick the closest AI phrase (by index, since order should match)
    const ap = aiPhrases[j] || aiPhrases[aiPhrases.length - 1] || {};
    return {
      phraseText: tp.text,
      startTime: tp.startTime,
      endTime: tp.endTime,
      duration: tp.duration,
      sceneDescription: ap.sceneDescription || '',
      renderHint: ap.renderHint || '',
      visualMetaphor: ap.metaphor || 'narrative',
      textEffect: ap.textEffect || 'fadeUp',
      graphicType: ap.graphicType || 'none',
      graphicData: ap.graphicData || null,
      backgroundEffect: ap.backgroundEffect || 'kenBurns',
      triggerImageChange: ap.triggerImageChange ?? (j > 0 && j % 2 === 0),
    };
  });

  return visualBlocks;
}

/**
 * Build dataOverlays from visual blocks.
 */
function buildOverlaysFromBlocks(visualBlocks, segDuration) {
  const overlays = [];
  for (const blk of visualBlocks) {
    if (blk.graphicType === 'none' || !blk.graphicData) continue;

    const showAt = Math.max(0, blk.startTime / segDuration - 0.02);
    const hideAt = Math.min(1, blk.endTime / segDuration + 0.02);
    const position = overlays.length % 2 === 0 ? 'right' : 'left';
    const overlayType = blk.graphicType === 'counter' ? 'keyFigure' : blk.graphicType;

    overlays.push({ type: overlayType, showAt, hideAt, position, data: blk.graphicData });
  }
  return overlays;
}

// ═══════════════════════════════════════════════════════════════════
//  Main Export
// ═══════════════════════════════════════════════════════════════════

/**
 * Generate visual directives for all segments of a DailyNewsShow.
 *
 * @param {string[]}  segmentScripts     Voiceover script per segment
 * @param {object[]}  segments           Segment metadata from AI director
 * @param {object[]}  segmentVoiceovers  TTS output per segment
 * @returns {Promise<object[]>}          Visual directives per segment
 */
export async function directVisuals(segmentScripts, segments, segmentVoiceovers) {
  console.log(`\n🎨 Visual Director: planning ${segmentScripts.length} segments...`);

  // Try AI path first
  let directives = await aiDirectVisuals(segmentScripts, segments);

  if (directives && directives.length >= segmentScripts.length) {
    console.log('  ✅ AI visual directives received');

    // Merge AI phrase classifications with subtitle timestamps
    for (let i = 0; i < directives.length; i++) {
      const subs = segmentVoiceovers[i]?.subtitles || [];
      const segDur = segments[i]?.durationSeconds ||
        Number(segmentVoiceovers[i]?.durationSeconds) || 15;

      directives[i].visualBlocks = mergeAIWithTimestamps(
        directives[i], segmentScripts[i], subs,
      );
      delete directives[i].phrases; // cleanup raw AI field

      // Build dataOverlays from blocks if AI didn't provide them
      if (!directives[i].dataOverlays || directives[i].dataOverlays.length === 0) {
        directives[i].dataOverlays = buildOverlaysFromBlocks(
          directives[i].visualBlocks, segDur,
        );
      }

      // Defaults
      directives[i].mood ??= 'positive';
      directives[i].transition ??= 'fade';
      directives[i].textReveal ??= 'default';
      directives[i].statsVisualType ??= 'list';

      // Image cycling adapted to block count
      const blockCount = directives[i].visualBlocks.length;
      directives[i].imageCycleDuration = Math.max(2, Math.min(4,
        Math.round(segDur / Math.max(blockCount, 3)),
      ));
    }
  } else {
    console.log('  📋 Using fallback visual director');
    directives = fallbackDirectVisuals(segmentScripts, segments, segmentVoiceovers);
  }

  // Post-process for guaranteed variety
  directives = ensureVariety(directives);

  // Summary
  for (let i = 0; i < directives.length; i++) {
    const d = directives[i];
    const blocks = d.visualBlocks ? d.visualBlocks.length : 0;
    const overlays = d.dataOverlays ? d.dataOverlays.length : 0;
    const metaphors = d.visualBlocks
      ? [...new Set(d.visualBlocks.map(b => b.visualMetaphor))].join(',')
      : '-';
    console.log(
      `  📊 Seg ${i + 1}: ${blocks} blocks, ${overlays} overlays ` +
      `| ${d.mood} | ${d.transition} | ${d.textReveal} | [${metaphors}]`,
    );
  }

  return directives;
}

// Also export internals for testing
export {
  splitIntoPhrases,
  classifyPhrase,
  extractDataPoints,
  VarietyTracker,
  ensureVariety,
  MOODS,
  TRANSITIONS,
  TEXT_EFFECTS,
  HEADLINE_REVEALS,
  STATS_VISUAL_TYPES,
  BACKGROUND_EFFECTS,
};
