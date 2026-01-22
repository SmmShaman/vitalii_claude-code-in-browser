## Analytics via Google Tag Manager (January 2025)

### Опис

Комплексна аналітика через Google Tag Manager (GTM) як центральний хаб для всіх трекінг-пікселів: GA4, Meta Pixel, LinkedIn Insight Tag, Hotjar.

### Архітектура

```
┌─────────────────────────────────────────────────────────┐
│                    Google Tag Manager                    │
│                     (GTM-5XBL8L8S)                       │
├─────────────┬─────────────┬─────────────┬───────────────┤
│   GA4       │  Meta Pixel │  LinkedIn   │   Hotjar      │
│  G-XXXXX    │ 239052299.. │ Insight Tag │   (optional)  │
└─────────────┴─────────────┴─────────────┴───────────────┘
                         ▲
                         │ dataLayer.push()
                         │
┌─────────────────────────────────────────────────────────┐
│              Next.js 15 Application                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │          TrackingContext                         │    │
│  │  - trackPageView() (auto)                        │    │
│  │  - trackFormSubmit()                             │    │
│  │  - trackArticleView()                            │    │
│  │  - trackShare()                                  │    │
│  │  - trackLanguageChange()                         │    │
│  │  - trackSectionClick()                           │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Файли

```
├── utils/gtm.ts                        # GTM utility functions (dataLayer)
├── contexts/TrackingContext.tsx        # React Context для трекінгу
├── components/analytics/GTMScript.tsx  # GTM скрипт + noscript fallback
```

### GTM Utility Functions (`utils/gtm.ts`)

```typescript
// Основні функції
pageview(url, title?)                    // Автоматичний page view
trackEvent(eventName, data)              // Custom event
trackFormSubmit(formName, formData?)     // Form submission
trackArticleView(type, id, title, lang?) // News/Blog view
trackShare(platform, url, title?)        // Social sharing
trackLanguageChange(newLang, prevLang?)  // Language switch
trackSectionClick(sectionName)           // BentoGrid section
trackOutboundLink(url, text?)            // External links
trackVideoInteraction(action, url, title?) // Video play/pause/complete
```

### TrackingContext (`contexts/TrackingContext.tsx`)

```typescript
import { useTracking } from '@/contexts/TrackingContext'

function MyComponent() {
  const { trackShare, trackFormSubmit } = useTracking()

  const handleShare = () => {
    trackShare('linkedin', '/blog/my-post', 'My Post Title')
  }
}
```

**Автоматичний page view:** Context автоматично відправляє `page_view` при зміні route.

### Події для трекінгу

| Подія | Компонент | Дані |
|-------|-----------|------|
| `page_view` | Auto (pathname change) | page_path, page_title |
| `form_submit` | ContactForm | form_name, email_domain |
| `article_view` | NewsArticle, BlogArticle | content_type, content_id, content_title, language |
| `share` | ShareButtons | method (linkedin/twitter/copy), content_url |
| `language_change` | TranslationContext | language (en/no/ua), previous_language |
| `section_click` | BentoGrid | section_name (about/services/projects/skills/news/blog) |
| `outbound_link` | External links | link_url, link_domain |

### Інтеграція в компоненти

**ShareButtons.tsx:**
```typescript
const { trackShare } = useTracking()
// При копіюванні посилання
trackShare('copy', fullUrl, title)
```

**NewsArticle.tsx / BlogArticle.tsx:**
```typescript
const tracking = useTrackingSafe()
// При завантаженні статті
tracking?.trackArticleView('news', data.id, title, currentLanguage)
```

**TranslationContext.tsx:**
```typescript
import { trackLanguageChange } from '@/utils/gtm'
// При зміні мови
trackLanguageChange(lang, previousLang)
```

**BentoGrid.tsx:**
```typescript
import { trackSectionClick } from '@/utils/gtm'
// При кліку на секцію
trackSectionClick(section.id)
```

### Environment Variables

```env
NEXT_PUBLIC_GTM_ID=GTM-5XBL8L8S
```

**Важливо:** Додати в Netlify Environment Variables для production.

### GTM Console Configuration

Піксели налаштовуються в [GTM Console](https://tagmanager.google.com):

#### 1. Meta Pixel (Facebook/Instagram)
- **Tag Type:** Custom HTML
- **Pixel ID:** 239052299989404
- **Trigger:** All Pages

#### 2. Google Analytics 4
- **Tag Type:** GA4 Configuration
- **Measurement ID:** G-XXXXXXXXXX
- **Trigger:** All Pages

#### 3. LinkedIn Insight Tag
- **Tag Type:** Custom HTML
- **Partner ID:** від LinkedIn Campaign Manager
- **Trigger:** All Pages

### Верифікація

**Локально:**
```javascript
// DevTools Console
console.log(window.dataLayer)
```

**Production:**
- [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper) (Chrome extension)
- [Google Tag Assistant](https://tagassistant.google.com/)
- GA4 DebugView (realtime)

### Checklist

- [x] GTM скрипт додано в layout.tsx
- [x] TrackingContext працює
- [x] page_view події відправляються автоматично
- [x] article_view трекається (news/blog)
- [x] share трекається (LinkedIn, Twitter, Copy)
- [x] language_change трекається
- [x] section_click трекається (BentoGrid)
- [x] Meta Pixel налаштовано в GTM
- [ ] GA4 налаштовано в GTM (optional)
- [ ] LinkedIn Insight налаштовано в GTM (optional)

---
