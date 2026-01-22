## Social Sharing Buttons

**Файл:** `components/ui/ShareButtons.tsx`

Кнопки для поширення статей у соцмережах.

### Підтримувані платформи:

| Платформа | Метод | Callback |
|-----------|-------|----------|
| LinkedIn | Share offsite URL | Opens in popup |
| X (Twitter) | Intent URL with text | Opens in popup |
| Copy Link | Clipboard API | Toast notification |

### Props:

```typescript
interface ShareButtonsProps {
  url: string           // Relative URL (e.g., '/news/slug')
  title: string         // Article title
  description?: string  // Article description (for Twitter)
}
```

### Використання:

```tsx
<ShareButtons
  url="/news/meta-unveils-sam-audio"
  title="Meta Unveils SAM Audio"
  description="A breakthrough in AI audio processing"
/>
```

---
