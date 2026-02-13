import { TierConfig, RSSSource } from './types'

export const TIER_CONFIGS: TierConfig[] = [
  {
    id: 1,
    name: 'Government',
    description: 'Norwegian Government & Tax',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  {
    id: 2,
    name: 'NO Tech Media',
    description: 'Norwegian Tech News',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 3,
    name: 'Global Tech',
    description: 'International Tech Companies',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 4,
    name: 'Aggregators',
    description: 'Tech News Aggregators',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
]

// Default sources - used as fallback if DB is empty
export const DEFAULT_SOURCES: Omit<RSSSource, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder' | 'skipPreModeration'>[] = [
  // Tier 1 - Norwegian Government/Tax (9 sources)
  {
    name: 'Skatteetaten',
    url: 'https://skatteetaten.no',
    rssUrl: 'https://www.skatteetaten.no/rss/presse/pressemeldinger/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Skatteetaten Uttalelser',
    url: 'https://www.skatteetaten.no/rettskilder/uttalelser/',
    rssUrl: 'https://www.skatteetaten.no/rss/rettskilder/uttalelser/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Skatteetaten A-meldingen (endringer)',
    url: 'https://www.skatteetaten.no/bedrift/arbeidsgiver/a-meldingen/endringer-i-veiledningen/',
    rssUrl: 'https://www.skatteetaten.no/rss/bedrift/arbeidsgiver/a-meldingen/endringer-i-veiledningen/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Skatteetaten A-meldingen (nyheter)',
    url: 'https://www.skatteetaten.no/bedrift/arbeidsgiver/a-meldingen/',
    rssUrl: 'https://www.skatteetaten.no/rss/bedrift/arbeidsgiver/a-meldingen/siste-fra-a-ordningen/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Skatteetaten Skattekalender (person)',
    url: 'https://www.skatteetaten.no/skattekalender-for-person/',
    rssUrl: 'https://www.skatteetaten.no/rss/skattekalender-for-person/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Finanstilsynet',
    url: 'https://www.finanstilsynet.no/',
    rssUrl: 'https://www.finanstilsynet.no/rss/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Sodir (Offshore)',
    url: 'https://www.sodir.no/en/whats-new/news/',
    rssUrl: 'https://www.sodir.no/en/whats-new/news/rss/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Regjeringen.no',
    url: 'https://www.regjeringen.no/',
    rssUrl: 'https://www.regjeringen.no/no/rss/id2000900/',
    tier: 1,
    isActive: true,
    isDefault: true,
  },

  // Tier 2 - Norwegian Tech Media (5 sources)
  {
    name: 'Digi.no',
    url: 'https://digi.no',
    rssUrl: 'https://www.digi.no/rss',
    tier: 2,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'E24',
    url: 'https://e24.no',
    rssUrl: 'https://e24.no/rss',
    tier: 2,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Kode24',
    url: 'https://kode24.no',
    rssUrl: 'https://rss.kode24.no/',
    tier: 2,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Life in Norway Business',
    url: 'https://www.lifeinnorway.net/business/',
    rssUrl: 'https://www.lifeinnorway.net/business/feed/',
    tier: 2,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Miniforetak.no',
    url: 'https://miniforetak.no/',
    rssUrl: 'https://miniforetak.no/feed',
    tier: 2,
    isActive: true,
    isDefault: true,
  },

  // Tier 3 - Global Tech (5 sources)
  {
    name: 'OpenAI Blog',
    url: 'https://openai.com/blog',
    rssUrl: 'https://openai.com/news/rss.xml',
    tier: 3,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'n8n Blog',
    url: 'https://blog.n8n.io',
    rssUrl: 'https://blog.n8n.io/rss',
    tier: 3,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Supabase',
    url: 'https://supabase.com/blog',
    rssUrl: 'https://supabase.com/rss.xml',
    tier: 3,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Azure Blog',
    url: 'https://azure.microsoft.com/blog',
    rssUrl: 'https://azure.microsoft.com/en-us/blog/feed/',
    tier: 3,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Stripe Blog',
    url: 'https://stripe.com/blog',
    rssUrl: 'https://stripe.com/blog/feed.rss',
    tier: 3,
    isActive: true,
    isDefault: true,
  },

  // Tier 4 - Aggregators (4 sources)
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com',
    rssUrl: 'https://www.techcrunch.com/feed/',
    tier: 4,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    rssUrl: 'https://hnrss.org/frontpage?points=50',
    tier: 4,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'TC Startups',
    url: 'https://techcrunch.com/startups',
    rssUrl: 'https://www.techcrunch.com/category/startups/feed/',
    tier: 4,
    isActive: true,
    isDefault: true,
  },
  {
    name: 'EU-Startups',
    url: 'https://www.eu-startups.com/',
    rssUrl: 'https://www.eu-startups.com/feed/',
    tier: 4,
    isActive: true,
    isDefault: true,
  },
]

export const DEFAULT_SETTINGS = {
  refreshInterval: 300, // 5 minutes
  articlesPerSource: 5,
  autoRefresh: true,
  autoAnalyze: false, // Disabled by default to avoid unexpected API costs
  expandedSources: [] as string[],
}
