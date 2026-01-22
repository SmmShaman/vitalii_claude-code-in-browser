## Skill Logos Utility

**Файл:** `utils/skillLogos.ts`

SVG логотипи з SimpleIcons CDN для секції Skills.

### Визначені логотипи:

```typescript
const skillLogos: Record<string, string> = {
  'React': 'https://cdn.simpleicons.org/react/61DAFB',
  'TypeScript': 'https://cdn.simpleicons.org/typescript/3178C6',
  'Tailwind CSS': 'https://cdn.simpleicons.org/tailwindcss/06B6D4',
  'Python': 'https://cdn.simpleicons.org/python/3776AB',
  'Supabase': 'https://cdn.simpleicons.org/supabase/3FCF8E',
  'n8n': 'https://cdn.simpleicons.org/n8n/EA4B71',
  // ... 20+ logos
}
```

### getSkillLogo(skillName)

Повертає URL логотипу або генерує fallback з ініціалами:

```typescript
const logo = getSkillLogo('React')      // SimpleIcons URL
const logo = getSkillLogo('CustomTool') // SVG with "CT" initials
```

---
