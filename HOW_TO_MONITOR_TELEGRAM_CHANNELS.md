# 📱 Як Моніторити Публічні Telegram Канали

## 🎯 Проблема

Ви хочете автоматично отримувати пости з **публічних** Telegram каналів (наприклад @geekneural, @digital_gpt4_neyroseti), але **ви НЕ власник цих каналів**.

---

## ✅ Рішення 1: Ручна Пересилка (Найпростіше)

### Як працює:

```
Ви бачите пост в каналі
        ↓
Forward (пересилка) → Ваш бот
        ↓
Бот обробляє автоматично
        ↓
Новина з'являється в БД
        ↓
Ви натискаєте ✅ Publish
```

### Інструкція:

1. **Відкрийте канал** (напр. @geekneural) у Telegram
2. **Виберіть пост** який хочете опублікувати
3. **Forward** → пошукайте вашого бота
4. **Готово!** Бот відповість: `✅ Forwarded message sent for processing!`

### Код бота (УЖЕ працює):

```typescript
// supabase/functions/telegram-webhook/index.ts:119-186
if (message.forward_from_chat && message.forward_from_chat.type === 'channel') {
  console.log('📨 Forwarded message from channel')

  // Обробити текст і фото
  const text = message.text || message.caption || ''
  let photoUrl = await getPhotoUrl(message)

  // Викликати process-news
  await fetch(`${SUPABASE_URL}/functions/v1/process-news`, {
    method: 'POST',
    body: JSON.stringify({
      content: text,
      imageUrl: photoUrl,
      sourceType: 'telegram_forward',
      channelUsername: message.forward_from_chat.username
    })
  })
}
```

### Переваги:
- ✅ Працює ЗАРАЗ (не потрібно нічого налаштовувати)
- ✅ Працює для БУДЬ-ЯКИХ каналів
- ✅ Ви контролюєте які пости публікувати
- ✅ Немає rate limits
- ✅ Немає потреби бути адміном

### Недоліки:
- ❌ Не повністю автоматично (потрібна ваша дія Forward)

---

## ✅ Рішення 2: RSS Bridge (Автоматичний Моніторинг)

### Для автоматичного моніторингу потрібен **власний** RSS Bridge instance.

**Чому не працює публічний rsshub.app:**
```
FloodWaitError: A wait of 37303 seconds is required
```
Telegram блокує публічні інстанси через багато запитів.

### Розгортання власного RSS Bridge:

#### Docker:
```bash
docker run -d \
  --name rssbridge \
  -p 3000:3000 \
  rssbridge/rss-bridge
```

#### Docker Compose:
```yaml
version: '3'
services:
  rssbridge:
    image: rssbridge/rss-bridge
    ports:
      - "3000:3000"
    environment:
      - TELEGRAM_BOT_TOKEN=your_optional_token
```

### Додати до БД:

```sql
INSERT INTO news_sources (name, url, source_type, is_active, fetch_interval)
VALUES
  ('geekneural', 'http://your-server:3000/?action=display&bridge=Telegram&username=geekneural&format=Atom', 'rss', true, 3600),
  ('digital_gpt4', 'http://your-server:3000/?action=display&bridge=Telegram&username=digital_gpt4_neyroseti&format=Atom', 'rss', true, 3600);
```

### Переваги:
- ✅ Повністю автоматично
- ✅ Немає rate limits (ваш власний IP)
- ✅ Працює для будь-яких каналів

### Недоліки:
- ❌ Потрібен сервер для RSS Bridge
- ❌ Налаштування та підтримка

---

## ✅ Рішення 3: Telegram Client API

Використати Telegram Client API (не Bot API).

### Як працює:

1. Створити App на https://my.telegram.org/apps
2. Отримати `api_id` і `api_hash`
3. Використати бібліотеку `gramjs` або `telegram`

### Приклад Edge Function:

```typescript
import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'

const client = new TelegramClient(
  new StringSession(''),
  parseInt(Deno.env.get('TELEGRAM_API_ID')),
  Deno.env.get('TELEGRAM_API_HASH'),
  {}
)

// Підключитися до каналу
const messages = await client.getMessages('geekneural', { limit: 10 })

for (const msg of messages) {
  // Обробити повідомлення
  await processNews(msg.text, msg.photo)
}
```

### Переваги:
- ✅ Повністю автоматично
- ✅ Працює для будь-яких публічних каналів
- ✅ Більше можливостей ніж Bot API

### Недоліки:
- ❌ Складніше в налаштуванні
- ❌ Потрібні додаткові credentials
- ❌ Потрібна авторизація через phone number

---

## 🎯 Яке Рішення Вибрати?

### Для початку:
**Використовуйте Рішення 1 (Ручна Пересилка)** - воно працює ЗАРАЗ!

### Якщо потрібна повна автоматизація:
**Розгорніть RSS Bridge (Рішення 2)** - найпростіше для автоматизації.

### Якщо потрібні додаткові функції:
**Telegram Client API (Рішення 3)** - найпотужніше рішення.

---

## 📝 Поточний Статус

### Що УЖЕ працює:
- ✅ Ручна пересилка через Telegram бота
- ✅ Обробка фото + тексту
- ✅ AI переклад
- ✅ Кнопки Publish/Reject

### Що НЕ працює:
- ❌ Автоматичний моніторинг через Bot API (потрібен доступ адміна)
- ❌ Автоматичний моніторинг через публічний RSS Bridge (rate limit)

---

## 🧪 Тестування Ручної Пересилки

### Крок 1: Перешліть пост

1. Відкрийте @geekneural у Telegram
2. Виберіть будь-який пост
3. Forward → ваш бот

### Крок 2: Перевірте відповідь

Бот має відповісти:
```
✅ Forwarded message sent for processing!
```

### Крок 3: Перевірте БД

```bash
curl "https://uchmopqiylywnemvjttl.supabase.co/rest/v1/news?order=created_at.desc&limit=1" \
  -H "apikey: YOUR_KEY" \
  | jq .
```

Нова новина має з'явитися з:
- `source_type = 'telegram_forward'`
- `is_published = false`

### Крок 4: Опублікуйте

Бот надішле повідомлення з кнопками:
- ✅ **Publish** → публікує новину
- ❌ **Reject** → видаляє

---

## 📊 Dashboard Integration

У вашому Dashboard (`NewsSourcesManager.tsx`) канали додані як:

```typescript
{
  name: "geekneural (Telegram RSS)",
  url: "https://rsshub.app/telegram/channel/geekneural",
  source_type: "rss",
  is_active: true
}
```

**Але:** публічний rsshub.app не працює через rate limit.

**Рішення:**
1. Змініть `url` на ваш власний RSS Bridge instance
2. Або використовуйте ручну пересилку (не потрібні зміни)

---

**Створено:** 2025-10-27
**Бот Token:** `8223281731:AAEUlmDSJCG1RVm2uGOSX-atnQiLEXNfXd8`
**Webhook:** `https://uchmopqiylywnemvjttl.supabase.co/functions/v1/telegram-webhook`
