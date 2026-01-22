## Translation System

### Як працює

1. **TranslationContext** (`contexts/TranslationContext.tsx`)
   - Зберігає поточну мову (`en` | `no` | `ua`)
   - Надає функцію `t(key)` для перекладу

2. **Translations** (`utils/translations.ts`)
   - 3000+ ключів перекладу
   - Структура: `{ en: {...}, no: {...}, ua: {...} }`

3. **Використання в компонентах:**
```tsx
import { useTranslations } from '@/contexts/TranslationContext'

function MyComponent() {
  const { t, language, setLanguage } = useTranslations()

  return (
    <div>
      <h1>{t('welcome_title')}</h1>
      <button onClick={() => setLanguage('ua')}>UA</button>
    </div>
  )
}
```

### Мультимовний контент в БД

Кожен запис має окремі поля для кожної мови:
- `title_en`, `title_no`, `title_ua`
- `content_en`, `content_no`, `content_ua`
- `slug_en`, `slug_no`, `slug_ua`

---
