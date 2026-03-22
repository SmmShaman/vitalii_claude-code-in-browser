'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

const BASE_SPEED = 22
const SPEED_VAR = 8
const MIN_GAP_PX = 20
const INTERSECTION_NEAR = 10
const TURN_CHANCE = 0.45
const COOLDOWN_FRAMES = 50

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  development: { bg: 'rgba(34,197,94,0.22)', color: '#4ade80' },
  ui: { bg: 'rgba(168,85,247,0.22)', color: '#c084fc' },
  ai: { bg: 'rgba(251,146,60,0.22)', color: '#fb923c' },
  automation: { bg: 'rgba(96,165,250,0.22)', color: '#60a5fa' },
  marketing: { bg: 'rgba(244,114,182,0.22)', color: '#f472b6' },
  integration: { bg: 'rgba(103,232,249,0.22)', color: '#67e8f9' },
}

type Street = { id: string; axis: 'h' | 'v'; fixed: number; min: number; max: number }
type INode = { streets: { sid: string; pos: number }[] }
type Ant = { sid: string; pos: number; dir: 1 | -1; speed: number; cd: number; w: number; h: number }

// Measure actual grid layout from DOM computed styles
function measureLayout(gridEl: HTMLElement, cRect: DOMRect) {
  const gs = getComputedStyle(gridEl)
  const gap = parseInt(gs.gap || gs.columnGap || '20') || 20
  const cols = gs.gridTemplateColumns.split(/\s+/).map(parseFloat).filter(v => !isNaN(v))
  const rows = gs.gridTemplateRows.split(/\s+/).map(parseFloat).filter(v => !isNaN(v))

  const gr = gridEl.getBoundingClientRect()
  const gL = gr.left - cRect.left
  const gT = gr.top - cRect.top
  const gR = gr.right - cRect.left
  const gB = gr.bottom - cRect.top
  const cW = cRect.width
  const cH = cRect.height

  // Internal vertical gap X centers (between columns)
  const vIntX: number[] = []
  let cx = gL
  for (let i = 0; i < cols.length - 1; i++) {
    cx += cols[i]
    vIntX.push(cx + gap / 2)
    cx += gap
  }

  // Internal horizontal gap Y centers (between rows)
  const hIntY: number[] = []
  let cy = gT
  for (let i = 0; i < rows.length - 1; i++) {
    cy += rows[i]
    hIntY.push(cy + gap / 2)
    cy += gap
  }

  // Edge streets: centered in the margin space around the grid
  const marginTop = gT
  const marginBot = cH - gB
  const marginLeft = gL
  const marginRight = cW - gR

  const hTopY = marginTop > 4 ? gT - marginTop / 2 : gT - 2
  const hBotY = marginBot > 4 ? gB + marginBot / 2 : gB + 2
  const vLeftX = marginLeft > 4 ? gL - marginLeft / 2 : gL - 2
  const vRightX = marginRight > 4 ? gR + marginRight / 2 : gR + 2

  // All street positions
  const hYs = [hTopY, ...hIntY, hBotY]
  const hIds = ['hT', ...hIntY.map((_, i) => `hM${i}`), 'hB']
  const vXs = [vLeftX, ...vIntX, vRightX]
  const vIds = ['vL', ...vIntX.map((_, i) => `v${i}`), 'vR']

  // Bounding rectangle: streets confined to the area around the 6 windows
  const minX = vLeftX
  const maxX = vRightX
  const minY = hTopY
  const maxY = hBotY

  const streets: Street[] = [
    ...hIds.map((id, i) => ({
      id, axis: 'h' as const, fixed: hYs[i], min: minX, max: maxX
    })),
    ...vIds.map((id, i) => ({
      id, axis: 'v' as const, fixed: vXs[i], min: minY, max: maxY
    })),
  ]

  // 12 intersections: every h × v crossing
  const nodes: INode[] = []
  for (let hi = 0; hi < hYs.length; hi++) {
    for (let vi = 0; vi < vXs.length; vi++) {
      nodes.push({
        streets: [
          { sid: hIds[hi], pos: vXs[vi] },
          { sid: vIds[vi], pos: hYs[hi] },
        ]
      })
    }
  }

  return { streets, nodes, gap }
}

function antXY(ant: Ant, streets: Street[]): [number, number] {
  const s = streets.find(s => s.id === ant.sid)!
  return s.axis === 'h' ? [ant.pos, s.fixed] : [s.fixed, ant.pos]
}

function clampAnt(ant: Ant, streets: Street[]) {
  const s = streets.find(s => s.id === ant.sid)
  if (!s) return
  ant.pos = Math.max(s.min + 5, Math.min(s.max - 5, ant.pos))
}

