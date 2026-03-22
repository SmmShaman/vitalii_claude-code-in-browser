'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

// --- Tuning ---
const BASE_SPEED = 22
const SPEED_VAR = 8
const MIN_GAP_PX = 20 // minimum pixel gap between badge edges (~3 chars)
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

// Only INTERNAL gap streets — badges stay strictly between sections
function calcStreets(w: number, h: number, gap: number) {
  const colW = (w - 2 * gap) / 3
  const rowH = (h - gap) / 2

  // Internal gap centers only
  const hY = rowH + gap / 2 // horizontal gap between row 1 and 2
  const v1X = colW + gap / 2 // vertical gap between col 1 and 2
  const v2X = 2 * colW + gap + gap / 2 // vertical gap between col 2 and 3

  const streets: Street[] = [
    { id: 'h', axis: 'h', fixed: hY, min: 0, max: w },
    { id: 'v1', axis: 'v', fixed: v1X, min: 0, max: h },
    { id: 'v2', axis: 'v', fixed: v2X, min: 0, max: h },
  ]

  const nodes: INode[] = [
    { streets: [{ sid: 'h', pos: v1X }, { sid: 'v1', pos: hY }] },
    { streets: [{ sid: 'h', pos: v2X }, { sid: 'v2', pos: hY }] },
  ]

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

// Smart initialization: place ants evenly along streets without overlap
function spawnAnts(streets: Street[], count: number, badgeW: number): Ant[] {
  const ants: Ant[] = []
  const spacing = badgeW + MIN_GAP_PX

  // Calculate how many fit per street
  const streetLengths = streets.map(s => s.max - s.min)
  const totalLen = streetLengths.reduce((a, b) => a + b, 0)

  let placed = 0
  for (let si = 0; si < streets.length && placed < count; si++) {
    const s = streets[si]
    const len = s.max - s.min
    // Proportional allocation
    const share = Math.max(1, Math.round((len / totalLen) * count))
    const toPlace = Math.min(share, count - placed)

    // Two lanes: half go forward (+1), half backward (-1)
    // Forward ants start from min, backward from max
    const fwd = Math.ceil(toPlace / 2)
    const bwd = toPlace - fwd

    // Forward lane
    for (let j = 0; j < fwd && placed < count; j++) {
      ants.push({
        sid: s.id,
        pos: s.min + 10 + j * spacing,
        dir: 1,
        speed: BASE_SPEED + Math.random() * SPEED_VAR,
        cd: 0, w: badgeW, h: 16,
      })
      placed++
    }
    // Backward lane
    for (let j = 0; j < bwd && placed < count; j++) {
      ants.push({
        sid: s.id,
        pos: s.max - 10 - j * spacing,
        dir: -1,
        speed: BASE_SPEED + Math.random() * SPEED_VAR,
        cd: 0, w: badgeW, h: 16,
      })
      placed++
    }
  }

  // Clamp all to street bounds
  for (const ant of ants) clampAnt(ant, streets)
  return ants
}

// Get minimum safe distance between two ants on the same street
function safeDist(a: Ant, b: Ant): number {
  return (a.w + b.w) / 2 + MIN_GAP_PX
}

interface Props {
  gridRef: React.RefObject<HTMLDivElement | null>
}

export function SkillsMarquee({ gridRef }: Props) {
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
    const grid = gridRef.current
    const container = containerRef.current
    if (!grid || !container) return

    const computed = getComputedStyle(grid)
    const gap = parseInt(computed.gap || computed.rowGap || '20px') || 20

    const rect = grid.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const offX = rect.left - cRect.left
    const offY = rect.top - cRect.top
    const { streets, nodes } = calcStreets(rect.width, rect.height, gap)

    for (const s of streets) {
      if (s.axis === 'h') { s.fixed += offY; s.min += offX; s.max += offX }
      else { s.fixed += offX; s.min += offY; s.max += offY }
    }
    for (const n of nodes) {
      for (const c of n.streets) {
        const st = streets.find(s => s.id === c.sid)!
        if (st.axis === 'h') c.pos += offX; else c.pos += offY
      }
    }

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

    // Measure average badge width after font update
    let totalW = 0; let measured = 0
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (el) { totalW += el.offsetWidth; measured++ }
    }
    const avgW = measured > 0 ? totalW / measured : 60

    if (antsRef.current.length === 0 && skillsRef.current.length > 0) {
      // Smart spawn: no overlaps
      antsRef.current = spawnAnts(streets, skillsRef.current.length, avgW)
    } else if (oldStreets.length > 0) {
      // Remap on resize
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

    // Update actual badge sizes on ants
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      const ant = antsRef.current[i]
      if (el && ant) { ant.w = el.offsetWidth; ant.h = el.offsetHeight }
    }
  }, [gridRef])

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

        // Intersections
        if (ant.cd === 0) {
          for (let ni = 0; ni < nodes.length; ni++) {
            const node = nodes[ni]
            const conn = node.streets.find(c => c.sid === ant.sid)
            if (!conn) continue
            if (Math.abs(ant.pos - conn.pos) < INTERSECTION_NEAR) {
              // Check intersection blocked by any ant on connected streets
              const blocked = ants.some((other, oi) => {
                if (oi === i) return false
                for (const oc of node.streets) {
                  if (other.sid === oc.sid && Math.abs(other.pos - oc.pos) < INTERSECTION_NEAR * 2.5) return true
                }
                return false
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

        // Collision: find closest ant AHEAD on same street, enforce gap
        let closestDist = Infinity
        let closestW = 0
        for (let j = 0; j < ants.length; j++) {
          if (j === i || ants[j].sid !== ant.sid) continue
          const diff = (ants[j].pos - newPos) * ant.dir
          if (diff > 0 && diff < closestDist) {
            closestDist = diff
            closestW = ants[j].w
          }
        }
        const minDist = (ant.w + closestW) / 2 + MIN_GAP_PX
        if (closestDist < minDist) {
          // Stop: maintain gap
          newPos = ant.pos
        }

        // Bounce at edges
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
      // Measure widths for re-spawn
      let totalW = 0; let n = 0
      for (const el of badgeRefs.current) {
        if (el) { totalW += el.offsetWidth; n++ }
      }
      antsRef.current = spawnAnts(streetsRef.current, skillsRef.current.length, n > 0 ? totalW / n : 60)
      for (let i = 0; i < badgeRefs.current.length; i++) {
        const el = badgeRefs.current[i]
        if (!el) continue
        el.style.transition = 'none'
        el.style.opacity = '1'
        const ant = antsRef.current[i]
        if (ant) {
          ant.w = el.offsetWidth; ant.h = el.offsetHeight
          positionBadge(el, ant, streetsRef.current)
        }
      }
      explodingRef.current = false
    }, 900)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      measure()
      rafRef.current = requestAnimationFrame(tick)
    }, 300)

    const onResize = () => {
      measure()
      for (let i = 0; i < antsRef.current.length; i++) {
        const el = badgeRefs.current[i]
        if (el) positionBadge(el, antsRef.current[i], streetsRef.current)
      }
    }
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [measure, tick])

  useEffect(() => {
    const timer = setTimeout(measure, 500)
    return () => clearTimeout(timer)
  }, [measure])

  const skills = skillsRef.current.length > 0
    ? skillsRef.current
    : convertSkillsForAnimation(getStoredSkills())

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[15] pointer-events-none overflow-hidden"
    >
      {skills.map((skill, i) => {
        const cat = CAT_COLORS[skill.category] || CAT_COLORS.development
        return (
          <div
            key={`mq-${i}`}
            ref={el => { badgeRefs.current[i] = el }}
            className="absolute top-0 left-0 pointer-events-auto cursor-pointer select-none"
            style={{
              fontSize: '10px',
              lineHeight: '15px',
              padding: '2px 6px',
              borderRadius: '7px',
              whiteSpace: 'nowrap',
              backgroundColor: cat.bg,
              color: cat.color,
              fontWeight: 600,
              letterSpacing: '0.02em',
              willChange: 'transform',
              backdropFilter: 'blur(4px)',
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
