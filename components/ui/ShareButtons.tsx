'use client'

import { useState } from 'react'
import { Linkedin, Twitter, Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  url: string
  title: string
  description?: string
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url}`
    : `https://vitalii.no${url}`

  const shareOnLinkedIn = () => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`
    window.open(linkedInUrl, '_blank', 'width=600,height=600')
  }

  const shareOnTwitter = () => {
    const text = `${title}${description ? ` - ${description.substring(0, 100)}...` : ''}`
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(text)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500 mr-2">Share:</span>

      <button
        onClick={shareOnLinkedIn}
        className="p-2.5 rounded-lg bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>

      <button
        onClick={shareOnTwitter}
        className="p-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
        aria-label="Share on X (Twitter)"
        title="Share on X"
      >
        <Twitter className="w-4 h-4" />
      </button>

      <button
        onClick={copyLink}
        className={`p-2.5 rounded-lg transition-all ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-label="Copy link"
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
