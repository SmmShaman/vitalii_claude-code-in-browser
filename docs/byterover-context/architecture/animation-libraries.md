## Animation Libraries

### GSAP (GreenSock)

Використовується для:
- `ProjectsCarousel` — infinite scroll carousel
- `ServicesAnimation` — staggered card animations
- `SkillsAnimation` — particle positioning

```typescript
import gsap from 'gsap'

// Timeline example
const tl = gsap.timeline({ repeat: -1 })
tl.to('.card', { x: 100, duration: 0.5, stagger: 0.1 })
```

### Framer Motion

Використовується для:
- Page transitions
- Modal animations
- Drag & drop (Skills manager)
- Hover states

```tsx
import { motion, AnimatePresence } from 'framer-motion'

<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  whileHover={{ scale: 1.05 }}
/>
```

### Three.js

Використовується для:
- `ParticleBackground` — 3D частинки на фоні

```typescript
import * as THREE from 'three'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ alpha: true })
```

---
