## Mobile Responsiveness Improvements (December 2024)

### Опис

Комплексне покращення мобільної версії сайту: виправлення проблем з viewport, адаптивна сітка, підтримка тач-жестів, safe area insets для пристроїв з notch, та reduced motion для accessibility.

### Файли

```
├── app/globals.css                      # Утиліти h-screen-safe, safe-area-inset, reduced-motion
├── app/page.tsx                         # Responsive padding, h-screen-safe клас
├── components/sections/BentoGrid.tsx    # Responsive gap, mobile heights
├── components/ui/Modal.tsx              # Safe area insets, responsive sizing
├── components/sections/NewsSection.tsx  # Responsive grid layout
├── components/ui/ProjectsCarousel.tsx   # Touch/swipe підтримка
├── components/layout/Footer.tsx         # Touch-friendly social buttons
├── hooks/useReducedMotion.ts            # Hook для prefers-reduced-motion
```

### Виправлені проблеми

#### 1. 100vh проблема на мобільних (Safari address bar)

**Проблема:** `height: 100vh` на iOS не враховує динамічну адресну строку Safari, що призводить до обрізаного контенту.

**Рішення:**
```css
/* globals.css */
body {
  height: 100dvh;        /* Dynamic viewport height */
  height: 100vh;         /* Fallback */
}

.h-screen-safe {
  height: 100vh;
  height: 100dvh;
}

@supports (height: 100dvh) {
  body { height: 100dvh; }
}
```

#### 2. Responsive Gap у BentoGrid

**Проблема:** Фіксований gap 20px займає занадто багато місця на маленьких екранах.

**Рішення:**
```typescript
const GAP_SIZE_DESKTOP = 20; // Desktop gap
const GAP_SIZE_MOBILE = 12;  // Mobile gap

// Використання
gap: `${isMobile ? GAP_SIZE_MOBILE : GAP_SIZE_DESKTOP}px`
```

#### 3. Safe Area Insets для Modal

**Проблема:** На iPhone X+ контент перекривається notch та home indicator.

**Рішення:**
```tsx
<div style={{
  paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
  paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
  paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
  paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
}} />
```

#### 4. NewsSection Responsive Grid

**Проблема:** Фіксована колонка 448px не адаптується до планшетів.

**Рішення:**
```css
/* Mobile: Stack */
.news-section-detail-grid {
  flex-direction: column;
}

/* Tablet (640px+): Single column */
@media (min-width: 640px) {
  grid-template-columns: 1fr;
}

/* Medium (768px+): Two columns */
@media (min-width: 768px) {
  grid-template-columns: minmax(280px, 45%) 1fr;
}

/* Large (1024px+): Fixed media width */
@media (min-width: 1024px) {
  grid-template-columns: 400px 1fr;
}
```

#### 5. Touch/Swipe Support для ProjectsCarousel

**Рішення:**
```typescript
// Touch event handlers
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartRef.current = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
    time: Date.now(),
  };
};

const handleTouchEnd = (e: React.TouchEvent) => {
  const deltaX = touch.clientX - touchStartRef.current.x;
  if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
    if (deltaX < 0) nextProject();
    else prevProject();
  }
};
```

#### 6. Prefers Reduced Motion

**CSS рішення:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**React Hook:**
```typescript
// hooks/useReducedMotion.ts
export const useReducedMotion = (): boolean => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    // ... listener
  }, []);

  return prefersReducedMotion;
};
```

#### 7. Touch-Friendly Targets

**Мінімальний розмір:** 44x44px для всіх інтерактивних елементів на тач-пристроях.

```css
@media (pointer: coarse) {
  button, a, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}
```

### Mobile-First CSS Utilities

```css
/* globals.css */

/* Safe viewport heights */
.h-screen-safe { height: 100vh; height: 100dvh; }
.min-h-screen-safe { min-height: 100vh; min-height: 100dvh; }

/* Safe area padding for notched devices */
.safe-area-inset {
  padding: env(safe-area-inset-top) env(safe-area-inset-right)
           env(safe-area-inset-bottom) env(safe-area-inset-left);
}

/* Prevent iOS bounce */
body {
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
}
```

### Breakpoints

| Breakpoint | Ширина | Призначення |
|------------|--------|-------------|
| `sm` | 640px | Малі планшети, великі телефони (landscape) |
| `md` | 768px | Планшети (portrait) |
| `lg` | 1024px | Планшети (landscape), малі десктопи |
| `xl` | 1280px | Десктопи |

### Testing Mobile

1. **Chrome DevTools:** Toggle device toolbar (Ctrl+Shift+M)
2. **Safari Responsive Mode:** Develop → Enter Responsive Design Mode
3. **Real Device Testing:** Критично для iOS Safari address bar
4. **Lighthouse Mobile Audit:** Performance, Accessibility, Best Practices

### Checklist для нових компонентів

- [ ] Використовуй `dvh` замість `vh` для повноекранних layouts
- [ ] Додай safe-area-inset для fixed/absolute positioned елементів
- [ ] Мінімальний touch target 44x44px
- [ ] Перевір на landscape orientation
- [ ] Тестуй swipe gestures якщо є carousel/slider
- [ ] Додай `active:` states для touch feedback
- [ ] Використовуй responsive Tailwind classes (sm:, md:, lg:)

---
