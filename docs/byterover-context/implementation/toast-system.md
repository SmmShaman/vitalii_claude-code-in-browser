## Toast Notification System

**Файл:** `components/ui/Toast.tsx`

Global toast система з React Context API.

### Типи toast:

| Type | Колір | Auto-dismiss |
|------|-------|--------------|
| `success` | Зелений | 3 секунди |
| `error` | Червоний | 5 секунд |
| `warning` | Amber | 3 секунди |
| `info` | Синій | 3 секунди |

### Використання:

```tsx
import { useToast } from '@/components/ui/Toast'

function MyComponent() {
  const { showToast } = useToast()

  return (
    <button onClick={() => showToast('Link copied!', 'success')}>
      Copy Link
    </button>
  )
}
```

### Provider Setup:

```tsx
// app/providers.tsx
import { ToastProvider } from '@/components/ui/Toast'

export function Providers({ children }) {
  return (
    <TranslationProvider>
      <ToastProvider>
        {children}
      </ToastProvider>
    </TranslationProvider>
  )
}
```

### Accessibility:

- `role="status"` для screen readers
- `aria-live="polite"` для announcements
- Manual dismiss button

---
