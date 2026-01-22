## AI Prompts Selection Fix (December 2024)

### Опис

Виправлення вибору AI промптів з бази даних. Тепер завжди береться **останній оновлений** промпт замість випадкового.

### Проблема

При наявності кількох промптів з однаковим `prompt_type` (напр. два `blog_rewrite`), запит `.limit(1)` без сортування повертав **перший знайдений** в непередбачуваному порядку. Це призводило до використання старого промпту замість відредагованого.

### Рішення

Додано `.order('updated_at', { ascending: false })` перед `.limit(1)`:

```typescript
// До (неправильно)
const { data: prompts } = await supabase
  .from('ai_prompts')
  .select('*')
  .eq('is_active', true)
  .eq('prompt_type', 'blog_rewrite')
  .limit(1)  // ❌ Може повернути будь-який промпт

// Після (правильно)
const { data: prompts } = await supabase
  .from('ai_prompts')
  .select('*')
  .eq('is_active', true)
  .eq('prompt_type', 'blog_rewrite')
  .order('updated_at', { ascending: false })  // ✅ Найновіший перший
  .limit(1)
```

### Виправлені функції

| Функція | Тип промпту | Файл |
|---------|-------------|------|
| `process-blog-post` | `blog_rewrite` | `supabase/functions/process-blog-post/index.ts` |
| `pre-moderate-news` | `pre_moderation` | `supabase/functions/pre-moderate-news/index.ts` |
| `process-news` | `news_rewrite`, `rewrite` | `supabase/functions/process-news/index.ts` |

### Як працює

1. Якщо в базі є кілька промптів з однаковим `prompt_type`
2. Обидва можуть бути `is_active = true`
3. Тепер береться той, що має найновіший `updated_at`
4. Редагування промпту в адмін-панелі автоматично оновлює `updated_at`

### Deploy

```bash
cd supabase
supabase functions deploy process-blog-post
supabase functions deploy pre-moderate-news
supabase functions deploy process-news
```

---
