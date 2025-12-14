import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://vitalii-berbeha.netlify.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Vitalii Berbeha - E-commerce & Marketing Expert',
    template: '%s | Vitalii Berbeha',
  },
  description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur specializing in e-commerce, marketing, and EdTech solutions.',
  keywords: ['e-commerce', 'marketing', 'AI', 'EdTech', 'portfolio', 'React', 'TypeScript', 'Next.js'],
  authors: [{ name: 'Vitalii Berbeha', url: siteUrl }],
  creator: 'Vitalii Berbeha',
  publisher: 'Vitalii Berbeha',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
    description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur',
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['nb_NO', 'uk_UA'],
    siteName: 'Vitalii Berbeha',
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
    description: 'Professional portfolio of Vitalii Berbeha - AI project leader and entrepreneur',
    creator: '@vitalii_berbeha',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#667eea' },
    { media: '(prefers-color-scheme: dark)', color: '#764ba2' },
  ],
  width: 'device-width',
  initialScale: 1,
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
      <head>
        {/* Comfortaa font - rounded geometric with excellent Cyrillic support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          {children}
          {modal}
        </Providers>
      </body>
    </html>
  )
}
