'use client'

import { Modal } from '@/components/ui/Modal'
import { NewsArticle } from '@/app/news/[slug]/NewsArticle'
import { use } from 'react'

interface Props {
  params: Promise<{ slug: string }>
}

export default function NewsModalPage({ params }: Props) {
  const { slug } = use(params)

  return (
    <Modal>
      <NewsArticle slug={slug} />
    </Modal>
  )
}
