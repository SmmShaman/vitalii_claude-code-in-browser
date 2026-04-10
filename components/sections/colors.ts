// Lightweight color constants — separated from heavy components to enable code splitting.
// DO NOT import BentoGrid.tsx or BentoGridMobile.tsx from here.

export const sectionNeonColors: { [key: string]: { primary: string; secondary: string } } = {
  about: { primary: '#AF601A', secondary: '#c97a2e' },
  services: { primary: '#EC008C', secondary: '#ff33a8' },
  projects: { primary: '#009B77', secondary: '#00c49a' },
  features: { primary: '#F5A0C0', secondary: '#F0B0D0' },
  news: { primary: '#88B04B', secondary: '#a3c96a' },
  blog: { primary: '#0F4C81', secondary: '#1a6bb3' },
}

export const heroContrastColors: { [key: string]: string } = {
  about: '#009B77',
  services: '#00FF80',
  projects: '#FF4040',
  features: '#0F4C81',
  news: '#734BB0',
  blog: '#AF601A',
}

export const oppositeSections: { [key: string]: string } = {
  about: 'blog',
  services: 'news',
  projects: 'features',
  features: 'projects',
  news: 'services',
  blog: 'about',
}

// Re-export mobile section colors
export { sectionColors } from './mobile/types'
