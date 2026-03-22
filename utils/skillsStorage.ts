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

// Default skills derived from GitHub repos analysis (SmmShaman/*)
export const defaultSkills: Skill[] = [
  // Development — core languages & frameworks (10+ repos evidence)
  { id: '1', name: 'TypeScript', category: 'development' },
  { id: '2', name: 'React', category: 'development' },
  { id: '3', name: 'Next.js', category: 'development' },
  { id: '4', name: 'Python', category: 'development' },
  { id: '5', name: 'Tailwind CSS', category: 'development' },
  { id: '6', name: 'Node.js', category: 'development' },
  { id: '7', name: 'Vite', category: 'development' },
  { id: '8', name: 'Express.js', category: 'development' },
  { id: '9', name: 'PostgreSQL', category: 'development' },
  { id: '10', name: 'Deno', category: 'development' },
  // UI/Design — animation & visualization libraries
  { id: '11', name: 'Framer Motion', category: 'ui' },
  { id: '12', name: 'GSAP', category: 'ui' },
  { id: '13', name: 'Three.js', category: 'ui' },
  { id: '14', name: 'Radix UI', category: 'ui' },
  { id: '15', name: 'Recharts', category: 'ui' },
  { id: '16', name: 'Remotion', category: 'ui' },
  // AI/ML — AI providers & tools
  { id: '17', name: 'Azure OpenAI', category: 'ai' },
  { id: '18', name: 'Google Gemini', category: 'ai' },
  { id: '19', name: 'OpenAI API', category: 'ai' },
  { id: '20', name: 'HuggingFace', category: 'ai' },
  { id: '21', name: 'Tesseract.js', category: 'ai' },
  { id: '22', name: 'Claude Code', category: 'ai' },
  // Automation — CI/CD & workflow tools
  { id: '23', name: 'GitHub Actions', category: 'automation' },
  { id: '24', name: 'Docker', category: 'automation' },
  { id: '25', name: 'n8n', category: 'automation' },
  { id: '26', name: 'Playwright', category: 'automation' },
  // Marketing — APIs & platforms
  { id: '27', name: 'Telegram Bot API', category: 'marketing' },
  { id: '28', name: 'LinkedIn API', category: 'marketing' },
  { id: '29', name: 'Meta Ads Manager', category: 'marketing' },
  // Integration — BaaS & hosting
  { id: '30', name: 'Supabase', category: 'integration' },
  { id: '31', name: 'Netlify', category: 'integration' },
  { id: '32', name: 'Fly.io', category: 'integration' },
  { id: '33', name: 'Drizzle ORM', category: 'integration' },
  { id: '34', name: 'Vercel', category: 'integration' },
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
