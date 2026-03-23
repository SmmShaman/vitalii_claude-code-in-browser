'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import gsap from 'gsap'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

const SPEED = 80 // px per second along the contour
const MIN_GAP_PX = 24

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  development: { bg: 'rgba(34,197,94,0.22)', color: '#4ade80' },
  ui: { bg: 'rgba(168,85,247,0.22)', color: '#c084fc' },
  ai: { bg: 'rgba(251,146,60,0.22)', color: '#fb923c' },
  automation: { bg: 'rgba(96,165,250,0.22)', color: '#60a5fa' },
  marketing: { bg: 'rgba(244,114,182,0.22)', color: '#f472b6' },
  integration: { bg: 'rgba(103,232,249,0.22)', color: '#67e8f9' },
}

// Contour: rectangular path around all 6 sections
// Returns segments: [{x,y,len,angle}, ...] forming a closed loop
type Segment = { x: number; y: number; dx: number; dy: number; len: number; angle: number }

function measureContour(gridEl: HTMLElement, origin: DOMRect): { segments: Segment[]; perimeter: number; gap: number } | null {
  // Read the actual CSS Grid gap
  const gs = getComputedStyle(gridEl)
  const gap = parseInt(gs.gap || gs.columnGap || '20') || 20
  const halfGap = gap / 2

  // Find visible section children
  const kids = Array.from(gridEl.children).filter(el => {
    const s = getComputedStyle(el as HTMLElement)
    return s.position !== 'absolute' && s.position !== 'fixed' && s.display !== 'none'
  }) as HTMLElement[]

  if (kids.length < 2) return null

  const rects = kids.map(el => {
    const r = el.getBoundingClientRect()
    return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top }
  })

  // Bounding box of all sections
  const secLeft = Math.min(...rects.map(r => r.l))
  const secRight = Math.max(...rects.map(r => r.r))
  const secTop = Math.min(...rects.map(r => r.t))
  const secBottom = Math.max(...rects.map(r => r.b))

  // Contour = half a gap outward from section edges
  // Clamped to container bounds so we never go outside the visible area
  const cx1 = Math.max(2, secLeft - halfGap)
  const cx2 = Math.min(origin.width - 2, secRight + halfGap)
  const cy1 = Math.max(2, secTop - halfGap)
  const cy2 = Math.min(origin.height - 2, secBottom + halfGap)

  const w = cx2 - cx1
  const h = cy2 - cy1

  if (w < 50 || h < 50) return null

  // Clockwise path: top → right → bottom → left
  const segments: Segment[] = [
    { x: cx1, y: cy1, dx: 1, dy: 0, len: w, angle: 0 },
    { x: cx2, y: cy1, dx: 0, dy: 1, len: h, angle: 90 },
    { x: cx2, y: cy2, dx: -1, dy: 0, len: w, angle: 180 },
    { x: cx1, y: cy2, dx: 0, dy: -1, len: h, angle: 270 },
  ]

  const perimeter = 2 * w + 2 * h
  return { segments, perimeter, gap }
}

// Convert distance along perimeter to x, y, angle
function posAtDist(dist: number, segments: Segment[], perimeter: number): { x: number; y: number; angle: number } {
  let d = ((dist % perimeter) + perimeter) % perimeter // wrap around
  for (const seg of segments) {
    if (d <= seg.len) {
      return {
        x: seg.x + seg.dx * d,
        y: seg.y + seg.dy * d,
        angle: seg.angle,
      }
    }
    d -= seg.len
  }
  // Fallback
  return { x: segments[0].x, y: segments[0].y, angle: 0 }
}

