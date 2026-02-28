import { Metadata } from 'next'
import { ArticleLayout } from '@/components/ArticleLayout'
import { CookiePolicyContent } from './CookiePolicyContent'

export const metadata: Metadata = {
  title: 'Informasjonskapsler (cookies) | Vitalii Berbeha',
  description: 'Oversikt over bruk av informasjonskapsler (cookies) på vitalii.no. Les om hvilke vi bruker og hvordan vi administrerer dem.',
  robots: { index: true, follow: true },
}

export default function CookiePolicyPage() {
  return (
    <ArticleLayout backLabel="Tilbake">
      <CookiePolicyContent />
    </ArticleLayout>
  )
}
