## Mobile Detection Hooks

**Файл:** `hooks/useIsMobile.ts`

### useIsMobile()

Визначає чи пристрій мобільний (ширина < 768px).

```typescript
export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return isMobile
}
```

### useIsTablet()

Визначає чи пристрій планшет (768px ≤ ширина < 1024px).

```typescript
export const useIsTablet = (): boolean => {
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkTablet = () => {
      const width = window.innerWidth
      setIsTablet(width >= 768 && width < 1024)
    }
    checkTablet()
    window.addEventListener('resize', checkTablet)
    return () => window.removeEventListener('resize', checkTablet)
  }, [])

  return isTablet
}
```

**SSR-безпечність:** Initial state `false`, оновлюється при mount.

---
