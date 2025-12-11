'use client'

import { useEffect, useRef } from 'react'
import { animate, splitText, stagger } from 'animejs'

interface AnimatedDescriptionProps {
  text: string
}

export const AnimatedDescription = ({ text }: AnimatedDescriptionProps) => {
  const containerRef = useRef<HTMLParagraphElement>(null)
  const splitRef = useRef<any>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (splitRef.current) {
      splitRef.current.revert()
    }

    splitRef.current = splitText(containerRef.current, {
      lines: { wrap: 'clip' },
    })

    splitRef.current.addEffect(({ lines }: any) => {
      return animate(lines, {
        y: [
          { to: ['100%', '0%'] },
          { to: '-100%', delay: 2000, ease: 'in(3)' }
        ],
        duration: 750,
        ease: 'out(3)',
        delay: stagger(200),
        loop: true,
        loopDelay: 1500,
      })
    })

    return () => {
      if (splitRef.current) {
        splitRef.current.revert()
      }
    }
  }, [text])

  return (
    <p
      ref={containerRef}
      className="text-gray-800 mt-1.5 leading-tight"
      style={{ fontSize: 'clamp(0.875rem, 1.5vw, 1.125rem)' }}
    >
      {text}
    </p>
  )
}
