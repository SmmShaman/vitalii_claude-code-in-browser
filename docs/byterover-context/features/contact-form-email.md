## Contact Form Email System (January 2025)

### Опис

Система відправки email через контактні форми на сайті з 3-рівневою захистом від спаму. Повідомлення відправляються на email адміністратора через Resend API.

### Архітектура

```
┌─────────────────────────────────────────────────────────────┐
│                   Contact Forms (Frontend)                   │
│  - ContactForm.tsx (desktop BentoGrid)                       │
│  - Footer.tsx (footer email modal)                           │
│  - BentoGridMobile.tsx (mobile contact modal)                │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Spam Protection:                                        ││
│  │ - Honeypot field (hidden)                               ││
│  │ - Timestamp check (< 3 sec = bot)                       ││
│  │ - Client-side rate limiting (localStorage)              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────┬───────────────────────────┘
                                  │ POST
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│           Supabase Edge Function: send-contact-email         │
│  1. Honeypot check (spam filter)                             │
│  2. Timestamp check (< 3 sec = bot)                          │
│  3. Rate limiting: max 3 requests per 10 min per IP          │
│  4. Save to contact_forms table                              │
│  5. Send email via Resend API                                │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Resend Email Service                    │
│  - From: Vitalii.no Contact <onboarding@resend.dev>         │
│  - To: berbeha@vitalii.no                                    │
│  - Reply-To: sender's email                                  │
│  - HTML template with styled content                         │
└─────────────────────────────────────────────────────────────┘
```

### Файли

```
├── supabase/functions/send-contact-email/index.ts  # Edge Function
├── components/sections/ContactForm.tsx              # Desktop contact form
├── components/layout/Footer.tsx                     # Footer email modal
├── components/sections/BentoGridMobile.tsx          # Mobile contact modal
├── integrations/supabase/client.ts                  # sendContactEmail() function
```

### Spam Protection (3 рівні)

| Рівень | Метод | Опис |
|--------|-------|------|
| 1 | **Honeypot** | Приховане поле, яке боти заповнюють автоматично |
| 2 | **Timestamp** | Форма заповнена < 3 секунд = бот |
| 3 | **Rate Limiting** | Max 3 повідомлення за 10 хвилин з одного IP |

### API Response

```typescript
interface ContactEmailResponse {
  success: boolean;
  message: string;
}

// Success
{ success: true, message: "Message sent successfully! We will get back to you soon." }

// Rate limited
{ success: false, message: "Too many requests. Please try again later." }

// Validation error
{ success: false, message: "All fields are required." }
```

### Environment Variables (Supabase Secrets)

```bash
# Set via Supabase CLI
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxx"
supabase secrets set ADMIN_EMAIL="berbeha@vitalii.no"
```

### Resend Setup

1. Зареєструватися на [resend.com](https://resend.com) (безкоштовно: 3,000 emails/місяць)
2. Створити API ключ в Dashboard
3. Для production: верифікувати домен vitalii.no
4. Додати ключ в Supabase Secrets

### Deploy

```bash
# Deploy Edge Function
supabase functions deploy send-contact-email --no-verify-jwt

# Set secrets
supabase secrets set RESEND_API_KEY="re_xxxxxxxxxxxxx"
supabase secrets set ADMIN_EMAIL="berbeha@vitalii.no"
```

### Email Template

Edge Function відправляє styled HTML email:
- Gradient header з іконкою
- Поля: Name, Email (clickable mailto:), Message
- Footer з датою та IP адресою відправника
- Reply-To встановлено на email відправника

---
