// Shared types for mobile BentoGrid sub-components

export interface SectionColorConfig {
  bg: string
  text: string
  icon: string
  gradient: string
}

// Section colors (same as desktop)
export const sectionColors: { [key: string]: SectionColorConfig } = {
  home: { bg: 'bg-surface-darker', text: 'text-content', icon: '#AF601A', gradient: 'from-surface to-surface-darker' },
  about: { bg: 'bg-surface-deep', text: 'text-content', icon: '#AF601A', gradient: 'from-surface to-surface-deep' },
  services: { bg: 'bg-surface-deep', text: 'text-content', icon: '#EC008C', gradient: 'from-surface to-surface-deep' },
  projects: { bg: 'bg-surface-darker', text: 'text-content', icon: '#009B77', gradient: 'from-surface-deep to-surface-darker' },
  features: { bg: 'bg-surface-deep', text: 'text-content', icon: '#F5A0C0', gradient: 'from-surface to-surface-deep' },
  news: { bg: 'bg-surface-darker', text: 'text-content', icon: '#88B04B', gradient: 'from-surface-deep to-surface-darker' },
  blog: { bg: 'bg-surface-deep', text: 'text-content', icon: '#0F4C81', gradient: 'from-surface to-surface-deep' },
  contact: { bg: 'bg-surface-darker', text: 'text-content', icon: '#764BB0', gradient: 'from-surface-deep to-surface-darker' },
}

// Project gradient colors (matching desktop)
export const projectColors = [
  { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' },
  { from: '#05ddfa', via: '#00bfff', to: '#4169e1' },
  { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' },
  { from: '#4caf50', via: '#8bc34a', to: '#cddc39' },
  { from: '#ff6b6b', via: '#ff5252', to: '#f44336' },
]

// Social link interface
export interface SocialLink {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  href: string
  label: string
  username: string
  color: string
}

// Translation function type
export type TranslateFn = (key: any) => any
