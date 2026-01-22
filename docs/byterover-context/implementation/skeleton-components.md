## Loading Skeleton Components

**Файл:** `components/ui/Skeleton.tsx`

Компоненти для loading states.

### Skeleton (Base)

```tsx
<Skeleton className="h-4 w-32" />
```

### ArticleSkeleton

Повний скелетон для сторінки статті:
- Hero image placeholder
- Meta info (date, views)
- Title (2 lines)
- Tags
- Content paragraphs
- Share buttons
- Related articles grid

### NewsCardSkeleton

Скелетон для карточки новини у списку.

### Features:

- Pulse animation
- Dark mode support
- Accessible (`role="status"`, `aria-label`)

---