function positionBadge(el: HTMLDivElement, ant: Ant, streets: Street[]) {
  const [x, y] = antXY(ant, streets)
  const seg = streets.find(s => s.id === ant.sid)
  if (seg && seg.axis === 'v') {
    const rot = ant.dir === 1 ? 90 : -90
    el.style.transform = `translate(${x - ant.h / 2}px, ${y - ant.w / 2}px) rotate(${rot}deg)`
  } else {
    el.style.transform = `translate(${x - ant.w / 2}px, ${y - ant.h / 2}px)`
  }
}

function spawnAnts(streets: Street[], count: number, badgeW: number): Ant[] {
  const ants: Ant[] = []
  const spacing = badgeW + MIN_GAP_PX
  const lengths = streets.map(s => Math.max(0, s.max - s.min))
  const total = lengths.reduce((a, b) => a + b, 0)
  let placed = 0

  for (let si = 0; si < streets.length && placed < count; si++) {
    const s = streets[si]
    const len = s.max - s.min
    if (len < spacing) continue
    const share = Math.max(1, Math.round((len / total) * count))
    const toPlace = Math.min(share, count - placed)
    const fwd = Math.ceil(toPlace / 2)
    const bwd = toPlace - fwd

    for (let j = 0; j < fwd && placed < count; j++) {
      ants.push({ sid: s.id, pos: s.min + 10 + j * spacing, dir: 1,
        speed: BASE_SPEED + Math.random() * SPEED_VAR, cd: 0, w: badgeW, h: 16 })
      placed++
    }
    for (let j = 0; j < bwd && placed < count; j++) {
      ants.push({ sid: s.id, pos: s.max - 10 - j * spacing, dir: -1,
        speed: BASE_SPEED + Math.random() * SPEED_VAR, cd: 0, w: badgeW, h: 16 })
      placed++
    }
  }

  for (const ant of ants) clampAnt(ant, streets)
  return ants
}