export function SkillsMarquee() {
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([])
  const tweenRef = useRef<gsap.core.Tween | null>(null)
  const progressRef = useRef({ value: 0 }) // 0 to perimeter, looping
  const segmentsRef = useRef<Segment[]>([])
  const perimeterRef = useRef(0)
  const badgeWidthsRef = useRef<number[]>([])
  const pausedRef = useRef(false)
  const hoveredRef = useRef(false)
  const [skills] = useState(() => convertSkillsForAnimation(getStoredSkills()))

  // Header pause/play
  useEffect(() => {
    const handler = () => {
      pausedRef.current = !pausedRef.current
      if (tweenRef.current) {
        pausedRef.current ? tweenRef.current.pause() : tweenRef.current.resume()
      }
      window.dispatchEvent(new CustomEvent('marquee-state', { detail: { paused: pausedRef.current } }))
    }
    window.addEventListener('marquee-toggle', handler)
    return () => window.removeEventListener('marquee-toggle', handler)
  }, [])

  // Position all badges along the contour based on progressRef.value
  const updatePositions = useCallback(() => {
    const segs = segmentsRef.current
    const per = perimeterRef.current
    if (!segs.length || !per) return

    const badges = badgeRefs.current
    const widths = badgeWidthsRef.current
    const base = progressRef.current.value

    // Distribute badges evenly, each offset by accumulated width + gap
    let offset = 0
    for (let i = 0; i < badges.length; i++) {
      const el = badges[i]
      if (!el) continue
      const w = widths[i] || 60
      const dist = base + offset
      const { x, y, angle } = posAtDist(dist, segs, per)

      // Rotation for readability:
      // Top (0°): normal
      // Right (90°): rotated 90° CW
      // Bottom (180°): keep horizontal (text reads right-to-left visually but still LTR)
      // Left (270°): rotated -90°
      let rot = 0
      if (angle === 90) rot = 90
      else if (angle === 270) rot = -90
      // On bottom edge, text moves left but stays horizontal (no flip)

      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg)`
      offset += w + MIN_GAP_PX
    }
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    const gridEl = document.querySelector('[data-bento-grid]') as HTMLElement | null
    if (!container || !gridEl) return

    const cRect = container.getBoundingClientRect()
    const layout = measureContour(gridEl, cRect)
    if (!layout) return

    segmentsRef.current = layout.segments
    perimeterRef.current = layout.perimeter

    // Responsive badge sizing: fit within the gap width
    const fs = Math.max(8, Math.min(11, layout.gap * 0.45))
    const padV = Math.max(1, Math.round(layout.gap * 0.06))
    const padH = Math.max(4, Math.round(layout.gap * 0.28))
    for (const el of badgeRefs.current) {
      if (!el) continue
      el.style.fontSize = `${fs}px`
      el.style.lineHeight = `${Math.round(fs * 1.4)}px`
      el.style.padding = `${padV}px ${padH}px`
    }

    // Measure actual badge widths after resize
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (el) badgeWidthsRef.current[i] = el.offsetWidth
    }
  }, [])

  // Start GSAP animation
  const startAnimation = useCallback(() => {
    if (tweenRef.current) tweenRef.current.kill()

    const per = perimeterRef.current
    if (!per) return

    // Duration = perimeter / speed
    const duration = per / SPEED

    tweenRef.current = gsap.to(progressRef.current, {
      value: per,
      duration,
      ease: 'none',
      repeat: -1,
      onUpdate: updatePositions,
    })

    if (pausedRef.current) tweenRef.current.pause()
  }, [updatePositions])

  // Hover: pause/resume
  const onHoverIn = useCallback(() => {
    hoveredRef.current = true
    tweenRef.current?.pause()
  }, [])

  const onHoverOut = useCallback(() => {
    hoveredRef.current = false
    if (!pausedRef.current) tweenRef.current?.resume()
  }, [])

  // Explosion on click
  const explode = useCallback(() => {
    if (!tweenRef.current) return
    tweenRef.current.pause()

    const badges = badgeRefs.current
    for (let i = 0; i < badges.length; i++) {
      const el = badges[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const cRect = containerRef.current!.getBoundingClientRect()
      const cx = rect.left - cRect.left + rect.width / 2
      const cy = rect.top - cRect.top + rect.height / 2
      const angle = Math.random() * Math.PI * 2
      const dist = 120 + Math.random() * 200

      gsap.to(el, {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        scale: 0.2,
        rotation: Math.random() * 720 - 360,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
      })
    }

    // Reset after explosion
    gsap.delayedCall(1, () => {
      progressRef.current.value = 0
      for (const el of badges) {
        if (!el) continue
        gsap.set(el, { clearProps: 'all' })
        el.style.willChange = 'transform'
      }
      startAnimation()
    })
  }, [startAnimation])

  // Init
  useEffect(() => {
    const timer = setTimeout(() => {
      measure()
      updatePositions()
      startAnimation()
    }, 500)

    const onResize = () => {
      measure()
      // Restart animation with new perimeter
      startAnimation()
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(timer)
      tweenRef.current?.kill()
      window.removeEventListener('resize', onResize)
    }
  }, [measure, updatePositions, startAnimation])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[8] pointer-events-none overflow-hidden"
    >
      {skills.map((skill, i) => {
        const c = CAT_COLORS[skill.category] || CAT_COLORS.development
        return (
          <div
            key={`mq-${i}`}
            ref={el => { badgeRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{
              fontFamily: 'Comfortaa, sans-serif',
              fontSize: '10px',
              lineHeight: '14px',
              padding: '2px 8px',
              borderRadius: '8px',
              whiteSpace: 'nowrap',
              backgroundColor: c.bg,
              color: c.color,
              fontWeight: 600,
              letterSpacing: '0.03em',
              willChange: 'transform',
              backdropFilter: 'blur(4px)',
              border: `1px solid ${c.color}33`,
            }}
            onMouseEnter={onHoverIn}
            onMouseLeave={onHoverOut}
            onClick={explode}
          >
            {skill.name}
          </div>
        )
      })}
    </div>
  )
}
