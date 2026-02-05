'use client'

import { useState, useCallback } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

export interface LightboxImage {
  src: string
  alt?: string
  title?: string
}

interface ImageLightboxProps {
  images: LightboxImage[]
  isOpen: boolean
  onClose: () => void
  currentIndex?: number
}

export function ImageLightbox({
  images,
  isOpen,
  onClose,
  currentIndex = 0
}: ImageLightboxProps) {
  const slides = images.map(img => ({
    src: img.src,
    alt: img.alt || '',
    title: img.title
  }))

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
      controller={{
        closeOnBackdropClick: true
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
      }}
    />
  )
}

interface ClickableImageProps {
  src: string
  alt?: string
  className?: string
  onClick?: () => void
  priority?: boolean
}

export function ClickableImage({
  src,
  alt = '',
  className = '',
  onClick,
  priority
}: ClickableImageProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 rounded-lg overflow-hidden ${className}`}
      aria-label={`View ${alt || 'image'} in fullscreen`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform hover:scale-[1.02]"
      />
    </button>
  )
}

export function useLightbox(initialImages: LightboxImage[] = []) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [images, setImages] = useState<LightboxImage[]>(initialImages)

  const openLightbox = useCallback((index: number = 0) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }, [])

  const closeLightbox = useCallback(() => {
    setIsOpen(false)
  }, [])

  const openWithImage = useCallback((imageSrc: string, allImages?: LightboxImage[]) => {
    const imageList = allImages || images
    const index = imageList.findIndex(img => img.src === imageSrc)
    setImages(imageList)
    setCurrentIndex(index >= 0 ? index : 0)
    setIsOpen(true)
  }, [images])

  return {
    isOpen,
    currentIndex,
    images,
    setImages,
    openLightbox,
    closeLightbox,
    openWithImage
  }
}
