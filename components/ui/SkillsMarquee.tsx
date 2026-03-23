'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import gsap from 'gsap'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

const SPEED = 80
const MIN_GAP_PX = 24

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  development: { bg: 'rgba(34,197,94,0.22)', color: '#4ade80' },
  ui: { bg: 'rgba(168,85,247,0.22)', color: '#c084fc' },
  ai: { bg: 'rgba(251,146,60,0.22)', color: '#fb923c' },
  automation: { bg: 'rgba(96,165,250,0.22)', color: '#60a5fa' },
  marketing: { bg: 'rgba(244,114,182,0.22)', color: '#f472b6' },
  integration: { bg: 'rgba(103,232,249,0.22)', color: '#67e8f9' },
}

type Segment = { x: number; y: number; dx: number; dy: number; len: number; angle: number }
type Path = { id: string; segments: Segment[]; length: number; loop: boolean }

function measureAllPaths(gridEl: HTMLElement, origin: DOMRect): { paths: Path[]; gap: number } | null {
  const gs = getComputedStyle(gridEl)
  const gap = parseInt(gs.gap || gs.columnGap || '20') || 20
  const halfGap = gap / 2

  const kids = Array.from(gridEl.children).filter(el => {
    const s = getComputedStyle(el as HTMLElement)
    return s.position !== 'absolute' && s.position !== 'fixed' && s.display !== 'none'
  }) as HTMLElement[]

  if (kids.length < 4) return null

  const rects = kids.map(el => {
    const r = el.getBoundingClientRect()
    return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top }
  })

  // Group into rows by Y
  const rows: typeof rects[] = []
  for (const r of rects) {
    const row = rows.find(g => Math.abs(g[0].t - r.t) < 5)
    if (row) row.push(r); else rows.push([r])
  }
  rows.sort((a, b) => a[0].t - b[0].t)
  for (const row of rows) row.sort((a, b) => a.l - b.l)

  if (rows.length < 2 || rows[0].length < 2) return null

  const row1 = rows[0]
  const row2 = rows[1]

  // Bounding box of all sections
  const secLeft = Math.min(...rects.map(r => r.l))
  const secRight = Math.max(...rects.map(r => r.r))
  const secTop = Math.min(...rects.map(r => r.t))
  const secBottom = Math.max(...rects.map(r => r.b))

  // --- Outer contour (aligned with section edges) ---
  const cx1 = Math.max(2, secLeft - halfGap)
  const cx2 = Math.min(origin.width - 2, secRight + halfGap)
  const cy1 = Math.max(2, secTop)
  const cy2 = Math.min(origin.height - 2, secBottom)
  const cw = cx2 - cx1
  const ch = cy2 - cy1

  const contour: Path = {
    id: 'contour',
    loop: true,
    length: 2 * cw + 2 * ch,
    segments: [
      { x: cx1, y: cy1, dx: 1, dy: 0, len: cw, angle: 0 },
      { x: cx2, y: cy1, dx: 0, dy: 1, len: ch, angle: 90 },
      { x: cx2, y: cy2, dx: -1, dy: 0, len: cw, angle: 180 },
      { x: cx1, y: cy2, dx: 0, dy: -1, len: ch, angle: 270 },
    ],
  }

  const paths: Path[] = [contour]

  // --- Internal horizontal street (between row1 and row2) ---
  const hGap = row2[0].t - row1[0].b
  if (hGap > 4) {
    const hY = row1[0].b + hGap / 2
    const hLen = cx2 - cx1
    paths.push({
      id: 'hMid',
      loop: false,
      length: hLen,
      segments: [{ x: cx1, y: hY, dx: 1, dy: 0, len: hLen, angle: 0 }],
    })
  }

  // --- Internal vertical streets (between columns) ---
  const widestRow = rows.reduce((a, b) => a.length >= b.length ? a : b)
  for (let i = 0; i < widestRow.length - 1; i++) {
    const vGap = widestRow[i + 1].l - widestRow[i].r
    if (vGap > 4) {
      const vX = widestRow[i].r + vGap / 2
      const vLen = cy2 - cy1
      paths.push({
        id: `v${i}`,
        loop: false,
        length: vLen,
        segments: [{ x: vX, y: cy1, dx: 0, dy: 1, len: vLen, angle: 90 }],
      })
    }
  }

  return { paths, gap }
}

