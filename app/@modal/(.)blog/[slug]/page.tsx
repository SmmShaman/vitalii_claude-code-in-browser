'use client'

import { Modal } from '@/components/ui/Modal'
import { BlogArticle } from '@/app/blog/[slug]/BlogArticle'
import { use } from 'react'

interface Props {
  params: Promise<{ slug: string }>
}

export default function BlogModalPage({ params }: Props) {
  const { slug } = use(params)

  return (
    <Modal>
      <BlogArticle slug={slug} />
    </Modal>
  )
}
