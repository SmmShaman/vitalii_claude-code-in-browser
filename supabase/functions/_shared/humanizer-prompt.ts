/**
 * Humanizer Anti-AI Writing Rules — shared across all LLM text generation functions.
 *
 * Based on Wikipedia "Signs of AI writing" (WikiProject AI Cleanup, 29 patterns)
 * and blader/humanizer SKILL.md v2.5.1.
 *
 * 4 context-adapted rule sets + 3 voice guidelines.
 * Node.js mirror: scripts/video-processor/humanizer-rules.js (keep in sync)
 */

// ─── RULE SETS ──────────────────────────────────────────────────────────────────

export const HUMANIZER_SOCIAL = `
ANTI-AI WRITING RULES (CRITICAL — apply to ALL platforms):
Your output must read like a real person wrote it, not an AI. Eliminate every one of these patterns:

1. NO inflated significance: never use "testament to", "pivotal moment", "evolving landscape", "vital role", "indelible mark", "setting the stage", "key turning point".
2. NO notability emphasis: do not list media outlets or claim "active presence" — cite specific facts instead.
3. NO -ing tacking: never end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...", "contributing to...", "fostering...", "showcasing...".
4. NO promotional fluff: never use "groundbreaking", "vibrant", "stunning", "breathtaking", "nestled", "in the heart of", "renowned".
5. NO vague attributions: never write "Experts believe", "Industry observers note" — name the source or drop the claim.
6. NO challenges/prospects boilerplate: never write "Despite challenges... continues to thrive" or "Future Outlook" sections.
7. NO copula avoidance: use "is/are/has" instead of "serves as", "stands as", "represents", "marks", "boasts", "features".
8. NO negative parallelisms: never write "It's not just X; it's Y" or "Not only X but also Y".
9. NO rule of three: do not force ideas into groups of three for rhetorical effect.
10. NO synonym cycling: do not rotate synonyms for the same concept across sentences.
11. NO false ranges: do not use "from X to Y" where X and Y are not on a real scale.
12. NO passive voice when actor is known: prefer active constructions.
13. NO em dash overuse: maximum one per post. Use commas or periods instead.
14. NO bold headers in body: write flowing prose, not "**Label:** value" lists.
15. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "garner", "intricate", "tapestry", "underscore", "pivotal", "landscape" (abstract), "interplay", "additionally", "furthermore".
16. NO title case in headings: use sentence case.
17. NO sycophantic artifacts: never write "Great question!", "I hope this helps", "Let me know if...".
18. NO knowledge cutoff disclaimers: never write "as of", "based on available information", "while details are limited".
19. NO signposting: never write "Let's dive in", "Here's what you need to know", "Let's break this down".
20. NO filler phrases: cut "In order to", "Due to the fact that", "It is important to note that", "At this point in time".
21. NO excessive hedging: do not write "could potentially", "it might be argued that".
22. NO generic conclusions: never end with "the future looks bright", "exciting times lie ahead", "continues to thrive".
23. NO persuasive authority tropes: avoid "The real question is", "What really matters", "fundamentally", "at its core".
24. NO fragmented headers: do not follow a heading with a one-liner that restates it.
25. NO hyphenated-word overuse: vary naturally — do not consistently hyphenate common compounds.
26. NO emoji-as-structure: never use "rocket Launch", "bulb Insight", "check Next Steps" patterns.

FINAL CHECK: Before outputting, re-read and ask "What makes this obviously AI-generated?" Fix remaining tells.`

