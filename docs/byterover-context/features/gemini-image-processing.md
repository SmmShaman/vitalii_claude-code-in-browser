## Google Gemini Image Processing

**Edge Function:** `supabase/functions/process-image/index.ts`

Обробка зображень через Google Gemini 2.5 Flash.

### Prompt Types:

| Type | Опис |
|------|------|
| `enhance` | General quality enhancement |
| `linkedin_optimize` | Professional look for LinkedIn (1200x627) |
| `generate` | Generate new image from context |
| `custom` | Custom prompt from user |

### Request Schema:

```typescript
interface ProcessImageRequest {
  imageUrl: string
  newsId?: string
  promptType?: 'enhance' | 'linkedin_optimize' | 'generate' | 'custom'
  customPrompt?: string
  newsTitle?: string        // For context injection
  newsDescription?: string
  newsUrl?: string
}
```

### Placeholders for prompts:

- `{title}` - Article title
- `{description}` - Article description
- `{url}` - Article URL

### API Key Source:

1. Environment variable `GOOGLE_API_KEY`
2. Fallback to `api_settings` table

---

