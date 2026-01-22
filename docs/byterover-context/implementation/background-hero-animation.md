## Background Highlight & Hero Text Animation (December 2024)

### Опис

Динамічна зміна кольору фону та анімація заливки тексту Hero секції при наведенні курсора на кожне з 6 вікон BentoGrid.

### Файли

```
├── app/page.tsx                          # Background overlay + hoveredSection state
├── app/layout.tsx                        # Comfortaa font import
├── app/globals.css                       # Body background (light gray)
├── components/layout/Header.tsx          # Hero text fill animation
├── components/ui/HeroTextAnimation.tsx   # Liquid fill component with wave effect
├── components/sections/BentoGrid.tsx     # Section colors + opposite mapping
├── tailwind.config.ts                    # font-comfortaa class
```

### Шрифт Comfortaa

Округлий геометричний шрифт з відмінною підтримкою кирилиці:

```html
<!-- app/layout.tsx -->
<link
  href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

- **Підтримка:** Latin, Cyrillic (Ukrainian)
- **Tailwind клас:** `font-comfortaa`
- **Особливість:** Однакове відображення латиниці та кирилиці

### Кольори секцій

| Секція | Назва кольору | HEX | RGB |
|--------|---------------|-----|-----|
| About | Насичений коричнево-оранжевий | `#AF601A` | (175, 96, 26) |
| Services | Яскравий фуксієвий рожевий | `#EC008C` | (236, 0, 140) |
| Projects | Emerald | `#009B77` | (0, 155, 119) |
| Skills | Light Pink | `#fde5e5` | (253, 229, 229) |
| News | Greenery | `#88B04B` | (136, 176, 75) |
| Blog | Classic Blue | `#0F4C81` | (15, 76, 129) |

### Контрастні кольори для Hero тексту

Для анімації тексту Hero використовуються **комплементарні кольори** на основі теорії кольору для максимального контрасту:

```typescript
export const heroContrastColors: { [key: string]: string } = {
  about: '#009B77',      // Teal/Cyan для коричнево-оранжевого
  services: '#00FF80',   // Lime Green для фуксії
  projects: '#FF4040',   // Vibrant Red для смарагдового
  skills: '#0F4C81',     // Navy Blue для світло-рожевого
  news: '#734BB0',       // Royal Purple для зеленого
  blog: '#AF601A',       // Warm Orange для синього
};
```

| Секція | Колір секції | Контрастний колір Hero | Принцип |
|--------|--------------|------------------------|---------|
| About | #AF601A (Brown-Orange) | #009B77 (Teal) | Тепла vs холодна |
| Services | #EC008C (Fuchsia) | #00FF80 (Lime Green) | Магента vs зелений |
| Projects | #009B77 (Emerald) | #FF4040 (Red) | Зелений vs червоний |
| Skills | #fde5e5 (Light Pink) | #0F4C81 (Navy Blue) | Рожевий vs синій |
| News | #88B04B (Greenery) | #734BB0 (Purple) | Зелений vs фіолетовий |
| Blog | #0F4C81 (Classic Blue) | #AF601A (Orange) | Синій vs оранжевий |

### Background Overlay

```typescript
// app/page.tsx
<div
  className="fixed inset-0 -z-5 transition-all duration-700 ease-in-out"
  style={{
    backgroundColor: currentNeonColor || 'transparent',
    opacity: currentNeonColor ? 0.4 : 0,
  }}
/>
```

- Фон: світло-сірий (`bg-gray-200`)
- При hover: overlay з кольором секції (opacity 40%)
- Transition: 700ms ease-in-out

### Hero Text Fill Animation

#### Компонент `HeroTextAnimation`

Ефект "наливання фарби в прозорий стакан":

```typescript
// components/ui/HeroTextAnimation.tsx
interface HeroTextAnimationProps {
  text: string;
  fillColor: string | null;
  isActive: boolean;
  direction?: 'ltr' | 'rtl';  // напрямок заливки
  fontSize?: string;
  fontWeight?: string;
}
```

#### Glass Effect (базовий стан)

- Текст повністю **прозорий** (`color: 'transparent'`)
- Тонка **чорна кайомка** (`WebkitTextStroke: '0.5px rgba(0, 0, 0, 0.4)'`)
- Шрифт: **Comfortaa**

#### Liquid Fill (при hover)

- **Хвилеподібний край** заливки (polygon clip-path з синусоїдою)
- Анімована хвиля під час заповнення
- Легке світіння кольору (`textShadow`)

#### Напрямки заливки

**Subtitle** ("Marketing & Analytics Expert | Creator of Elvarika"):
- Напрямок: **справа наліво** (RTL)
- Розмір: `clamp(1rem, 1.7vw, 1.5rem)`

**Description** ("I help organisations grow..."):
- Напрямок: **зліва направо** (LTR)
- Розмір: `clamp(0.95rem, 1.4vw, 1.35rem)`

### Debounce для плавних переходів

При швидкому переміщенні курсора між секціями використовується debounce:

```typescript
// components/layout/Header.tsx
const [debouncedSection, setDebouncedSection] = useState<string | null>(null);
const [isTransitioning, setIsTransitioning] = useState(false);

// При переході між секціями: 150ms затримка
// При виході з усіх секцій: 300ms затримка
```

### Transitions

| Властивість | Тривалість | Призначення |
|-------------|------------|-------------|
| `clip-path` | 700ms | Анімація заливки тексту |
| `color` | 400ms | Плавна зміна кольору |
| `background-color` | 700ms | Зміна фону |

### Як це працює

1. Користувач наводить курсор на вікно (напр. Services)
2. `BentoGrid` викликає `onHoveredSectionChange('services')`
3. `page.tsx` оновлює background overlay кольором Services (`#EC008C`)
4. `Header.tsx` отримує `hoveredSection='services'`
5. Знаходить протилежну секцію: `oppositeSections['services'] = 'news'`
6. Заливає текст Hero кольором News (`#88B04B`)
7. При швидкому переході - debounce забезпечує плавність

---
