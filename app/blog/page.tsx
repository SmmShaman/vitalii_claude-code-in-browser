import { Metadata } from 'next'
import { BlogListingClient } from './BlogListingClient'
import { BASE_URL } from '@/utils/seo'

export const metadata: Metadata = {
  title: 'Blog | Vitalii Berbeha',
  description: 'Blog posts about web development, AI, automation, and technology by Vitalii Berbeha.',
  alternates: {
    canonical: `${BASE_URL}/blog`,
  },
  openGraph: {
    title: 'Blog | Vitalii Berbeha',
    description: 'Blog posts about web development, AI, automation, and technology.',
    url: `${BASE_URL}/blog`,
    type: 'website',
  },
}

export default function BlogListingPage() {
  return <BlogListingClient />
}
