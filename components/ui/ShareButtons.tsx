'use client'

import { useState, useCallback } from 'react'
import { Linkedin, Twitter, Link2, Check } from 'lucide-react'
import { useToast } from './Toast'
import { useTrackingSafe } from '@/contexts/TrackingContext'

interface ShareButtonsProps {
  url: string
  title: string
  description?: string
}

export function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const { showToast } = useToast()
  const tracking = useTrackingSafe()

  const fullUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${url}`
    : `https://vitalii.no${url}`

  const shareOnLinkedIn = useCallback(() => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`
    window.open(linkedInUrl, '_blank', 'width=600,height=600')
    tracking?.trackShare('linkedin', fullUrl, title)
    showToast('Opening LinkedIn...', 'info')
  }, [fullUrl, showToast, tracking, title])

  const shareOnTwitter = useCallback(() => {
    const text = `${title}${description ? ` - ${description.substring(0, 100)}...` : ''}`
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(fullUrl)}&text=${encodeURIComponent(text)}`
    window.open(twitterUrl, '_blank', 'width=600,height=400')
    tracking?.trackShare('twitter', fullUrl, title)
    showToast('Opening X (Twitter)...', 'info')
  }, [fullUrl, title, description, showToast, tracking])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      tracking?.trackShare('copy', fullUrl, title)
      showToast('Link copied to clipboard!', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
      showToast('Failed to copy link', 'error')
    }
  }, [fullUrl, showToast, tracking, title])

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Share options">
      <span className="text-sm text-gray-500 mr-2">Share:</span>

      <button
        onClick={shareOnLinkedIn}
        className="p-2.5 rounded-lg bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2"
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <Linkedin className="w-4 h-4" />
      </button>

      <button
        onClick={shareOnTwitter}
        className="p-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors focus:ring-2 focus:ring-black focus:ring-offset-2"
        aria-label="Share on X (Twitter)"
        title="Share on X"
      >
        <Twitter className="w-4 h-4" />
      </button>

      <button
        onClick={copyLink}
        className={`p-2.5 rounded-lg transition-all focus:ring-2 focus:ring-offset-2 ${
          copied
            ? 'bg-green-500 text-white focus:ring-green-500'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 focus:ring-gray-400'
        }`}
        aria-label={copied ? 'Link copied' : 'Copy link to clipboard'}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  )
}
