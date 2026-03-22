'use client'

import { useEffect, useRef, useCallback } from 'react'
import { getStoredSkills, convertSkillsForAnimation } from '@/utils/skillsStorage'

// --- Layout ---
const GAP = 20
const BASE_SPEED = 25 // px/s
const SPEED_VAR = 10
const COLLISION_DIST = 6
const INTERSECTION_NEAR = 8
const TURN_CHANCE = 0.5
const COOLDOWN_FRAMES = 40

const CAT_COLORS: Record<string, { bg: string; color: string }> = {
  development: { bg: 'rgba(34,197,94,0.18)', color: '#4ade80' },
  ui: { bg: 'rgba(168,85,247,0.18)', color: '#c084fc' },
  ai: { bg: 'rgba(251,146,60,0.18)', color: '#fb923c' },
  automation: { bg: 'rgba(96,165,250,0.18)', color: '#60a5fa' },
  marketing: { bg: 'rgba(244,114,182,0.18)', color: '#f472b6' },
  integration: { bg: 'rgba(103,232,249,0.18)', color: '#67e8f9' },
}

type Street = { id: string; axis: 'h' | 'v'; fixed: number; min: number; max: number }
type INode = { streets: { sid: string; pos: number }[] }
type Ant = {
  sid: string; pos: number; dir: 1 | -1; speed: number; cd: number
  w: number; h: number
}

