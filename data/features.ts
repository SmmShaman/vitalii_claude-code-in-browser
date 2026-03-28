// Feature data types and category definitions

export type FeatureCategory =
  | 'ai_automation'
  | 'media_production'
  | 'bot_scraping'
  | 'frontend_ux'
  | 'devops_infra'
  | 'other';

export type ProjectId = 'portfolio' | 'jobbot' | 'eyeplus' | 'calendar_bot' | 'lingleverika' | 'ghost_interviewer' | 'youtube_manager' | 'elvarika';

export interface Feature {
  id: string;
  projectId: ProjectId;
  category: FeatureCategory;
  title: { en: string; no: string; ua: string };
  shortDescription: { en: string; no: string; ua: string };
  problem: { en: string; no: string; ua: string };
  solution: { en: string; no: string; ua: string };
  result: { en: string; no: string; ua: string };
  techStack: string[];
  hashtags: string[];
}

export interface CategoryInfo {
  id: FeatureCategory;
  label: { en: string; no: string; ua: string };
  icon: string; // Lucide icon name
  color: { bg: string; text: string; hex: string };
}

export interface ProjectInfo {
  id: ProjectId;
  name: { en: string; no: string; ua: string };
  description: { en: string; no: string; ua: string };
  url?: string;
  badge: string;
  color: { bg: string; text: string };
}

export const categories: CategoryInfo[] = [
  {
    id: 'ai_automation',
    label: { en: 'AI & Automation', no: 'AI & Automatisering', ua: 'AI & Автоматизація' },
    icon: 'Brain',
    color: { bg: 'bg-orange-500/20', text: 'text-orange-400', hex: '#fb923c' },
  },
  {
    id: 'media_production',
    label: { en: 'Content & Media', no: 'Innhold & Media', ua: 'Контент & Медіа' },
    icon: 'Video',
    color: { bg: 'bg-pink-500/20', text: 'text-pink-400', hex: '#f472b6' },
  },
  {
    id: 'bot_scraping',
    label: { en: 'Bots & Scraping', no: 'Boter & Scraping', ua: 'Боти & Скрапінг' },
    icon: 'Bot',
    color: { bg: 'bg-blue-500/20', text: 'text-blue-400', hex: '#60a5fa' },
  },
  {
    id: 'frontend_ux',
    label: { en: 'Frontend & UX', no: 'Frontend & UX', ua: 'Frontend & UX' },
    icon: 'Palette',
    color: { bg: 'bg-purple-500/20', text: 'text-purple-400', hex: '#c084fc' },
  },
  {
    id: 'devops_infra',
    label: { en: 'DevOps & Infra', no: 'DevOps & Infra', ua: 'DevOps & Інфра' },
    icon: 'Server',
    color: { bg: 'bg-green-500/20', text: 'text-green-400', hex: '#4ade80' },
  },
  {
    id: 'other',
    label: { en: 'Other', no: 'Annet', ua: 'Інше' },
    icon: 'Layers',
    color: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', hex: '#67e8f9' },
  },
];