export const HUMANIZER_VIDEO = `
ANTI-AI SPEECH RULES (CRITICAL — this text will be read aloud):
Your output must sound like a real person speaking, not an AI script. Eliminate these patterns:

1. NO inflated significance: never say "testament to", "pivotal moment", "evolving landscape", "vital role", "key turning point".
2. NO -ing tacking: never end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...", "showcasing...".
3. NO promotional fluff: never say "groundbreaking", "vibrant", "stunning", "breathtaking", "renowned".
4. NO vague attributions: never say "Experts believe" or "Industry observers note" — name the source or drop the claim.
5. NO copula avoidance: say "is/are/has" instead of "serves as", "stands as", "represents", "marks".
6. NO negative parallelisms: never say "It's not just X; it's Y".
7. NO rule of three: do not force ideas into groups of three.
8. NO synonym cycling: do not rotate synonyms across sentences.
9. NO false ranges: do not use "from X to Y" where X and Y are not on a real scale.
10. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "intricate", "tapestry", "underscore", "pivotal", "landscape" (abstract), "interplay".
11. NO signposting: never say "Let's dive in", "Here's what you need to know".
12. NO filler phrases: cut "In order to", "Due to the fact that", "It is important to note".
13. NO excessive hedging: do not say "could potentially", "it might be argued that".
14. NO generic conclusions: never end with "the future looks bright", "exciting times lie ahead".
15. NO persuasive authority tropes: avoid "The real question is", "What really matters", "fundamentally".
16. NO sycophantic tone: never say "Great question!", "I hope this helps".
17. NO knowledge disclaimers: never say "as of", "based on available information".
18. Sentences must be speakable in one breath — under 25 words each.
19. NO parenthetical asides — listeners cannot "hear" parentheses.
20. Avoid tongue-twisters and alliteration clusters.

FINAL CHECK: Read your text aloud in your head. Does it sound like a person talking? Fix anything that sounds robotic.`

export const HUMANIZER_ARTICLE = `
ANTI-AI WRITING RULES (apply to all output languages):
Your output must read like professional journalism, not AI-generated text. Eliminate these patterns:

1. NO inflated significance: never use "testament to", "pivotal moment", "evolving landscape", "vital role", "indelible mark", "setting the stage".
2. NO -ing tacking: never end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...", "showcasing...".
3. NO promotional language: never use "groundbreaking", "vibrant", "stunning", "breathtaking", "nestled", "in the heart of", "renowned".
4. NO vague attributions: never write "Experts believe", "Industry observers note" — name the source or drop the claim.
5. NO challenges/prospects boilerplate: never write "Despite challenges... continues to thrive".
6. NO copula avoidance: use "is/are/has" instead of "serves as", "stands as", "represents", "marks", "boasts".
7. NO negative parallelisms: never write "It's not just X; it's Y".
8. NO rule of three: do not force ideas into groups of three.
9. NO synonym cycling: do not rotate synonyms for the same concept.
10. NO false ranges: do not use "from X to Y" where X and Y are not on a real scale.
11. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "garner", "intricate", "tapestry", "underscore", "pivotal", "landscape" (abstract), "interplay", "additionally".
12. NO passive voice when actor is known: prefer active constructions.
13. NO em dash overuse: use commas or periods instead. Maximum one per paragraph.
14. NO signposting: never write "Let's explore", "Here's what you need to know".
15. NO filler phrases: cut "In order to", "Due to the fact that", "It is important to note".
16. NO excessive hedging: do not write "could potentially", "it might be argued that".
17. NO generic conclusions: never end with "the future looks bright", "exciting times lie ahead".
18. NO persuasive authority tropes: avoid "The real question is", "What really matters", "fundamentally".
19. NO sycophantic artifacts: never write "Great question!", "I hope this helps".
20. NO knowledge disclaimers: never write "as of", "based on available information".
21. NO fragmented headers: do not follow a heading with a one-liner that restates it.
22. NO hyphenated-word overuse: vary naturally.

FINAL CHECK: Re-read your output. If any sentence could appear in a generic AI article about any topic, rewrite it with specific facts.`