function calcStreets(w: number, h: number) {
  const cw = (w - 2 * GAP) / 3
  const rh = (h - GAP) / 2
  const hY = rh + GAP / 2
  const v1X = cw + GAP / 2
  const v2X = 2 * cw + GAP + GAP / 2

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
  const widthsRef = useRef<number[]>([])

  // Load skills once
  useEffect(() => {
    const stored = getStoredSkills()
    skillsRef.current = convertSkillsForAnimation(stored)
  }, [])

  // Listen for header pause/play toggle
  useEffect(() => {
    const handler = () => {
      pausedRef.current = !pausedRef.current
      window.dispatchEvent(new CustomEvent('marquee-state', { detail: { paused: pausedRef.current } }))
    }
    window.addEventListener('marquee-toggle', handler)
    return () => window.removeEventListener('marquee-toggle', handler)
  }, [])

  const initAnts = useCallback((streets: Street[], count: number) => {
    const ants: Ant[] = []
    for (let i = 0; i < count; i++) {
      const s = streets[i % streets.length]
      const range = s.max - s.min
      ants.push({
        sid: s.id,
        pos: s.min + Math.random() * range,
        dir: Math.random() < 0.5 ? 1 : -1,
        speed: BASE_SPEED + Math.random() * SPEED_VAR,
        cd: 0,
        w: 60,
        h: 16,
      })
    }
    return ants
  }, [])

  const measure = useCallback(() => {
    if (!gridRef.current || !containerRef.current) return
    const rect = gridRef.current.getBoundingClientRect()
    const cRect = containerRef.current.getBoundingClientRect()
    // Streets relative to our container
    const offX = rect.left - cRect.left
    const offY = rect.top - cRect.top
    const { streets, nodes } = calcStreets(rect.width, rect.height)

    // Offset streets to container coordinates
    for (const s of streets) {
      if (s.axis === 'h') {
        s.fixed += offY
        s.min += offX
        s.max += offX
      } else {
        s.fixed += offX
        s.min += offY
        s.max += offY
      }
    }
    for (const n of nodes) {
      for (const c of n.streets) {
        const st = streets.find(s => s.id === c.sid)!
        if (st.axis === 'h') c.pos += offX
        else c.pos += offY
      }
    }
    streetsRef.current = streets
    nodesRef.current = nodes

    // Init ants if needed
    if (antsRef.current.length === 0 && skillsRef.current.length > 0) {
      antsRef.current = initAnts(streets, skillsRef.current.length)
    }

    // Measure badge widths
    for (let i = 0; i < badgeRefs.current.length; i++) {
      const el = badgeRefs.current[i]
      if (el) {
        widthsRef.current[i] = el.offsetWidth
        antsRef.current[i] && (antsRef.current[i].w = el.offsetWidth)
        antsRef.current[i] && (antsRef.current[i].h = el.offsetHeight)
      }
    }
  }, [gridRef, initAnts])

  // Animation loop
  const tick = useCallback((time: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = time
    const dt = Math.min(time - lastTimeRef.current, 33) / 1000 // seconds, capped ~30fps
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

        // Check intersections
        if (ant.cd === 0) {
          for (let ni = 0; ni < nodes.length; ni++) {
            const node = nodes[ni]
            const conn = node.streets.find(c => c.sid === ant.sid)
            if (!conn) continue
            if (Math.abs(ant.pos - conn.pos) < INTERSECTION_NEAR) {
              // Check if intersection is blocked by another ant
              const blocked = ants.some((other, oi) => {
                if (oi === i) return false
                for (const oc of node.streets) {
                  if (other.sid === oc.sid && Math.abs(other.pos - oc.pos) < INTERSECTION_NEAR * 2) {
                    return true
                  }
                }
                return false
              })

              if (blocked) {
                // Wait at intersection
                newPos = ant.pos
                break
              }

              if (Math.random() < TURN_CHANCE) {
                // Turn to a different street
                const options = node.streets.filter(c => c.sid !== ant.sid)
                if (options.length > 0) {
                  const pick = options[Math.floor(Math.random() * options.length)]
                  ant.sid = pick.sid
                  ant.pos = pick.pos
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

        // Collision with ant ahead on same street
        let minAhead = Infinity
        for (let j = 0; j < ants.length; j++) {
          if (j === i || ants[j].sid !== ant.sid) continue
          const diff = (ants[j].pos - ant.pos) * ant.dir
          if (diff > 0 && diff < minAhead) minAhead = diff
        }
        const safeD = (ant.w + COLLISION_DIST) / 2 + 10
        if (minAhead < safeD) {
          newPos = ant.pos // blocked, wait
        }

        // Bounce at edges
        if (newPos <= seg.min + 5) { ant.dir = 1; newPos = seg.min + 5 }
        if (newPos >= seg.max - 5) { ant.dir = -1; newPos = seg.max - 5 }

        ant.pos = newPos

        // Update DOM
        const el = badgeRefs.current[i]
        if (el) {
          const [x, y] = antXY(ant, streets)
          el.style.transform = `translate(${x - ant.w / 2}px, ${y - ant.h / 2}px)`
        }
      }
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  // Explosion
  const explode = useCallback(() => {
    if (explodingRef.current) return
    explodingRef.current = true

    const ants = antsRef.current
    const streets = streetsRef.current

    for (let i = 0; i < ants.length; i++) {
      const el = badgeRefs.current[i]
      if (!el) continue
      const [cx, cy] = antXY(ants[i], streets)
      const angle = Math.random() * Math.PI * 2
      const dist = 120 + Math.random() * 200
      const ex = cx + Math.cos(angle) * dist
      const ey = cy + Math.sin(angle) * dist

      el.style.transition = 'transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.7s ease-out'
      el.style.transform = `translate(${ex}px, ${ey}px) scale(0.2) rotate(${Math.random() * 720 - 360}deg)`
      el.style.opacity = '0'
    }

    setTimeout(() => {
      // Re-init ants at random positions
      antsRef.current = initAnts(streetsRef.current, skillsRef.current.length)
      for (let i = 0; i < badgeRefs.current.length; i++) {
        const el = badgeRefs.current[i]
        if (!el) continue
        el.style.transition = 'none'
        el.style.opacity = '1'
        const ant = antsRef.current[i]
        if (ant) {
          const [x, y] = antXY(ant, streetsRef.current)
          el.style.transform = `translate(${x - ant.w / 2}px, ${y - ant.h / 2}px)`
        }
      }
      explodingRef.current = false
    }, 900)
  }, [initAnts])

  // Setup: measure, init, start loop
  useEffect(() => {
    const timer = setTimeout(() => {
      measure()
      rafRef.current = requestAnimationFrame(tick)
    }, 300) // wait for grid to render

    const onResize = () => measure()
    window.addEventListener('resize', onResize)

    return () => {
      clearTimeout(timer)
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [measure, tick])

  // Re-measure when skills load
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
              fontSize: '9px',
              lineHeight: '14px',
              padding: '1px 6px',
              borderRadius: '7px',
              whiteSpace: 'nowrap',
              backgroundColor: cat.bg,
              color: cat.color,
              fontWeight: 600,
              letterSpacing: '0.02em',
              willChange: 'transform',
              backdropFilter: 'blur(4px)',
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
