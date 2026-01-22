## Article Layout System

### ArticleLayout Component

**Файл:** `components/ArticleLayout.tsx`

Обгортка для standalone сторінок статей (news/blog).

```tsx
interface ArticleLayoutProps {
  children: React.ReactNode
  backHref?: string      // Default: '/'
  backLabel?: string     // Default: 'Back to Home'
}

export function ArticleLayout({ children, backHref = '/', backLabel }: ArticleLayoutProps) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ArticleHeader backHref={backHref} backLabel={backLabel} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
```

### ArticleHeader Component

**Файл:** `components/layout/ArticleHeader.tsx`

Compact sticky header для сторінок статей:
- Кнопка "Back" з посиланням
- Language switcher
- Sticky positioning при скролі

---

