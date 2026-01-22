## Instagram Integration (January 2025)

### Опис

Публікація новин та блог-постів у Instagram через Facebook Graph API. Instagram Business акаунт повинен бути з'єднаний з Facebook Page.

### Файли

```
├── supabase/functions/post-to-instagram/index.ts    # Edge Function для публікації
├── supabase/functions/_shared/facebook-helpers.ts   # Instagram API helpers
```

### Environment Variables

| Variable | Опис | Де знайти |
|----------|------|-----------|
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Page Access Token з Instagram дозволами | Meta Business Suite / Graph API Explorer |
| `INSTAGRAM_ACCOUNT_ID` | ID Instagram Business акаунта | Facebook Page Settings → Instagram |
| `FACEBOOK_PAGE_ID` | ID Facebook Page (optional) | Facebook Page → About |

### Необхідні Scopes (дозволи токена)

```
instagram_basic          - Базовий доступ до Instagram API
instagram_content_publish - Публікація контенту (ОБОВ'ЯЗКОВИЙ!)
pages_read_engagement    - Читання даних сторінки
pages_manage_posts       - Управління постами
```

### Типові помилки

| Error Code | Опис | Рішення |
|------------|------|---------|
| **#10** | Application does not have permission | Токен не має `instagram_content_publish` scope. Перегенеруйте токен. |
| **#190** | Invalid OAuth access token | Токен недійсний або прострочений. Створіть новий. |
| **#100** | Invalid parameter | Перевірте що image URL публічно доступний та використовує HTTPS. |
| **#24** | Rate limit exceeded | Досягнуто ліміт API. Зачекайте 24 години. |

### Debug Mode

Для діагностики токена відправте POST запит з `{ "debug": true }`:

```bash
curl -X POST "${SUPABASE_URL}/functions/v1/post-to-instagram" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"debug": true}'
```

**Відповідь покаже:**
- Чи токен дійсний
- Які scopes має токен
- Чи Instagram акаунт пов'язаний з Page
- Конкретні проблеми та як їх виправити

### Як виправити Error #10

**Крок 1:** Відкрийте [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

**Крок 2:** Виберіть ваш App

**Крок 3:** Натисніть "Generate Access Token" → виберіть вашу Facebook Page

**Крок 4:** Додайте дозволи (клікніть "Add a Permission"):
- ✅ `instagram_basic`
- ✅ `instagram_content_publish`
- ✅ `pages_read_engagement`
- ✅ `pages_manage_posts`

**Крок 5:** Натисніть "Generate Access Token" та авторизуйте

**Крок 6:** Конвертуйте в Long-Lived Token (60 днів):
```bash
curl "https://graph.facebook.com/v18.0/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id={APP_ID}&\
client_secret={APP_SECRET}&\
fb_exchange_token={SHORT_LIVED_TOKEN}"
```

**Крок 7:** Оновіть Supabase Secrets:
```bash
supabase secrets set FACEBOOK_PAGE_ACCESS_TOKEN="новий_long_lived_токен"
```

### Отримання INSTAGRAM_ACCOUNT_ID

```bash
# Знайти Instagram Business Account ID через Facebook Page
curl "https://graph.facebook.com/v18.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}"

# Відповідь:
# { "instagram_business_account": { "id": "17841234567890" }, "id": "PAGE_ID" }
```

Скопіюйте `id` з `instagram_business_account` та оновіть:
```bash
supabase secrets set INSTAGRAM_ACCOUNT_ID="17841234567890"
```

### Вимоги до Instagram акаунта

1. **Business Account** - не Personal, не Creator
2. **Пов'язаний з Facebook Page** - через Facebook Page Settings → Instagram
3. **Facebook App** повинен мати затверджені Instagram permissions (для production)

### Deploy

```bash
cd supabase
supabase functions deploy post-to-instagram
supabase functions deploy telegram-webhook

# Set secrets
supabase secrets set FACEBOOK_PAGE_ACCESS_TOKEN="your_token"
supabase secrets set INSTAGRAM_ACCOUNT_ID="your_ig_account_id"
supabase secrets set FACEBOOK_PAGE_ID="your_page_id"  # optional
```

---
