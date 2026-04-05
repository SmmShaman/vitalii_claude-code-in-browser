/**
 * Humanizer Anti-AI Writing Rules for Node.js scripts.
 *
 * CANONICAL SOURCE: supabase/functions/_shared/humanizer-prompt.ts
 * Keep these in sync. If updating rules, update BOTH files.
 */

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

FINAL CHECK: Read your text aloud in your head. Does it sound like a person talking? Fix anything that sounds robotic.`;

export const HUMANIZER_SOCIAL = `
ANTI-AI WRITING RULES (CRITICAL):
Your output must read like a real person wrote it, not an AI. Eliminate every one of these patterns:

1. NO inflated significance: never use "testament to", "pivotal moment", "evolving landscape", "vital role".
2. NO -ing tacking: never end clauses with "highlighting...", "underscoring...", "ensuring...", "reflecting...".
3. NO promotional fluff: never use "groundbreaking", "vibrant", "stunning", "breathtaking", "renowned".
4. NO copula avoidance: use "is/are/has" instead of "serves as", "stands as", "represents".
5. NO negative parallelisms: never write "It's not just X; it's Y".
6. NO rule of three: do not force ideas into groups of three.
7. NO AI vocabulary: avoid "delve", "crucial", "enhance", "foster", "intricate", "tapestry", "underscore", "pivotal".
8. NO signposting: never write "Let's dive in", "Here's what you need to know".
9. NO filler phrases: cut "In order to", "It is important to note".
10. NO generic conclusions: never end with "the future looks bright", "exciting times lie ahead".

FINAL CHECK: Re-read and ask "What makes this obviously AI-generated?" Fix remaining tells.`;

export const VOICE_SPOKEN = `
VOICE GUIDELINES:
- Write for the ear, not the eye. Short, clear sentences.
- Vary rhythm: mix short statements with slightly longer ones.
- Use natural conversational flow — not a teleprompter cadence.
- Prefer common words over technical jargon.
- Sound like a person telling a story, not reading a report.`;
