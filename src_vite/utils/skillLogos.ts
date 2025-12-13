// SVG logo URLs from SimpleIcons CDN for all skills
// Using SVG format for free scaling

export const skillLogos: Record<string, string> = {
  // Frontend & Backend (development)
  'React': 'https://cdn.simpleicons.org/react/61DAFB',
  'TypeScript': 'https://cdn.simpleicons.org/typescript/3178C6',
  'Tailwind CSS': 'https://cdn.simpleicons.org/tailwindcss/06B6D4',
  'Python': 'https://cdn.simpleicons.org/python/3776AB',
  'FastAPI': 'https://cdn.simpleicons.org/fastapi/009688',
  'Docker': 'https://cdn.simpleicons.org/docker/2496ED',

  // Integration (cyan)
  'Supabase': 'https://cdn.simpleicons.org/supabase/3FCF8E',
  'Firebase': 'https://cdn.simpleicons.org/firebase/FFCA28',
  'Vercel': 'https://cdn.simpleicons.org/vercel/000000',
  'Netlify': 'https://cdn.simpleicons.org/netlify/00C7B7',

  // AI / NLP (orange)
  'Azure OpenAI': 'https://cdn.simpleicons.org/openai/412991',
  'Claude MCP': 'https://cdn.simpleicons.org/anthropic/191919',
  'spaCy': 'https://cdn.simpleicons.org/spacy/09A3D5',
  'ElevenLabs API': 'https://cdn.simpleicons.org/elevenlabs/000000',
  'Zvukogram API': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23FF6B35" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold" fill="%23FFFFFF"%3EZ%3C/text%3E%3C/svg%3E',
  'OCR.space': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23FF6B35" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="%23FFFFFF"%3EOCR%3C/text%3E%3C/svg%3E',

  // Automation (blue)
  'n8n': 'https://cdn.simpleicons.org/n8n/EA4B71',

  // Marketing (pink)
  'Helium10': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23EC4899" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="20" font-weight="bold" fill="%23FFFFFF"%3EH10%3C/text%3E%3C/svg%3E',
  'Meta Ads Manager': 'https://cdn.simpleicons.org/meta/0668E1',

  // Design / Tools (purple)
  'Bolt.new': 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23A855F7" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="18" font-weight="bold" fill="%23FFFFFF"%3EBOLT%3C/text%3E%3C/svg%3E',
  'PowerPoint': 'https://cdn.simpleicons.org/microsoftpowerpoint/B7472A',
  'Canva': 'https://cdn.simpleicons.org/canva/00C4CC',
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
