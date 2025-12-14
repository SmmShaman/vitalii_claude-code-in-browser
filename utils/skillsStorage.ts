// Skills storage utility for admin panel management

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

export type SkillCategory =
  | 'development'
  | 'ui'
  | 'ai'
  | 'automation'
  | 'marketing'
  | 'integration';

// Category colors matching SkillsAnimation.tsx
export const categoryColors: Record<SkillCategory, { bg: string; text: string; bgHex: string }> = {
  development: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    bgHex: '#dcfce7' // green-100
  },
  ui: {
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    bgHex: '#f3e8ff' // purple-100
  },
  ai: {
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    bgHex: '#ffedd5' // orange-100
  },
  automation: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    bgHex: '#dbeafe' // blue-100
  },
  marketing: {
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    bgHex: '#fce7f3' // pink-100
  },
  integration: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-800',
    bgHex: '#cffafe' // cyan-100
  },
};

export const categoryLabels: Record<SkillCategory, string> = {
  development: 'Development',
  ui: 'UI/Design',
  ai: 'AI/ML',
  automation: 'Automation',
  marketing: 'Marketing',
  integration: 'Integration',
};

// Default skills matching the current translations.ts
export const defaultSkills: Skill[] = [
  // Frontend
  { id: '1', name: 'React', category: 'development' },
  { id: '2', name: 'TypeScript', category: 'development' },
  { id: '3', name: 'Tailwind CSS', category: 'development' },
  // Backend
  { id: '4', name: 'Python', category: 'development' },
  { id: '5', name: 'FastAPI', category: 'development' },
  { id: '6', name: 'Docker', category: 'development' },
  { id: '7', name: 'Supabase', category: 'integration' },
  { id: '8', name: 'Firebase', category: 'integration' },
  // AI / NLP
  { id: '9', name: 'Azure OpenAI', category: 'ai' },
  { id: '10', name: 'Claude MCP', category: 'ai' },
  { id: '11', name: 'spaCy', category: 'ai' },
  { id: '12', name: 'ElevenLabs API', category: 'ai' },
  { id: '13', name: 'Zvukogram API', category: 'ai' },
  { id: '14', name: 'OCR.space', category: 'ai' },
  // Automation
  { id: '15', name: 'n8n', category: 'automation' },
  // Marketing
  { id: '16', name: 'Helium10', category: 'marketing' },
  { id: '17', name: 'Meta Ads Manager', category: 'marketing' },
  // DevOps / Hosting
  { id: '18', name: 'Vercel', category: 'integration' },
  { id: '19', name: 'Netlify', category: 'integration' },
  // Other tools
  { id: '20', name: 'Bolt.new', category: 'ui' },
  { id: '21', name: 'Canva', category: 'ui' },
];

const STORAGE_KEY = 'vitalii_skills_list';

// Get skills from localStorage or return defaults
export const getStoredSkills = (): Skill[] => {
  if (typeof window === 'undefined') {
    return defaultSkills;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Error reading skills from localStorage:', error);
  }

  return defaultSkills;
};

// Save skills to localStorage
export const saveSkills = (skills: Skill[]): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch (error) {
    console.error('Error saving skills to localStorage:', error);
  }
};

// Reset skills to defaults
export const resetSkillsToDefault = (): Skill[] => {
  saveSkills(defaultSkills);
  return defaultSkills;
};

// Generate unique ID for new skill
export const generateSkillId = (): string => {
  return `skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Convert skills to format expected by SkillsAnimation
export const convertSkillsForAnimation = (skills: Skill[]): { name: string; category: string }[] => {
  return skills.map(skill => ({
    name: skill.name,
    category: skill.category,
  }));
};
