/**
 * Opening Style Diversity System
 *
 * Randomly selects an opening strategy for each AI content generation
 * to prevent repetitive openings like "А ви знаєте:" across articles.
 */

type ContentType = 'news' | 'blog' | 'social'

/** AP/Reuters journalistic openings for news articles */
const NEWS_OPENING_STRATEGIES = [
  'Start with the most impactful fact or number from the article (inverted pyramid lead)',
  'Start with a direct statement of what happened, who did it, and why it matters',
  'Start with a surprising contrast — what was expected vs what actually happened',
  'Start with the immediate consequence or impact on people or the industry',
  'Start with a quote or paraphrased statement from a key figure in the story',
  'Start with the geographic or temporal context — where and when this is happening',
  'Start with the "so what" angle — why should a reader care about this right now',
  'Start with a brief scene-setting description of the situation (narrative lead)',
  'Start with a bold declarative sentence that captures the essence in under 15 words',
  'Start with the trend or pattern this news fits into — this is part of a bigger story',
  'Start with the stakes — what is at risk and for whom',
  'Start with a comparison to a well-known precedent or historical parallel',
]

/** First-person conversational openings for blog posts */
const BLOG_OPENING_STRATEGIES = [
  'Start with a personal reaction — "When I first read about this, I..."',
  'Start with a short anecdote about how you encountered this topic',
  'Start with a provocative opinion or hot take on the subject',
  'Start with a problem statement that the reader likely relates to',
  'Start with a surprising lesson or takeaway you got from this',
  'Start with a confession — something you used to believe that turned out wrong',
  'Start by painting a picture of what the future looks like if this trend continues',
  'Start with a bold prediction based on what you see in this development',
  'Start with a "behind the scenes" insight — what most people miss about this',
  'Start with a direct address to the reader — "If you work in X, this changes everything"',
  'Start with a metaphor or analogy that makes a complex topic instantly relatable',
  'Start with a before-and-after comparison showing how things have shifted',
]

/** Scroll-stopping hooks for social media teasers */
const SOCIAL_OPENING_STRATEGIES = [
  'Start with a striking statistic or number that shocks',
  'Start with a bold controversial statement that invites debate',
  'Start with a "what if" scenario that makes people imagine',
  'Start with a contrasting pair: "While X happened, Y is doing the opposite"',
  'Start with an urgent "breaking" or "just announced" framing',
  'Start with a myth-busting opener: "Everyone thinks X, but actually..."',
  'Start with a future prediction: "In 2 years, this will..."',
  'Start with a personal success or failure story related to the topic',
  'Start with a challenge to the reader: "Can you guess..." or "Try this..."',
  'Start with a "most people don\'t know" insider knowledge angle',
  'Start with an emotional consequence — how this affects real people',
  'Start with a minimalist one-liner that creates a dramatic pause before the next paragraph',
]

const STRATEGY_BANKS: Record<ContentType, string[]> = {
  news: NEWS_OPENING_STRATEGIES,
  blog: BLOG_OPENING_STRATEGIES,
  social: SOCIAL_OPENING_STRATEGIES,
}

/**
 * Returns a randomly selected opening strategy for the given content type.
 * Designed to be appended to AI prompts as an OPENING STYLE DIRECTIVE.
 */
export function getRandomOpeningStyle(contentType: ContentType): string {
  const strategies = STRATEGY_BANKS[contentType]
  const index = Math.floor(Math.random() * strategies.length)
  return strategies[index]
}
