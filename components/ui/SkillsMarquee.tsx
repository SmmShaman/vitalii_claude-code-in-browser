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

// Full city grid: 3h (top edge, between rows, bottom edge) × 4v (left edge, 2 gaps, right edge)
function calcStreets(
  gridRect: DOMRect,
  containerRect: DOMRect,
  gap: number
) {
  const offX = gridRect.left - containerRect.left
  const offY = gridRect.top - containerRect.top
  const gw = gridRect.width
  const gh = gridRect.height

  const colW = (gw - 2 * gap) / 3
  const rowH = (gh - gap) / 2

  // Horizontal Y positions (relative to container)
  const hTop = offY // top edge of grid = space between header and row 1
  const hMid = offY + rowH + gap / 2 // between row 1 and row 2
  const hBot = offY + gh // bottom edge of grid = space between row 2 and footer

  // Vertical X positions (relative to container)
  const vLeft = offX // left edge of grid
  const v1 = offX + colW + gap / 2 // between col 1 and 2
  const v2 = offX + 2 * colW + gap + gap / 2 // between col 2 and 3
  const vRight = offX + gw // right edge of grid

  // All streets span the full page container
  const xMin = 0
  const xMax = containerRect.width
  const yMin = 0
  const yMax = containerRect.height

  const streets: Street[] = [
    { id: 'hT', axis: 'h', fixed: hTop, min: xMin, max: xMax },
    { id: 'hM', axis: 'h', fixed: hMid, min: xMin, max: xMax },
    { id: 'hB', axis: 'h', fixed: hBot, min: xMin, max: xMax },
    { id: 'vL', axis: 'v', fixed: vLeft, min: yMin, max: yMax },
    { id: 'v1', axis: 'v', fixed: v1, min: yMin, max: yMax },
    { id: 'v2', axis: 'v', fixed: v2, min: yMin, max: yMax },
    { id: 'vR', axis: 'v', fixed: vRight, min: yMin, max: yMax },
  ]

  // 12 intersections: each of 3 horizontal × 4 vertical
  const hYs = [hTop, hMid, hBot]
  const vXs = [vLeft, v1, v2, vRight]
  const hIds = ['hT', 'hM', 'hB']
  const vIds = ['vL', 'v1', 'v2', 'vR']

  const nodes: INode[] = []
  for (let hi = 0; hi < 3; hi++) {
    for (let vi = 0; vi < 4; vi++) {
      nodes.push({
        streets: [
          { sid: hIds[hi], pos: vXs[vi] },
          { sid: vIds[vi], pos: hYs[hi] },
        ]
      })
    }
  }

  return { streets, nodes }
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
  const streetLengths = streets.map(s => s.max - s.min)
  const totalLen = streetLengths.reduce((a, b) => a + b, 0)

  let placed = 0
  for (let si = 0; si < streets.length && placed < count; si++) {
    const s = streets[si]
    const len = s.max - s.min
    const share = Math.max(1, Math.round((len / totalLen) * count))
    const toPlace = Math.min(share, count - placed)
    const fwd = Math.ceil(toPlace / 2)
    const bwd = toPlace - fwd

    for (let j = 0; j < fwd && placed < count; j++) {
      ants.push({
        sid: s.id, pos: s.min + 10 + j * spacing,
        dir: 1, speed: BASE_SPEED + Math.random() * SPEED_VAR,
        cd: 0, w: badgeW, h: 16,
      })
      placed++
    }
    for (let j = 0; j < bwd && placed < count; j++) {
      ants.push({
        sid: s.id, pos: s.max - 10 - j * spacing,
        dir: -1, speed: BASE_SPEED + Math.random() * SPEED_VAR,
        cd: 0, w: badgeW, h: 16,
      })
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

  useEffect(() => {
    skillsRef.current = convertSkillsForAnimation(getStoredSkills())
  }, [])

  useEffect(() => {
    const handler = () => {
      pausedRef.current = !pausedRef.current
      window.dispatchEvent(new CustomEvent('marquee-state', { detail: { paused: pausedRef.current } }))
    }
    window.addEventListener('marquee-toggle', handler)
    return () => window.removeEventListener('marquee-toggle', handler)
  }, [])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const grid = document.querySelector('[data-bento-grid]') as HTMLElement | null
    if (!grid) return

    const computed = getComputedStyle(grid)
    const gap = parseInt(computed.gap || computed.rowGap || '20px') || 20

    const gridRect = grid.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const { streets, nodes } = calcStreets(gridRect, cRect, gap)

    const oldStreets = streetsRef.current
    streetsRef.current = streets
    nodesRef.current = nodes

    // Responsive badge sizing
    const fontSize = Math.max(8, Math.min(11, gap * 0.5))
    const padV = Math.max(1, Math.round(gap * 0.08))
    const padH = Math.max(4, Math.round(gap * 0.3))
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (!el) continue
      el.style.fontSize = `${fontSize}px`
      el.style.lineHeight = `${Math.round(fontSize * 1.5)}px`
      el.style.padding = `${padV}px ${padH}px`
    }

    let totalW = 0; let n = 0
    for (const el of badgeRefs.current) { if (el) { totalW += el.offsetWidth; n++ } }
    const avgW = n > 0 ? totalW / n : 60

    if (antsRef.current.length === 0 && skillsRef.current.length > 0) {
      antsRef.current = spawnAnts(streets, skillsRef.current.length, avgW)
    } else if (oldStreets.length > 0) {
      for (const ant of antsRef.current) {
        const oldS = oldStreets.find(s => s.id === ant.sid)
        const newS = streets.find(s => s.id === ant.sid)
        if (oldS && newS) {
          const pct = (ant.pos - oldS.min) / (oldS.max - oldS.min || 1)
          ant.pos = newS.min + pct * (newS.max - newS.min)
        }
        clampAnt(ant, streets)
      }
    }

    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      const ant = antsRef.current[i]
      if (el && ant) { ant.w = el.offsetWidth; ant.h = el.offsetHeight }
    }
  }, [])

  const tick = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time
    const dt = Math.min(time - lastTimeRef.current, 33) / 1000
    lastTimeRef.current = time
    const ants = antsRef.current
    const streets = streetsRef.current
    const nodes = nodesRef.current

    if (!pausedRef.current && !hoveredRef.current && !explodingRef.current && streets.length > 0) {
      for (let i = 0; i < ants.length; i++) {
        const ant = ants[i]
        if (ant.cd > 0) ant.cd--
        const seg = streets.find(s => s.id === ant.sid)
        if (!seg) continue

        let newPos = ant.pos + ant.dir * ant.speed * dt

        if (ant.cd === 0) {
          for (const node of nodes) {
            const conn = node.streets.find(c => c.sid === ant.sid)
            if (!conn) continue
            if (Math.abs(ant.pos - conn.pos) < INTERSECTION_NEAR) {
              const blocked = ants.some((other, oi) => {
                if (oi === i) return false
                return node.streets.some(oc =>
                  other.sid === oc.sid && Math.abs(other.pos - oc.pos) < INTERSECTION_NEAR * 2.5
                )
              })
              if (blocked) { newPos = ant.pos; break }
              if (Math.random() < TURN_CHANCE) {
                const options = node.streets.filter(c => c.sid !== ant.sid)
                if (options.length > 0) {
                  const pick = options[Math.floor(Math.random() * options.length)]
                  ant.sid = pick.sid; ant.pos = pick.pos
                  ant.dir = Math.random() < 0.5 ? 1 : -1
                  ant.cd = COOLDOWN_FRAMES
                  newPos = ant.pos + ant.dir * ant.speed * dt
                  break
                }
              }
              ant.cd = COOLDOWN_FRAMES
            }
          }
        }

        // Collision
        let closestDist = Infinity; let closestW = 0
        for (let j = 0; j < ants.length; j++) {
          if (j === i || ants[j].sid !== ant.sid) continue
          const diff = (ants[j].pos - newPos) * ant.dir
          if (diff > 0 && diff < closestDist) { closestDist = diff; closestW = ants[j].w }
        }
        if (closestDist < (ant.w + closestW) / 2 + MIN_GAP_PX) newPos = ant.pos

        if (newPos <= seg.min + 5) { ant.dir = 1; newPos = seg.min + 5 }
        if (newPos >= seg.max - 5) { ant.dir = -1; newPos = seg.max - 5 }
        ant.pos = newPos

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
      const el = badgeRefs.current[i]
      if (!el) continue
      const [cx, cy] = antXY(antsRef.current[i], streetsRef.current)
      const angle = Math.random() * Math.PI * 2
      const dist = 120 + Math.random() * 200
      el.style.transition = 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.7s ease-out'
      el.style.transform = `translate(${cx + Math.cos(angle) * dist}px, ${cy + Math.sin(angle) * dist}px) scale(0.2) rotate(${Math.random() * 720 - 360}deg)`
      el.style.opacity = '0'
    }
    setTimeout(() => {
      let tw = 0; let n = 0
      for (const el of badgeRefs.current) { if (el) { tw += el.offsetWidth; n++ } }
      antsRef.current = spawnAnts(streetsRef.current, skillsRef.current.length, n > 0 ? tw / n : 60)
      for (let i = 0; i < badgeRefs.current.length; i++) {
        const el = badgeRefs.current[i]
        if (!el) continue
        el.style.transition = 'none'; el.style.opacity = '1'
        const ant = antsRef.current[i]
        if (ant) { ant.w = el.offsetWidth; ant.h = el.offsetHeight; positionBadge(el, ant, streetsRef.current) }
      }
      explodingRef.current = false
    }, 900)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { measure(); rafRef.current = requestAnimationFrame(tick) }, 400)
    const onResize = () => {
      measure()
      for (let i = 0; i < antsRef.current.length; i++) {
        const el = badgeRefs.current[i]
        if (el) positionBadge(el, antsRef.current[i], streetsRef.current)
      }
    }
    window.addEventListener('resize', onResize)
    return () => { clearTimeout(timer); cancelAnimationFrame(rafRef.current); window.removeEventListener('resize', onResize) }
  }, [measure, tick])

  useEffect(() => { const t = setTimeout(measure, 600); return () => clearTimeout(t) }, [measure])

  const skills = skillsRef.current.length > 0
    ? skillsRef.current
    : convertSkillsForAnimation(getStoredSkills())

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[8] pointer-events-none overflow-hidden"
    >
      {skills.map((skill, i) => {
        const cat = CAT_COLORS[skill.category] || CAT_COLORS.development
        return (
          <div
            key={`mq-${i}`}
            ref={el => { badgeRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{
              fontSize: '10px', lineHeight: '15px', padding: '2px 6px',
              borderRadius: '7px', whiteSpace: 'nowrap',
              backgroundColor: cat.bg, color: cat.color,
              fontWeight: 600, letterSpacing: '0.02em',
              willChange: 'transform', backdropFilter: 'blur(4px)',
              border: `1px solid ${cat.color}33`,
              transformOrigin: 'center center',
            }}
            onMouseEnter={() => { hoveredRef.current = true }}
            onMouseLeave={() => { hoveredRef.current = false }}
            onClick={explode}
          >
            {skill.name}
          </div>
        )
      })}
    </div>
  )
}
