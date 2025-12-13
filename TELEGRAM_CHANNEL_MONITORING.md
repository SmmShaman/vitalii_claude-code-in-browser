# 📱 Telegram Channel Monitoring - Implementation Guide

## 🎯 Мета

Додати в існуючий Telegram бот функцію автоматичного моніторингу Telegram каналів для публікації новин.

---

## 🏗️ Архітектура

```
┌─────────────────────────────────────────────────────────┐
│  Telegram Channels                                       │
│  ├─ t.me/digital_gpt4_neyroseti                         │
│  ├─ t.me/geekneural                                     │
│  └─ інші...                                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ (Channel Post Updates)
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Telegram Bot (ІСНУЮЧИЙ!)                               │
│  ├─ Функція 1: Ручна публікація (є зараз) ✅           │
│  ├─ Функція 2: Моніторинг каналів (НОВА) 🆕            │
│  └─ Функція 3: Управління (Publish/Delete) ✅           │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ (Webhook)
                 ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Edge Function                                 │
│  process-news                                           │
│  ├─ Обробляє пости з каналів                           │
│  ├─ Викликає AI для перекладу                          │
│  └─ Зберігає в БД                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Як Telegram Bot Отримує Пости з Каналів?

### Варіант A: Channel Post Updates (Рекомендую ⭐)

**Коли бот є адміном каналу**, Telegram надсилає йому всі нові пости автоматично!

```javascript
bot.on('channel_post', (ctx) => {
  const post = ctx.channelPost;

  // Отримали новий пост з каналу!
  console.log('Новий пост:', post.text);
  console.log('Канал:', post.chat.title);
  console.log('Фото:', post.photo);

  // Відправляємо в Supabase для обробки
  await sendToSupabase(post);
});
```

**Що потрібно:**
1. ✅ Додати бота як **адміна** в канали
2. ✅ Дати боту права "Post Messages" (можна мінімальні)
3. ✅ Telegram автоматично надсилатиме оновлення

---

### Варіант B: Forward from Channel (Альтернатива)

Якщо не можете зробити бота адміном:

```javascript
bot.on('message', (ctx) => {
  if (ctx.message.forward_from_chat) {
    // Це переслане повідомлення з каналу
    const channel = ctx.message.forward_from_chat;

    if (allowedChannels.includes(channel.username)) {
      await sendToSupabase(ctx.message);
    }
  }
});
```

**Що потрібно:**
1. Вручну пересилати пости з каналів боту
2. Бот розпізнає що це з каналу і обробить

---

## 🔧 Що Додати в Існуючий Бот Код

### 1️⃣ Додати Обробник Channel Posts

```javascript
// У вашому боті (Node.js з Telegraf або подібне)

const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// ✅ ВЖЕ Є: Обробник для ручних повідомлень
bot.on('message', async (ctx) => {
  // Існуюча логіка для ручної публікації
  const userMessage = ctx.message.text;
  await processNews(userMessage, ctx.message.photo);
});

// 🆕 НОВЕ: Обробник для постів з каналів
bot.on('channel_post', async (ctx) => {
  const channelPost = ctx.channelPost;
  const channelUsername = channelPost.chat.username; // напр. "digital_gpt4_neyroseti"

  // Перевірити чи це дозволений канал
  const allowedChannels = await getActiveChannels(); // З news_sources

  if (!allowedChannels.includes(channelUsername)) {
    console.log(`Пропущено пост з недозволеного каналу: ${channelUsername}`);
    return;
  }

  console.log(`📱 Новий пост з каналу @${channelUsername}`);

  // Обробити як звичайну новину
  await processChannelPost(channelPost);
});

async function processChannelPost(post) {
  // 1. Отримати текст
  const text = post.text || post.caption || '';

  // 2. Отримати фото (якщо є)
  let photoUrl = null;
  if (post.photo && post.photo.length > 0) {
    const photo = post.photo[post.photo.length - 1]; // Найбільше фото
    const fileLink = await bot.telegram.getFileLink(photo.file_id);
    photoUrl = fileLink.href;
  }

  // 3. Отримати посилання на оригінальний пост
  const originalUrl = `https://t.me/${post.chat.username}/${post.message_id}`;

  // 4. Відправити в Supabase Edge Function
  const response = await fetch('https://uchmopqiylywnemvjttl.supabase.co/functions/v1/process-news', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: text,
      image_url: photoUrl,
      source_url: originalUrl,
      source_type: 'telegram_channel',
      channel_username: post.chat.username,
      auto_publish: false // Потребує ручного підтвердження
    })
  });

  const result = await response.json();
  console.log('✅ Пост оброблено:', result);
}