export function SkillsMarquee() {
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRefs = useRef<(HTMLDivElement | null)[]>([])
  const antsRef = useRef<Ant[]>([])
  const streetsRef = useRef<Street[]>([])
  const nodesRef = useRef<INode[]>([])
  const rafRef = useRef(0)
  const lastTimeRef = useRef(0)
  const pausedRef = useRef(false)
  const hoveredRef = useRef(false)
  const explodingRef = useRef(false)
  const skillsRef = useRef<{ name: string; category: string }[]>([])

  useEffect(() => { skillsRef.current = convertSkillsForAnimation(getStoredSkills()) }, [])

  useEffect(() => {
    const h = () => {
      pausedRef.current = !pausedRef.current
      window.dispatchEvent(new CustomEvent('marquee-state', { detail: { paused: pausedRef.current } }))
    }
    window.addEventListener('marquee-toggle', h)
    return () => window.removeEventListener('marquee-toggle', h)
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    const gridEl = document.querySelector('[data-bento-grid]') as HTMLElement | null
    if (!container || !gridEl) return

    const cRect = container.getBoundingClientRect()
    const layout = measureLayout(gridEl, cRect)
    if (!layout) return

    const oldStreets = streetsRef.current
    streetsRef.current = layout.streets
    nodesRef.current = layout.nodes

    // Responsive badge sizing
    const fs = Math.max(8, Math.min(11, layout.gap * 0.5))
    const pv = Math.max(1, Math.round(layout.gap * 0.08))
    const ph = Math.max(4, Math.round(layout.gap * 0.3))
    for (const el of badgeRefs.current) {
      if (!el) continue
      el.style.fontSize = `${fs}px`
      el.style.lineHeight = `${Math.round(fs * 1.5)}px`
      el.style.padding = `${pv}px ${ph}px`
    }

    let tw = 0; let n = 0
    for (const el of badgeRefs.current) { if (el) { tw += el.offsetWidth; n++ } }
    const avgW = n > 0 ? tw / n : 60

    if (antsRef.current.length === 0 && skillsRef.current.length > 0) {
      antsRef.current = spawnAnts(layout.streets, skillsRef.current.length, avgW)
    } else if (oldStreets.length > 0) {
      for (const ant of antsRef.current) {
        const os = oldStreets.find(s => s.id === ant.sid)
        const ns = layout.streets.find(s => s.id === ant.sid)
        if (os && ns) { ant.pos = ns.min + ((ant.pos - os.min) / (os.max - os.min || 1)) * (ns.max - ns.min) }
        clampAnt(ant, layout.streets)
      }
    }

    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]; const ant = antsRef.current[i]
      if (el && ant) { ant.w = el.offsetWidth; ant.h = el.offsetHeight }
    }
  }, [])

  const tick = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time
    const dt = Math.min(time - lastTimeRef.current, 33) / 1000
    lastTimeRef.current = time
    const ants = antsRef.current; const streets = streetsRef.current; const nodes = nodesRef.current

    if (!pausedRef.current && !hoveredRef.current && !explodingRef.current && streets.length > 0) {
      for (let i = 0; i < ants.length; i++) {
        const ant = ants[i]
        if (ant.cd > 0) ant.cd--
        const seg = streets.find(s => s.id === ant.sid)
        if (!seg) continue
        let np = ant.pos + ant.dir * ant.speed * dt

        if (ant.cd === 0) {
          for (const node of nodes) {
            const conn = node.streets.find(c => c.sid === ant.sid)
            if (!conn) continue
            if (Math.abs(ant.pos - conn.pos) < INTERSECTION_NEAR) {
              const blocked = ants.some((o, oi) => oi !== i &&
                node.streets.some(oc => o.sid === oc.sid && Math.abs(o.pos - oc.pos) < INTERSECTION_NEAR * 2.5))
              if (blocked) { np = ant.pos; break }
              if (Math.random() < TURN_CHANCE) {
                const opts = node.streets.filter(c => c.sid !== ant.sid)
                if (opts.length > 0) {
                  const pick = opts[Math.floor(Math.random() * opts.length)]
                  ant.sid = pick.sid; ant.pos = pick.pos
                  ant.dir = Math.random() < 0.5 ? 1 : -1
                  ant.cd = COOLDOWN_FRAMES
                  np = ant.pos + ant.dir * ant.speed * dt; break
                }
              }
              ant.cd = COOLDOWN_FRAMES
            }
          }
        }

        let cd = Infinity; let cw = 0
        for (let j = 0; j < ants.length; j++) {
          if (j === i || ants[j].sid !== ant.sid) continue
          const d = (ants[j].pos - np) * ant.dir
          if (d > 0 && d < cd) { cd = d; cw = ants[j].w }
        }
        if (cd < (ant.w + cw) / 2 + MIN_GAP_PX) np = ant.pos
        if (np <= seg.min + 5) { ant.dir = 1; np = seg.min + 5 }
        if (np >= seg.max - 5) { ant.dir = -1; np = seg.max - 5 }
        ant.pos = np
        const el = badgeRefs.current[i]
        if (el) positionBadge(el, ant, streets)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const explode = useCallback(() => {
    if (explodingRef.current) return
    explodingRef.current = true
    for (let i = 0; i < antsRef.current.length; i++) {
      const el = badgeRefs.current[i]; if (!el) continue
      const [cx, cy] = antXY(antsRef.current[i], streetsRef.current)
      const a = Math.random() * Math.PI * 2; const d = 120 + Math.random() * 200
      el.style.transition = 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.7s ease-out'
      el.style.transform = `translate(${cx + Math.cos(a) * d}px, ${cy + Math.sin(a) * d}px) scale(0.2) rotate(${Math.random() * 720 - 360}deg)`
      el.style.opacity = '0'
    }
    setTimeout(() => {
      let tw = 0; let n = 0
      for (const el of badgeRefs.current) { if (el) { tw += el.offsetWidth; n++ } }
      antsRef.current = spawnAnts(streetsRef.current, skillsRef.current.length, n > 0 ? tw / n : 60)
      for (let i = 0; i < badgeRefs.current.length; i++) {
        const el = badgeRefs.current[i]; if (!el) continue
        el.style.transition = 'none'; el.style.opacity = '1'
        const ant = antsRef.current[i]
        if (ant) { ant.w = el.offsetWidth; ant.h = el.offsetHeight; positionBadge(el, ant, streetsRef.current) }
      }
      explodingRef.current = false
    }, 900)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { measure(); rafRef.current = requestAnimationFrame(tick) }, 400)
    const r = () => { measure(); antsRef.current.forEach((ant, i) => {
      const el = badgeRefs.current[i]; if (el) positionBadge(el, ant, streetsRef.current)
    })}
    window.addEventListener('resize', r)
    return () => { clearTimeout(t); cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', r) }
  }, [measure, tick])

  useEffect(() => { const t = setTimeout(measure, 600); return () => clearTimeout(t) }, [measure])

  const skills = skillsRef.current.length > 0 ? skillsRef.current : convertSkillsForAnimation(getStoredSkills())

  return (
    <div ref={containerRef} className="absolute inset-0 z-[8] pointer-events-none overflow-hidden">
      {skills.map((skill, i) => {
        const c = CAT_COLORS[skill.category] || CAT_COLORS.development
        return (
          <div key={`mq-${i}`} ref={el => { badgeRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{ fontSize: '10px', lineHeight: '15px', padding: '2px 6px', borderRadius: '7px',
              whiteSpace: 'nowrap', backgroundColor: c.bg, color: c.color, fontWeight: 600,
              letterSpacing: '0.02em', willChange: 'transform', backdropFilter: 'blur(4px)',
              border: `1px solid ${c.color}33`, transformOrigin: 'center center' }}
            onMouseEnter={() => { hoveredRef.current = true }}
            onMouseLeave={() => { hoveredRef.current = false }}
            onClick={explode}>{skill.name}</div>
        )
      })}
    </div>
  )
}