export const projects: ProjectInfo[] = [
  {
    id: 'portfolio',
    name: {
      en: 'Portfolio & News Platform',
      no: 'Portefølje & Nyhetsplattform',
      ua: 'Портфоліо & Новинна платформа',
    },
    description: {
      en: 'AI-powered multilingual content platform with 48 production features',
      no: 'AI-drevet flerspråklig innholdsplattform med 48 produksjonsfunksjoner',
      ua: 'AI-платформа багатомовного контенту з 48 продакшн-функціями',
    },
    url: 'https://vitalii.no',
    badge: 'P',
    color: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  },
  {
    id: 'jobbot',
    name: {
      en: 'JobBot Norway',
      no: 'JobBot Norge',
      ua: 'JobBot Norway',
    },
    description: {
      en: 'Intelligent job hunting automation platform with 42 features',
      no: 'Intelligent automatiseringsplattform for jobbsøk med 42 funksjoner',
      ua: 'AI-платформа автоматизації пошуку роботи з 42 функціями',
    },
    badge: 'J',
    color: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  },
  {
    id: 'calendar_bot',
    name: {
      en: 'Calendar Telegram Bot',
      no: 'Kalender Telegram-Bot',
      ua: 'Календар Telegram Бот',
    },
    description: {
      en: 'Smart calendar bot with Spond integration and AI scheduling',
      no: 'Smart kalenderbot med Spond-integrasjon og AI-planlegging',
      ua: 'Розумний бот-календар з інтеграцією Spond та AI-плануванням',
    },
    badge: 'C',
    color: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  },
  {
    id: 'eyeplus',
    name: {
      en: 'Eye+ Camera Cloud',
      no: 'Eye+ Kamerasky',
      ua: 'Eye+ Camera Cloud',
    },
    description: {
      en: 'Cloud-based camera monitoring and management platform',
      no: 'Skybasert kameraovervåking og administrasjonsplattform',
      ua: 'Хмарна платформа моніторингу та управління камерами',
    },
    badge: 'E',
    color: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  },
  {
    id: 'lingleverika',
    name: {
      en: 'Lingva AI',
      no: 'Lingva AI',
      ua: 'Lingva AI',
    },
    description: {
      en: 'AI-powered video translation and understanding platform',
      no: 'AI-drevet videooversettelse og forståelsesplattform',
      ua: 'AI-платформа перекладу та розуміння відео',
    },
    badge: 'L',
    color: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  },
  {
    id: 'ghost_interviewer',
    name: {
      en: 'Ghost Interviewer AI',
      no: 'Ghost Interviewer AI',
      ua: 'Ghost Interviewer AI',
    },
    description: {
      en: 'AI interview preparation and coaching platform',
      no: 'AI-intervjuforberedelse og coaching-plattform',
      ua: 'AI-платформа підготовки до співбесід',
    },
    badge: 'G',
    color: { bg: 'bg-rose-500/20', text: 'text-rose-400' },
  },
  {
    id: 'youtube_manager',
    name: {
      en: 'YouTube Channel Manager',
      no: 'YouTube Kanalbehandler',
      ua: 'YouTube Channel Manager',
    },
    description: {
      en: 'Automated YouTube channel management and content publishing',
      no: 'Automatisert YouTube-kanaladministrasjon og innholdspublisering',
      ua: 'Автоматизоване управління YouTube-каналом та публікація контенту',
    },
    badge: 'Y',
    color: { bg: 'bg-red-500/20', text: 'text-red-400' },
  },
  {
    id: 'elvarika',
    name: {
      en: 'Elvarika',
      no: 'Elvarika',
      ua: 'Elvarika',
    },
    description: {
      en: 'AI language learning platform for immigrants in Norway',
      no: 'AI-språklæringsplattform for innvandrere i Norge',
      ua: 'AI-платформа вивчення мов для іммігрантів у Норвегії',
    },
    badge: 'E',
    color: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  },
];

export function getCategoryInfo(id: FeatureCategory): CategoryInfo {
  return categories.find((c) => c.id === id) || categories[categories.length - 1];
}

export function getProjectInfo(id: ProjectId): ProjectInfo {
  return projects.find((p) => p.id === id) || projects[0];
}

export function getFeaturesByCategory(features: Feature[], category: FeatureCategory): Feature[] {
  return features.filter((f) => f.category === category);
}

export function getFeaturesByProject(features: Feature[], projectId: ProjectId): Feature[] {
  return features.filter((f) => f.projectId === projectId);
}

export function getCategoryCounts(features: Feature[]): Record<FeatureCategory, number> {
  const counts = {} as Record<FeatureCategory, number>;
  for (const cat of categories) {
    counts[cat.id] = features.filter((f) => f.category === cat.id).length;
  }
  return counts;
}

// Re-export all features (will be populated by portfolioFeatures + jobbotFeatures)
// Import from portfolioFeatures.ts and jobbotFeatures.ts
export { portfolioFeatures } from './portfolioFeatures';
export { jobbotFeatures } from './jobbotFeatures';

// Combined features list
import { portfolioFeatures } from './portfolioFeatures';
import { jobbotFeatures } from './jobbotFeatures';

export const allFeatures: Feature[] = [...portfolioFeatures, ...jobbotFeatures];
