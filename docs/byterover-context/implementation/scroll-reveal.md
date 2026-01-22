## Scroll Reveal Animations

**Файл:** `components/ui/ScrollReveal.tsx`

Intersection Observer-based анімації при скролі.

### ScrollReveal Component

```tsx
interface ScrollRevealProps {
  children: ReactNode
  delay?: number           // Seconds (default: 0)
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'  // Default: 'up'
  duration?: number        // Seconds (default: 0.5)
  once?: boolean           // Animate only once (default: true)
}
```

**Використання:**

```tsx
<ScrollReveal direction="up" delay={0.2}>
  <h2>This slides up when scrolled into view</h2>
</ScrollReveal>
```

### StaggerReveal Component

Staggered animation для списків:

```tsx
<StaggerReveal staggerDelay={0.1} direction="up">
  {items.map(item => (
    <Card key={item.id}>{item.title}</Card>
  ))}
</StaggerReveal>
```

---
