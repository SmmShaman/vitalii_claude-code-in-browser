## Projects Hover Explosion (December 2024)

### Опис

При затримці курсора на секції Projects більше 3 секунд, карусель проектів "розсипається" на сітку маленьких блоків з назвами проектів. При виведенні курсора все повертається до нормальної каруселі.

### Файли

```
├── components/sections/BentoGrid.tsx    # Стан isProjectsExploding + hover таймер
├── components/ui/ProjectsCarousel.tsx   # Explosion grid view + GSAP карусель
```

### Стани та Refs

```typescript
// BentoGrid.tsx
const [isProjectsExploding, setIsProjectsExploding] = useState(false);
const projectsHoverTimeoutRef = useRef<number | null>(null);
```

### Логіка взаємодії

1. **Наведення курсора на Projects** → запускається таймер 3 секунди
2. **Курсор тримається 3+ секунди** → `isProjectsExploding = true`
3. **Виведення курсора** → таймер скасовується, `isProjectsExploding = false`
4. **Клік на блок проекту** → відкривається модальне вікно з деталями

### Mouse Event Handlers

```typescript
// onMouseEnter для Projects
if (section.id === 'projects') {
  projectsHoverTimeoutRef.current = window.setTimeout(() => {
    setIsProjectsExploding(true);
  }, 3000); // 3 секунди затримки
}

// onMouseLeave для Projects
if (section.id === 'projects') {
  clearTimeout(projectsHoverTimeoutRef.current);
  setIsProjectsExploding(false);
}
```

### ProjectsCarousel Explosion View

При `isExploding = true`:
- GSAP timeline паузиться
- Карусель ховається через `opacity: 0`
- З'являється сітка блоків проектів

### Адаптивна сітка

```typescript
const getGridLayout = () => {
  const count = projects.length;
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 }; // Max 16 проектів
};
```

### Анімація блоків

```typescript
<motion.div
  initial={{ opacity: 0, scale: 0.5 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{
    duration: 0.4,
    delay: index * 0.05, // Stagger effect
    ease: 'backOut'
  }}
  whileHover={{ scale: 1.05 }}
/>
```

### Стилі блоків проектів

- Градієнтний фон з кольорами проекту
- Фонове зображення проекту (opacity 30%)
- Градієнтний overlay знизу для читабельності тексту
- Hover індикатор (кольорова точка)

### Прозорий фон секції

При explosion фон секції Projects стає прозорим:

```typescript
// BentoGrid.tsx - Projects background
<div style={{ opacity: isProjectsExploding ? 0 : 1 }} /> {/* White layer */}
<div style={{ opacity: isProjectsExploding ? 0 : 1 }} /> {/* Project image */}
```

### Кольори проектів

```typescript
const projectColors = [
  { from: '#fc51c9', via: '#e707f7', to: '#9c27b0' }, // Pink/Magenta
  { from: '#05ddfa', via: '#00bfff', to: '#4169e1' }, // Cyan/Blue
  { from: '#ffeb3b', via: '#ffc107', to: '#ff9800' }, // Yellow/Orange
  { from: '#4caf50', via: '#8bc34a', to: '#cddc39' }, // Green/Lime
  { from: '#ff6b6b', via: '#ff5252', to: '#f44336' }, // Red/Pink
];
```

### Transitions

| Елемент | Тривалість | Призначення |
|---------|------------|-------------|
| Блоки появи | 400ms + stagger | Анімація появи блоків |
| Фон секції | 500ms | Зникнення білого фону |
| Карусель | 300ms | Приховування/показ |

---
