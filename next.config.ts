import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/news', destination: '/', permanent: true },
      { source: '/blog', destination: '/', permanent: true },
    ]
  },
  images: {
    // Wildcard needed: news/blog images are scraped from many external sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Suppress hydration warnings from browser extensions
  reactStrictMode: true,
  // Optimize for Netlify
  output: 'standalone',
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Ignore ESLint during builds (prevents build failures on Netlify)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
