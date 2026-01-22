## Content Management

### Blog Posts (`blog_posts` table)
- Мультимовний контент (title_en, title_no, title_ua)
- SEO-friendly slugs для кожної мови
- Категорії, теги, reading_time
- is_published, is_featured флаги

### News (`news` table)
- Мультимовний контент
- Система пре-модерації (pre_moderation_status)
- Підтримка відео (YouTube, Telegram fallback)
- Поля: `video_type`, `video_url`
- is_rewritten, is_published флаги

### Moderation Workflow
1. Новини збираються з RSS/Telegram джерел
2. AI переписує контент (is_rewritten)
3. Пре-модерація (pending → approved/rejected)
4. Публікація (is_published)

---
