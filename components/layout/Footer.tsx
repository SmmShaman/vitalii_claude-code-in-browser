'use client'

import { useState, useEffect } from 'react'
import { Twitter, Facebook, Send, Instagram, Linkedin } from 'lucide-react'

export const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
    { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
    { icon: Send, href: 'https://t.me', label: 'Telegram' },
    { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
    { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
  ]

  return (
    <footer className="h-full w-full px-2 sm:px-4 flex items-center">
      <div className="max-w-6xl mx-auto rounded-xl sm:rounded-2xl shadow-2xl border border-black/20 h-full w-full"
        style={{
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="h-full flex flex-row items-center justify-between px-3 sm:px-4 md:px-6">
          {/* Clock */}
          <div
            className="text-white/80 font-mono"
            style={{ fontSize: 'clamp(0.75rem, 1.5vw, 1.125rem)' }}
          >
            {currentTime.toLocaleTimeString()}
          </div>

          {/* Social Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {socialLinks.map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-white transition-colors duration-300"
                aria-label={label}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
