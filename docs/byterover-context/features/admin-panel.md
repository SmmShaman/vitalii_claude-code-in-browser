## Admin Panel

### Доступ

1. URL: `/admin/login`
2. Email + Password authentication
3. Redirect до `/admin/dashboard`

### Вкладки Dashboard

| Вкладка | Функціонал |
|---------|------------|
| **Queue** | Перегляд pending/approved/rejected новин |
| **AI Prompts** | Редагування AI промптів (pre_moderation, rewrite, image_generation) |
| **Skills** | CRUD для технологій (drag & drop сортування) |
| **LinkedIn** | Управління LinkedIn публікаціями (repost, статистика) |
| **Image Processing** | Налаштування Gemini AI для обробки зображень (сезонні теми) |
| **API Keys** | Управління зовнішніми API ключами (Google, LinkedIn) |
| **Debug** | Toggle console logging для анімацій |
| **Settings** | Загальні налаштування |

### Skills Manager

- Додавання нових скілів (назва + категорія)
- Inline редагування
- Drag & drop сортування (Framer Motion Reorder)
- Групування по категоріях
- Зберігання в localStorage

---
