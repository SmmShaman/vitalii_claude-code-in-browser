## Admin Skills Management (December 2024)

### Опис

Адмін-панель для керування скілами (технологіями), які відображаються в секції Skills на головній сторінці. Кожен скіл має назву та категорію, яка визначає колір бейджу.

### Файли

```
├── utils/skillsStorage.ts              # Утиліти для зберігання скілів
├── components/admin/SkillsManager.tsx  # Адмін-компонент для керування скілами
├── components/ui/SkillsAnimation.tsx   # Анімація скілів (використовує dynamic data)
├── app/admin/dashboard/page.tsx        # Адмін дашборд з вкладкою Skills
```

### Категорії та кольори

| Категорія | Label | Tailwind Classes | HEX |
|-----------|-------|------------------|-----|
| development | Development | `bg-green-100 text-green-800` | `#dcfce7` |
| ui | UI/Design | `bg-purple-100 text-purple-800` | `#f3e8ff` |
| automation | Automation | `bg-blue-100 text-blue-800` | `#dbeafe` |
| ai | AI/ML | `bg-orange-100 text-orange-800` | `#ffedd5` |
| marketing | Marketing | `bg-pink-100 text-pink-800` | `#fce7f3` |
| integration | Integration | `bg-cyan-100 text-cyan-800` | `#cffafe` |

### Структура даних

```typescript
interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
}

type SkillCategory = 'development' | 'ui' | 'ai' | 'automation' | 'marketing' | 'integration';
```

### Зберігання

Скіли зберігаються в `localStorage` під ключем `vitalii_skills_list`.

### Функції утиліт (`utils/skillsStorage.ts`)

```typescript
// Отримати скіли з localStorage або повернути defaults
getStoredSkills(): Skill[]

// Зберегти скіли в localStorage
saveSkills(skills: Skill[]): void

// Скинути до дефолтних скілів
resetSkillsToDefault(): Skill[]

// Генерувати унікальний ID для нового скілу
generateSkillId(): string

// Конвертувати для SkillsAnimation
convertSkillsForAnimation(skills: Skill[]): { name: string; category: string }[]
```

### Дефолтні скіли

При першому завантаженні або після скидання використовуються дефолтні скіли:

**Development:** React, TypeScript, Tailwind CSS, Python, FastAPI, Docker
**Integration:** Supabase, Firebase, Vercel, Netlify
**AI/ML:** Azure OpenAI, Claude MCP, spaCy, ElevenLabs API, Zvukogram API, OCR.space
**Automation:** n8n
**Marketing:** Helium10, Meta Ads Manager
**UI/Design:** Bolt.new, Canva

### Використання в адмін-панелі

1. Перейти в **Admin Panel → Skills**
2. Додавати нові скіли через форму (назва + категорія)
3. Редагувати існуючі скіли inline
4. Видаляти скіли кнопкою trash
5. Перетягувати скіли для зміни порядку (drag & drop)
6. Натиснути **Save Changes** для збереження
7. Оновити сторінку для застосування змін на сайті

### Функціонал адмін-компонента

- Додавання нових скілів з preview
- Inline редагування назви та категорії
- Видалення скілів
- Drag & drop сортування (Framer Motion Reorder)
- Групування по категоріях
- Preview як на сайті
- Reset to Default
- Індикатор незбережених змін

---
