## Debug Mode (December 2024)

### Опис

Система debug-логування для анімацій з можливістю вмикання/вимикання через адмін панель.

### Файли

```
├── utils/debug.ts                    # Debug утиліти
├── components/admin/DebugSettings.tsx # UI для адмін панелі
```

### Debug Utilities (`utils/debug.ts`)

```typescript
// Основні функції
- isDebugEnabled()     // Перевірка чи debug увімкнений
- setDebugMode(bool)   // Увімкнути/вимкнути debug
- debugLog(msg, ...args)   // Логування (тільки коли debug ON)
- debugWarn(msg, ...args)  // Попередження (тільки коли debug ON)
- debugError(msg, ...args) // Помилки (завжди показуються)
```

### Використання в компонентах

Debug-логи використовуються в:
- `components/sections/BentoGrid.tsx` - стани секцій, mouse events
- `components/ui/ServicesAnimation.tsx` - GSAP анімації сервісів
- `components/ui/SkillsAnimation.tsx` - explosion анімація скілів
- `components/ui/AboutAnimation.tsx` - текстова анімація About

### Як увімкнути

1. Зайти в **Admin Panel → Settings → Debug**
2. Увімкнути toggle "Console Logging"
3. Натиснути **Refresh Page Now**

### Зберігання

Debug mode зберігається в `localStorage` під ключем `vitalii_debug_mode`.

### Що логується

- Цикли анімацій (ANIMATION CYCLE)
- Mouse enter/leave події
- Стани секцій (expanded, hiding, fullscreen)
- GSAP timeline події
- Component lifecycle (mount/unmount)
- Grid bounds calculations

---
