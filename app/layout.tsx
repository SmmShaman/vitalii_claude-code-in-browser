import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
  description: 'Professional in e-commerce, marketing, and project management. AI project leader and entrepreneur with 20+ years of experience.',
  keywords: ['e-commerce', 'marketing', 'AI', 'project management', 'Vitalii Berbeha'],
  authors: [{ name: 'Vitalii Berbeha' }],
  openGraph: {
    title: 'Vitalii Berbeha - E-commerce & Marketing Expert',
    description: 'Professional in e-commerce, marketing, and project management.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Host+Grotesk:wght@300;400;500;600;700&display=swap"
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
  );
}
