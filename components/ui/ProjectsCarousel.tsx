'use client'

import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'

interface Project {
  title: string
  short: string
  full: string
}

interface ProjectsCarouselProps {
  projects: Project[]
  onCardClick: (activeProjectIndex: number) => void
  backgroundText: string
  onIndexChange?: (index: number) => void
}

export const ProjectsCarousel = ({ projects, onCardClick, backgroundText, onIndexChange }: ProjectsCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const projectRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const descriptionRef = useRef<HTMLParagraphElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useEffect(() => {
    if (onIndexChange) {
      onIndexChange(currentIndex)
    }
  }, [currentIndex, onIndexChange])

  useEffect(() => {
    if (!projectRef.current || !titleRef.current || !descriptionRef.current || !progressRef.current || projects.length === 0) return

    if (timelineRef.current) {
      timelineRef.current.kill()
    }

    const element = projectRef.current
    const title = titleRef.current
    const description = descriptionRef.current
    const progress = progressRef.current

    gsap.set(progress, { width: '0%' })
    gsap.set([title, description], { opacity: 1, y: 0 })

    const tl = gsap.timeline({
      repeat: 0,
      onComplete: () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length)
      }
    })

    tl.fromTo(element,
      {
        yPercent: 100,
        opacity: 0,
        scale: 0.85,
        rotation: -3
      },
      {
        opacity: 1,
        scale: 1,
        rotation: 0,
        duration: 0.6,
        ease: 'back.out(1.5)'
      },
      0
    )

    tl.from([title, description], {
      opacity: 0,
      y: 15,
      stagger: 0.12,
      duration: 0.4,
      ease: 'power2.out'
    }, 0.3)

    tl.to(progress, {
      width: '100%',
      duration: 5,
      ease: 'none'
    }, 0)

    tl.to(element, {
      yPercent: -100,
      duration: 3.5,
      ease: 'none'
    }, 0.8)

    tl.to(element, {
      opacity: 0,
      scale: 0.95,
      rotation: 2,
      duration: 0.5,
      ease: 'power2.in'
    }, 4.3)

    tl.to(element, {
      duration: 0.2
    }, 4.8)

    timelineRef.current = tl

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill()
      }
    }
  }, [currentIndex, projects.length])

  useEffect(() => {
    if (!timelineRef.current) return

    if (isPaused) {
      timelineRef.current.pause()
    } else {
      timelineRef.current.resume()
    }
  }, [isPaused])

  const handleMouseEnter = () => {
    setIsPaused(true)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCardClick(currentIndex)
  }

  const currentProject = projects[currentIndex]

  return (
    <div
      className="h-full w-full overflow-hidden relative cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ position: 'relative', zIndex: 1 }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <h2
          className="font-bold text-white/10 select-none"
          style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}
        >
          {backgroundText}
        </h2>
      </div>

      <div
        ref={projectRef}
        className="absolute w-full px-4 pointer-events-none z-10"
        style={{
          top: '50%',
        }}
      >
        <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg pointer-events-auto relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              ref={progressRef}
              className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
              style={{ width: '0%' }}
            />
          </div>

          <h4
            ref={titleRef}
            className="font-bold text-white mb-2 mt-1"
            style={{ fontSize: 'clamp(0.875rem, 2vw, 1.25rem)' }}
          >
            {currentProject?.title}
          </h4>
          <p
            ref={descriptionRef}
            className="text-white/80"
            style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1rem)' }}
          >
            {currentProject?.short}
          </p>
        </div>
      </div>
    </div>
  )
}
