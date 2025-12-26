'use client'

import { useEffect, useRef, useState, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface ScrollRevealProps {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  duration?: number
  once?: boolean
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
  duration = 0.5,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once && ref.current) {
            observer.unobserve(ref.current)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [once])

  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 30, x: 0 }
      case 'down':
        return { y: -30, x: 0 }
      case 'left':
        return { y: 0, x: 30 }
      case 'right':
        return { y: 0, x: -30 }
      case 'none':
        return { y: 0, x: 0 }
    }
  }

  const initial = getInitialPosition()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...initial }}
      animate={
        isVisible
          ? { opacity: 1, y: 0, x: 0 }
          : { opacity: 0, ...initial }
      }
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // Custom easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Staggered reveal for lists
interface StaggerRevealProps {
  children: ReactNode[]
  className?: string
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

export function StaggerReveal({
  children,
  className = '',
  staggerDelay = 0.1,
  direction = 'up',
}: StaggerRevealProps) {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <ScrollReveal key={index} delay={index * staggerDelay} direction={direction}>
          {child}
        </ScrollReveal>
      ))}
    </div>
  )
}