function posAtDist(dist: number, segments: Segment[], length: number, loop: boolean): { x: number; y: number; angle: number } {
  let d: number
  if (loop) {
    d = ((dist % length) + length) % length
  } else {
    // Yoyo: 0→length→0→length...
    const cycle = dist % (length * 2)
    d = cycle <= length ? cycle : length * 2 - cycle
  }
  for (const seg of segments) {
    if (d <= seg.len) {
      return { x: seg.x + seg.dx * d, y: seg.y + seg.dy * d, angle: seg.angle }
    }
    d -= seg.len
  }
  return { x: segments[0].x, y: segments[0].y, angle: segments[0].angle }
}

// Determine rotation for readability
function rotForAngle(angle: number, loop: boolean, dist: number, length: number): number {
  if (!loop) {
    // For yoyo paths, check if we're going forward or backward
    const cycle = dist % (length * 2)
    const reverse = cycle > length
    if (angle === 90) return reverse ? -90 : 90
    if (angle === 0) return 0 // horizontal stays horizontal
  }
  if (angle === 90) return 90
  if (angle === 270) return -90
  return 0
}

export function SkillsMarquee() {
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([])
  const pathsRef = useRef<Path[]>([])
  const tweensRef = useRef<gsap.core.Tween[]>([])
  // One progress per path
  const progressRefs = useRef<{ value: number }[]>([])
  // Which badges belong to which path: pathAssignment[badgeIdx] = pathIdx
  const assignRef = useRef<number[]>([])
  // Offset of each badge along its path
  const offsetRef = useRef<number[]>([])
  const badgeWidthsRef = useRef<number[]>([])
  const pausedRef = useRef(false)
  const hoveredRef = useRef(false)
  const [skills] = useState(() => convertSkillsForAnimation(getStoredSkills()))

  useEffect(() => {
    const handler = () => {
      pausedRef.current = !pausedRef.current
      for (const tw of tweensRef.current) {
        pausedRef.current ? tw.pause() : tw.resume()
      }
      window.dispatchEvent(new CustomEvent('marquee-state', { detail: { paused: pausedRef.current } }))
    }
    window.addEventListener('marquee-toggle', handler)
    return () => window.removeEventListener('marquee-toggle', handler)
  }, [])

  const updatePositions = useCallback(() => {
    const paths = pathsRef.current
    const badges = badgeRefs.current
    const assigns = assignRef.current
    const offsets = offsetRef.current
    const progresses = progressRefs.current

    for (let i = 0; i < badges.length; i++) {
      const el = badges[i]
      if (!el) continue
      const pi = assigns[i]
      if (pi === undefined || !paths[pi]) continue

      const path = paths[pi]
      const progress = progresses[pi]?.value || 0
      const dist = progress + offsets[i]
      const { x, y, angle } = posAtDist(dist, path.segments, path.length, path.loop)
      const rot = rotForAngle(angle, path.loop, dist, path.length)

      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${rot}deg)`
    }
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    const gridEl = document.querySelector('[data-bento-grid]') as HTMLElement | null
    if (!container || !gridEl) return

    const cRect = container.getBoundingClientRect()
    const layout = measureAllPaths(gridEl, cRect)
    if (!layout) return

    pathsRef.current = layout.paths

    // Badge sizing
    const fs = Math.max(8, Math.min(11, layout.gap * 0.45))
    const padV = Math.max(1, Math.round(layout.gap * 0.06))
    const padH = Math.max(4, Math.round(layout.gap * 0.28))
    for (const el of badgeRefs.current) {
      if (!el) continue
      el.style.fontSize = `${fs}px`
      el.style.lineHeight = `${Math.round(fs * 1.4)}px`
      el.style.padding = `${padV}px ${padH}px`
    }
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (el) badgeWidthsRef.current[i] = el.offsetWidth
    }

    // Distribute badges across paths proportionally to path length
    const totalLen = layout.paths.reduce((a, p) => a + p.length, 0)
    const assigns: number[] = []
    const offsets: number[] = []
    let bi = 0

    for (let pi = 0; pi < layout.paths.length; pi++) {
      const path = layout.paths[pi]
      const share = Math.max(1, Math.round((path.length / totalLen) * skills.length))
      const count = Math.min(share, skills.length - bi)
      const spacing = Math.max(MIN_GAP_PX + 40, path.length / Math.max(count, 1))

      for (let j = 0; j < count && bi < skills.length; j++) {
        assigns[bi] = pi
        offsets[bi] = j * spacing
        bi++
      }
    }
    // Remaining badges go to contour
    while (bi < skills.length) {
      assigns[bi] = 0
      offsets[bi] = bi * (MIN_GAP_PX + 50)
      bi++
    }

    assignRef.current = assigns
    offsetRef.current = offsets
  }, [skills.length])

  const startAnimation = useCallback(() => {
    for (const tw of tweensRef.current) tw.kill()
    tweensRef.current = []

    const paths = pathsRef.current
    // Ensure we have progress objects for each path
    while (progressRefs.current.length < paths.length) {
      progressRefs.current.push({ value: 0 })
    }

    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi]
      const prog = progressRefs.current[pi]
      prog.value = 0

      if (path.loop) {
        // Contour: continuous loop
        const tw = gsap.to(prog, {
          value: path.length,
          duration: path.length / SPEED,
          ease: 'none',
          repeat: -1,
          onUpdate: updatePositions,
        })
        if (pausedRef.current) tw.pause()
        tweensRef.current.push(tw)
      } else {
        // Internal streets: yoyo back and forth
        const tw = gsap.to(prog, {
          value: path.length * 2, // full yoyo cycle
          duration: (path.length * 2) / SPEED,
          ease: 'none',
          repeat: -1,
          onUpdate: updatePositions,
        })
        if (pausedRef.current) tw.pause()
        tweensRef.current.push(tw)
      }
    }
  }, [updatePositions])

  const onHoverIn = useCallback(() => {
    hoveredRef.current = true
    for (const tw of tweensRef.current) tw.pause()
  }, [])

  const onHoverOut = useCallback(() => {
    hoveredRef.current = false
    if (!pausedRef.current) for (const tw of tweensRef.current) tw.resume()
  }, [])

  const explode = useCallback(() => {
    for (const tw of tweensRef.current) tw.pause()

    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const cRect = containerRef.current!.getBoundingClientRect()
      const cx = rect.left - cRect.left + rect.width / 2
      const cy = rect.top - cRect.top + rect.height / 2
      const a = Math.random() * Math.PI * 2
      const d = 120 + Math.random() * 200

      gsap.to(el, {
        x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d,
        scale: 0.2, rotation: Math.random() * 720 - 360, opacity: 0,
        duration: 0.7, ease: 'power2.out',
      })
    }

    gsap.delayedCall(1, () => {
      for (const el of badgeRefs.current) {
        if (!el) continue
        gsap.set(el, { clearProps: 'all' })
        el.style.willChange = 'transform'
      }
      for (const p of progressRefs.current) p.value = 0
      startAnimation()
    })
  }, [startAnimation])

  useEffect(() => {
    const timer = setTimeout(() => { measure(); startAnimation() }, 500)
    const onResize = () => { measure(); startAnimation() }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      for (const tw of tweensRef.current) tw.kill()
      window.removeEventListener('resize', onResize)
    }
  }, [measure, startAnimation])

  return (
    <div ref={containerRef} className="absolute inset-0 z-[5] pointer-events-none overflow-hidden" style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}>
      {skills.map((skill, i) => {
        const c = CAT_COLORS[skill.category] || CAT_COLORS.development
        return (
          <div key={`mq-${i}`} ref={el => { badgeRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: '10px', lineHeight: '14px',
              padding: '0', whiteSpace: 'nowrap',
              color: c.color, fontWeight: 600,
              letterSpacing: '0.03em', willChange: 'transform' }}
            onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} onClick={explode}
          >{skill.name}</div>
        )
      })}
    </div>
  )
}
