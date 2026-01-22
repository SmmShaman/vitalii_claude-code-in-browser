## Utility Function: cn()

**Файл:** `lib/utils.ts`

Merge Tailwind CSS classes з правильним precedence.

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Використання:**

```tsx
<div className={cn(
  'base-class',
  isActive && 'active-class',
  className
)} />
```

---
