import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'News - Vitalii Berbeha',
  description: 'Latest news and updates from Vitalii Berbeha',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  )
}
