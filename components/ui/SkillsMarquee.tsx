'use client'

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
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

type Segment = {
  x: number; y: number; dx: number; dy: number; len: number; angle: number
  arc?: { cx: number; cy: number; r: number; startA: number; endA: number; rotStart: number; rotEnd: number }
}
type Path = { id: string; segments: Segment[]; length: number; loop: boolean }

function measureAllPaths(gridEl: HTMLElement, origin: DOMRect): { paths: Path[]; gap: number } | null {
  const gs = getComputedStyle(gridEl)
  const gap = parseInt(gs.gap || gs.columnGap || '20') || 20

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

  // --- Anchor: midline between rows (the single Y reference) ---
  const hGap = row2[0].t - row1[0].b
  const hMidY = row1[0].b + hGap / 2
  const hHalf = hGap / 2

  // --- Anchor: midlines between columns (X references) ---
  const widestRow = rows.reduce((a, b) => a.length >= b.length ? a : b)
  const vMids: { x: number; half: number }[] = []
  for (let i = 0; i < widestRow.length - 1; i++) {
    const vg = widestRow[i + 1].l - widestRow[i].r
    if (vg > 4) {
      vMids.push({ x: widestRow[i].r + vg / 2, half: vg / 2 })
    }
  }
  const vHalf = vMids.length > 0 ? vMids[0].half : hHalf

  // --- Outer contour: same offset from sections as internal midlines ---
  const cx1 = Math.max(2, secLeft - vHalf)
  const cx2 = Math.min(origin.width - 2, secRight + vHalf)
  const cy1 = Math.max(2, secTop - hHalf)
  const cy2 = Math.min(origin.height - 2, secBottom + hHalf)
  const cw = cx2 - cx1
  const ch = cy2 - cy1

  // Rounded corners: radius = smaller of the two half-gaps
  const r = Math.min(hHalf, vHalf)
  const arcLen = r * Math.PI / 2
  const topLen = cw - 2 * r
  const rightLen = ch - 2 * r
  const bottomLen = cw - 2 * r
  const leftLen = ch - 2 * r
  const arcSeg = (cx: number, cy: number, startA: number, endA: number, rotStart: number, rotEnd: number): Segment => ({
    x: 0, y: 0, dx: 0, dy: 0, len: arcLen, angle: -1,
    arc: { cx, cy, r, startA, endA, rotStart, rotEnd },
  })

  const contour: Path = {
    id: 'contour',
    loop: true,
    length: topLen + rightLen + bottomLen + leftLen + 4 * arcLen,
    segments: [
      // Top edge (left → right)
      { x: cx1 + r, y: cy1, dx: 1, dy: 0, len: topLen, angle: 0 },
      // Top-right arc
      arcSeg(cx2 - r, cy1 + r, -Math.PI / 2, 0, 0, 90),
      // Right edge (top → bottom)
      { x: cx2, y: cy1 + r, dx: 0, dy: 1, len: rightLen, angle: 90 },
      // Bottom-right arc
      arcSeg(cx2 - r, cy2 - r, 0, Math.PI / 2, 90, 0),
      // Bottom edge (right → left)
      { x: cx2 - r, y: cy2, dx: -1, dy: 0, len: bottomLen, angle: 180 },
      // Bottom-left arc
      arcSeg(cx1 + r, cy2 - r, Math.PI / 2, Math.PI, 0, -90),
      // Left edge (bottom → top)
      { x: cx1, y: cy2 - r, dx: 0, dy: -1, len: leftLen, angle: 270 },
      // Top-left arc
      arcSeg(cx1 + r, cy1 + r, Math.PI, Math.PI * 3 / 2, -90, 0),
    ],
  }

  const paths: Path[] = [contour]

  // --- Internal horizontal street (exactly at row midline) ---
  if (hGap > 4) {
    const hLen = cx2 - cx1
    paths.push({
      id: 'hMid',
      loop: false,
      length: hLen,
      segments: [{ x: cx1, y: hMidY, dx: 1, dy: 0, len: hLen, angle: 0 }],
    })
  }

  // --- Internal vertical streets (at column midlines, only in row gap) ---
  for (let i = 0; i < vMids.length; i++) {
    const vStart = row1[0].b
    const vEnd = row2[0].t
    const vLen = vEnd - vStart
    if (vLen > 4) {
      paths.push({
        id: `v${i}`,
        loop: false,
        length: vLen,
        segments: [{ x: vMids[i].x, y: vStart, dx: 0, dy: 1, len: vLen, angle: 90 }],
      })
    }
  }

  return { paths, gap }
}

