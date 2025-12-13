import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
  description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur specializing in e-commerce, marketing, and EdTech solutions.',
  keywords: ['e-commerce', 'marketing', 'AI', 'EdTech', 'portfolio', 'React', 'TypeScript'],
  authors: [{ name: 'Vitalii Berbeha' }],
  openGraph: {
    title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
    description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur',
    type: 'website',
    locale: 'en_US',
  },
}

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          {modal}
        </Providers>
      </body>
    </html>
  )
}
