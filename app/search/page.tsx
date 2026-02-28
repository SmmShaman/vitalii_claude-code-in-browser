import { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'
import { SearchPageClient } from './SearchPageClient'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://vitalii.no'

export const metadata: Metadata = {
  title: 'Search | Vitalii Berbeha',
  description: 'Search news and blog articles on vitalii.no',
  alternates: {
    canonical: `${BASE_URL}/search`,
  },
  robots: { index: true, follow: true },
}

export default function SearchPage() {
  return (
    <ArticleLayout backLabel="Search">
      <SearchPageClient />
    </ArticleLayout>
  )
}
