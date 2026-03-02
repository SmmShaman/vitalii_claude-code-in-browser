import { Metadata } from 'next'
import { NewsListingClient } from './NewsListingClient'
import { BASE_URL } from '@/utils/seo'

export const metadata: Metadata = {
  title: 'News | Vitalii Berbeha',
  description: 'Latest tech news, AI updates, and industry insights curated by Vitalii Berbeha.',
  alternates: {
    canonical: `${BASE_URL}/news`,
  },
  openGraph: {
    title: 'News | Vitalii Berbeha',
    description: 'Latest tech news, AI updates, and industry insights.',
    url: `${BASE_URL}/news`,
    type: 'website',
  },
}

export default function NewsListingPage() {
  return <NewsListingClient />
}