export const HUMANIZER_PORTFOLIO = `
ANTI-AI WRITING RULES (for technical case studies):
Your output must read like a real developer documenting their work, not AI-generated marketing. Eliminate these patterns:

1. NO inflated significance: never use "testament to", "pivotal moment", "evolving landscape", "vital role", "key turning point".
2. NO -ing tacking: never end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...", "showcasing...".
3. NO promotional fluff: never use "groundbreaking", "vibrant", "stunning", "cutting-edge", "state-of-the-art", "revolutionary".
4. NO copula avoidance: use "is/are/has" instead of "serves as", "stands as", "represents", "marks".
5. NO negative parallelisms: never write "It's not just X; it's Y".
6. NO rule of three: do not force ideas into groups of three.
7. NO synonym cycling: do not rotate synonyms across sentences.
8. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "intricate", "tapestry", "underscore", "pivotal", "landscape" (abstract), "interplay", "seamless".
9. NO passive voice when actor is known: use "I built" not "was built".
10. NO signposting: never write "Let's dive in", "Here's what you need to know".
11. NO filler phrases: cut "In order to", "It is important to note".
12. NO excessive hedging: do not write "could potentially", "it might be argued".
13. NO generic conclusions: never end with "the future looks bright", "continues to thrive".
14. NO persuasive authority tropes: avoid "The real question is", "What really matters".
15. NO vague metrics: never write "improved performance" — use real numbers.
16. NO marketing speak: never write "empowering", "unlocking potential", "transformative".
17. Be specific: use real function names, file paths, and measurable numbers.
18. First person encouraged: "I built", "I noticed", "I decided".

FINAL CHECK: Does every claim have a specific fact behind it? Rewrite anything that sounds like a press release.`

// ─── VOICE GUIDELINES ───────────────────────────────────────────────────────────

export const VOICE_SOCIAL = `
VOICE GUIDELINES:
- Write like a real dev talking to peers, not a press release.
- Vary sentence length: short punchy ones mixed with longer ones.
- Have opinions. React to your own work honestly.
- Use "I" naturally. First person is honest, not unprofessional.
- Be specific: real function names, real numbers, real file paths.
- Let some imperfection in. Perfect structure feels algorithmic.
- Acknowledge complexity: "This works but I'm still not happy with the retry logic" is human.`

export const VOICE_JOURNALISM = `
VOICE GUIDELINES:
- Write like a professional journalist: clear, direct, factual.
- Vary sentence length and structure naturally.
- Lead with the most important information (inverted pyramid).
- Use specific facts, names, and numbers — not vague claims.
- Each paragraph should contain one main idea.
- Avoid editorializing unless it is an opinion piece.`

export const VOICE_SPOKEN = `
VOICE GUIDELINES:
- Write for the ear, not the eye. Short, clear sentences.
- Vary rhythm: mix short statements with slightly longer ones.
- Use natural conversational flow — not a teleprompter cadence.
- Prefer common words over technical jargon.
- Each sentence should express one clear idea.
- Sound like a person telling a story, not reading a report.`

// ─── HELPER ─────────────────────────────────────────────────────────────────────

const RULE_MAP: Record<string, string> = {
  social: HUMANIZER_SOCIAL + '\n' + VOICE_SOCIAL,
  video: HUMANIZER_VIDEO + '\n' + VOICE_SPOKEN,
  article: HUMANIZER_ARTICLE + '\n' + VOICE_JOURNALISM,
  portfolio: HUMANIZER_PORTFOLIO + '\n' + VOICE_SOCIAL,
}

/**
 * Inject humanizer rules into an existing prompt.
 * Rules are inserted before the last "Return ONLY" or "Return JSON" instruction if present,
 * otherwise appended at the end.
 */
export function withHumanizer(
  prompt: string,
  context: 'social' | 'video' | 'article' | 'portfolio',
): string {
  const rules = RULE_MAP[context]
  const returnIdx = prompt.lastIndexOf('Return ONLY')
  if (returnIdx > 0) {
    return prompt.slice(0, returnIdx) + '\n' + rules + '\n\n' + prompt.slice(returnIdx)
  }
  return prompt + '\n' + rules
}
