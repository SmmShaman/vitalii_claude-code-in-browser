// SVG logo URLs for all skills
// Primary: devicons CDN (colored SVGs)
// Fallback: simple-icons via jsdelivr (monochrome)
// Custom: inline SVG data URIs where no CDN icon exists

const devicon = 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons';
const simpleicon = 'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons';

export const skillLogos: Record<string, string> = {
  // Development (green) — devicons colored
  'TypeScript': `${devicon}/typescript/typescript-original.svg`,
  'React': `${devicon}/react/react-original.svg`,
  'Next.js': `${devicon}/nextjs/nextjs-original.svg`,
  'Python': `${devicon}/python/python-original.svg`,
  'Tailwind CSS': `${devicon}/tailwindcss/tailwindcss-original.svg`,
  'Node.js': `${devicon}/nodejs/nodejs-original.svg`,
  'Vite': `${devicon}/vitejs/vitejs-original.svg`,
  'Express.js': `${devicon}/express/express-original.svg`,
  'PostgreSQL': `${devicon}/postgresql/postgresql-original.svg`,
  'Deno': `${devicon}/denojs/denojs-original.svg`,

  // UI/Design (purple)
  'Framer Motion': `${devicon}/framermotion/framermotion-original.svg`,
  'GSAP': `${simpleicon}/greensock.svg`,
  'Three.js': `${devicon}/threejs/threejs-original.svg`,
  'Radix UI': `${simpleicon}/radixui.svg`,
  'Recharts': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%2322B5BF" width="100" height="100" rx="12"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="%23FFFFFF"%3ERC%3C/text%3E%3C/svg%3E',
  'Remotion': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%230B84F3" width="100" height="100" rx="12"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" font-weight="bold" fill="%23FFFFFF"%3EREM%3C/text%3E%3C/svg%3E',

  // AI/ML (orange)
  'Azure OpenAI': `${devicon}/azure/azure-original.svg`,
  'Google Gemini': `${devicon}/google/google-original.svg`,
  'OpenAI API': `${simpleicon}/openai.svg`,
  'HuggingFace': `${simpleicon}/huggingface.svg`,
  'Tesseract.js': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23302B63" width="100" height="100" rx="12"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" font-weight="bold" fill="%23FFFFFF"%3EOCR%3C/text%3E%3C/svg%3E',
  'Claude Code': `${simpleicon}/anthropic.svg`,

  // Automation (blue)
  'GitHub Actions': `${devicon}/githubactions/githubactions-original.svg`,
  'Docker': `${devicon}/docker/docker-original.svg`,
  'n8n': `${simpleicon}/n8n.svg`,
  'Playwright': `${devicon}/playwright/playwright-original.svg`,

  // Marketing (pink)
  'Telegram Bot API': `${simpleicon}/telegram.svg`,
  'LinkedIn API': `${devicon}/linkedin/linkedin-original.svg`,
  'Meta Ads Manager': `${simpleicon}/meta.svg`,

  // Integration (cyan)
  'Supabase': `${devicon}/supabase/supabase-original.svg`,
  'Netlify': `${devicon}/netlify/netlify-original.svg`,
  'Fly.io': `${simpleicon}/flydotio.svg`,
  'Drizzle ORM': `${simpleicon}/drizzle.svg`,
  'Vercel': `${devicon}/vercel/vercel-original.svg`,
};

// Get logo URL for a skill, fallback to placeholder with skill initials
export const getSkillLogo = (skillName: string): string => {
  if (skillLogos[skillName]) {
    return skillLogos[skillName];
  }

  // Fallback: create SVG data URI with initials
  const initials = skillName
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();

  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%236B7280" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="%23FFFFFF"%3E${initials}%3C/text%3E%3C/svg%3E`;
};