// Функція для отримання активних каналів з БД
async function getActiveChannels() {
  const response = await fetch(
    'https://uchmopqiylywnemvjttl.supabase.co/rest/v1/news_sources?source_type=eq.telegram&is_active=eq.true&select=url',
    {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  );

  const sources = await response.json();

  // Витягнути usernames з URLs (напр. "https://t.me/geekneural" → "geekneural")
  return sources.map(s => s.url.split('/').pop());
}

bot.launch();
```

---

### 2️⃣ Налаштувати Webhook (Опціонально)

Якщо бот працює на сервері (не локально):

```javascript
// Замість bot.launch() використовуйте webhook:
const domain = 'your-domain.com'; // Або Supabase Edge Function URL

bot.telegram.setWebhook(`https://${domain}/telegram-webhook`);

// Edge Function для обробки webhook
export default async function handler(req: Request) {
  if (req.method === 'POST') {
    const update = await req.json();
    await bot.handleUpdate(update);
    return new Response('OK', { status: 200 });
  }
  return new Response('Method not allowed', { status: 405 });
}
```

---

## 🔐 Права Доступу для Бота

### Що Потрібно Зробити:

1. **Додати бота в канали як адміна:**
   ```
   Відкрити канал → Subscribers → Add Administrator
   → Пошукати @your_bot → Додати
   ```

2. **Мінімальні права:**
   - ✅ "Post Messages" (опціонально, якщо хочете щоб бот міг писати)
   - ✅ "Edit Messages" (не обов'язково)
   - ❌ Інші права не потрібні!

3. **Права бота:**
   - Бот автоматично отримує всі пости як `channel_post` updates
   - Не потрібні особливі налаштування Privacy

---

## 📋 Checklist Імплементації

### Фаза 1: Підготовка
- [ ] Переконатися що є доступ до коду Telegram бота
- [ ] Додати бота як адміна в канали:
  - [ ] @digital_gpt4_neyroseti
  - [ ] @geekneural
- [ ] Отримати Bot Token (якщо ще немає)

### Фаза 2: Код
- [ ] Додати обробник `bot.on('channel_post')`
- [ ] Реалізувати функцію `processChannelPost()`
- [ ] Додати функцію `getActiveChannels()`
- [ ] Протестувати локально

### Фаза 3: Інтеграція
- [ ] Оновити Edge Function `process-news` для обробки `source_type: 'telegram_channel'`
- [ ] Додати поле `channel_username` в таблицю `news`
- [ ] Протестувати end-to-end workflow

### Фаза 4: Deploy
- [ ] Задеплоїти оновлений бот код
- [ ] Перевірити що webhook налаштовано (якщо використовується)
- [ ] Моніторити логи

---

## 🧪 Як Протестувати

### Тест 1: Ручний пост в канал
```
1. Напишіть пост в одному з ваших каналів
2. Бот має отримати channel_post update
3. Перевірте логи бота
4. Перевірте що новина з'явилася в БД
```

### Тест 2: Перевірка фільтрації
```
1. Напишіть пост в каналі який НЕ в списку активних
2. Бот має проігнорувати його
3. Лог: "Пропущено пост з недозволеного каналу"
```

### Тест 3: З фото
```
1. Напишіть пост з фото в каналі
2. Перевірте що фото завантажилося в Supabase Storage
3. Перевірте image_url в таблиці news
```

---

## 🐛 Troubleshooting

### Бот не отримує channel_post
**Причина:** Бот не є адміном каналу
**Рішення:** Додайте бота як адміна

### Помилка "Bot was blocked by the user"
**Причина:** Це для приватних чатів, не стосується каналів
**Рішення:** Ігноруйте, працюйте з каналами

### Фото не завантажується
**Причина:** Недостатньо прав для getFile
**Рішення:** Перевірте Bot Token, використовуйте `bot.telegram.getFileLink()`

---

## 💡 Додаткові Можливості

### Auto-Approve для перевірених каналів
```javascript
// У processChannelPost()
const trustedChannels = ['geekneural']; // Канали яким довіряємо

const autoPublish = trustedChannels.includes(post.chat.username);

await fetch('...', {
  body: JSON.stringify({
    ...data,
    auto_publish: autoPublish // Автоматична публікація!
  })
});
```

### Фільтрація за ключовими словами
```javascript
const keywords = ['AI', 'GPT', 'Claude', 'ChatGPT'];

const hasKeyword = keywords.some(kw =>
  text.toLowerCase().includes(kw.toLowerCase())
);

if (!hasKeyword) {
  console.log('Пост не містить ключових слів, пропускаємо');
  return;
}
```

### Статистика
```javascript
// Зберігати в БД скільки постів обробили з кожного каналу
await supabase
  .from('news_sources')
  .update({
    last_fetched_at: new Date(),
    posts_processed: posts_processed + 1
  })
  .eq('url', `https://t.me/${channelUsername}`);
```

---

## 📚 Корисні Посилання

- [Telegram Bot API - Channel Posts](https://core.telegram.org/bots/api#available-types)
- [Telegraf Documentation](https://telegraf.js.org/)
- [Getting File from Telegram](https://core.telegram.org/bots/api#getfile)

---

**Створено:** 2025-10-27
**Версія:** 1.0