function posAtDist(dist: number, segments: Segment[], length: number, loop: boolean): { x: number; y: number; angle: number; rot?: number } {
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
      if (seg.arc) {
        const t = seg.len > 0 ? d / seg.len : 0
        const a = seg.arc.startA + t * (seg.arc.endA - seg.arc.startA)
        return {
          x: seg.arc.cx + seg.arc.r * Math.cos(a),
          y: seg.arc.cy + seg.arc.r * Math.sin(a),
          angle: -1,
          rot: seg.arc.rotStart + t * (seg.arc.rotEnd - seg.arc.rotStart),
        }
      }
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
  const charRefs = useRef<(HTMLSpanElement | null)[]>([])
  const pathsRef = useRef<Path[]>([])
  const tweensRef = useRef<gsap.core.Tween[]>([])
  const progressRefs = useRef<{ value: number }[]>([])
  // Per-skill: which path and base offset
  const assignRef = useRef<number[]>([])
  const offsetRef = useRef<number[]>([])
  // Per-char: cumulative offset within its skill
  const charOffsetsRef = useRef<number[]>([])
  const pausedRef = useRef(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [skills] = useState(() => convertSkillsForAnimation(getStoredSkills()))

  // Flat list of characters with skill association
  const skillChars = useMemo(() => {
    const result: { char: string; skillIdx: number; category: string }[] = []
    skills.forEach((skill, si) => {
      skill.name.split('').forEach(ch => {
        result.push({ char: ch === ' ' ? '\u00A0' : ch, skillIdx: si, category: skill.category })
      })
    })
    return result
  }, [skills])

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
    const chars = charRefs.current
    const assigns = assignRef.current
    const offsets = offsetRef.current
    const charOffsets = charOffsetsRef.current
    const progresses = progressRefs.current

    for (let ci = 0; ci < chars.length; ci++) {
      const el = chars[ci]
      if (!el) continue
      const si = skillChars[ci].skillIdx
      const pi = assigns[si]
      if (pi === undefined || !paths[pi]) continue

      const path = paths[pi]
      const progress = progresses[pi]?.value || 0
      const dist = progress + (offsets[si] || 0) + (charOffsets[ci] || 0)
      const pos = posAtDist(dist, path.segments, path.length, path.loop)
      const rot = pos.rot !== undefined ? pos.rot : rotForAngle(pos.angle, path.loop, dist, path.length)

      el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${rot}deg)`
    }
  }, [skillChars])

  const measure = useCallback(() => {
    const container = containerRef.current
    const gridEl = document.querySelector('[data-bento-grid]') as HTMLElement | null
    if (!container || !gridEl) return

    const cRect = container.getBoundingClientRect()
    const layout = measureAllPaths(gridEl, cRect)
    if (!layout) return

    pathsRef.current = layout.paths

    // Character sizing based on gap
    const fs = Math.max(8, Math.min(11, layout.gap * 0.45))
    for (const el of charRefs.current) {
      if (!el) continue
      el.style.fontSize = `${fs}px`
      el.style.lineHeight = `${Math.round(fs * 1.4)}px`
    }

    // Measure char widths → cumulative offsets within each skill
    const charOffsets: number[] = []
    const skillWidths: number[] = new Array(skills.length).fill(0)
    let currentSkill = -1
    let cumWidth = 0
    const letterGap = fs * 0.08

    for (let ci = 0; ci < skillChars.length; ci++) {
      const si = skillChars[ci].skillIdx
      if (si !== currentSkill) {
        if (currentSkill >= 0) skillWidths[currentSkill] = cumWidth
        currentSkill = si
        cumWidth = 0
      }
      charOffsets[ci] = cumWidth
      const el = charRefs.current[ci]
      cumWidth += (el ? el.offsetWidth : fs * 0.6) + letterGap
    }
    if (currentSkill >= 0) skillWidths[currentSkill] = cumWidth
    charOffsetsRef.current = charOffsets

    // Distribute skills across paths proportionally
    const totalLen = layout.paths.reduce((a, p) => a + p.length, 0)
    const maxSkillW = Math.max(...skillWidths, 0)
    const assigns: number[] = []
    const offsets: number[] = []
    let bi = 0

    for (let pi = 0; pi < layout.paths.length; pi++) {
      const path = layout.paths[pi]
      const share = Math.max(1, Math.round((path.length / totalLen) * skills.length))
      const count = Math.min(share, skills.length - bi)
      const spacing = Math.max(maxSkillW + MIN_GAP_PX, path.length / Math.max(count, 1))

      for (let j = 0; j < count && bi < skills.length; j++) {
        assigns[bi] = pi
        offsets[bi] = j * spacing
        bi++
      }
    }
    while (bi < skills.length) {
      assigns[bi] = 0
      offsets[bi] = bi * (maxSkillW + MIN_GAP_PX)
      bi++
    }

    assignRef.current = assigns
    offsetRef.current = offsets
  }, [skills.length, skillChars])

  const startAnimation = useCallback(() => {
    for (const tw of tweensRef.current) tw.kill()
    tweensRef.current = []

    const paths = pathsRef.current
    while (progressRefs.current.length < paths.length) {
      progressRefs.current.push({ value: 0 })
    }

    for (let pi = 0; pi < paths.length; pi++) {
      const path = paths[pi]
      const prog = progressRefs.current[pi]
      prog.value = 0

      if (path.loop) {
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
        const tw = gsap.to(prog, {
          value: path.length * 2,
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

  // Debounced hover to avoid flicker between adjacent chars
  const onHoverIn = useCallback(() => {
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null }
    for (const tw of tweensRef.current) tw.pause()
  }, [])

  const onHoverOut = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => {
      if (!pausedRef.current) for (const tw of tweensRef.current) tw.resume()
    }, 50)
  }, [])

  const explode = useCallback(() => {
    for (const tw of tweensRef.current) tw.pause()

    for (let i = 0; i < charRefs.current.length; i++) {
      const el = charRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      const cRect = containerRef.current!.getBoundingClientRect()
      const cx = rect.left - cRect.left + rect.width / 2
      const cy = rect.top - cRect.top + rect.height / 2
      const a = Math.random() * Math.PI * 2
      const d = 80 + Math.random() * 160

      gsap.to(el, {
        x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d,
        scale: 0.2, rotation: Math.random() * 720 - 360, opacity: 0,
        duration: 0.6, ease: 'power2.out', delay: i * 0.003,
      })
    }

    gsap.delayedCall(1.2, () => {
      for (const el of charRefs.current) {
        if (!el) continue
        gsap.set(el, { clearProps: 'x,y,scale,rotation,opacity,transform' })
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
    <div ref={containerRef} className="absolute inset-0 z-[8] pointer-events-none overflow-hidden">
      {skillChars.map((ch, i) => {
        const c = CAT_COLORS[ch.category] || CAT_COLORS.development
        return (
          <span key={`ch-${i}`} ref={el => { charRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{ fontFamily: 'Comfortaa, sans-serif', fontSize: '10px', lineHeight: '14px',
              color: c.color, fontWeight: 600, willChange: 'transform' }}
            onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} onClick={explode}
          >{ch.char}</span>
        )
      })}
    </div>
  )
}
