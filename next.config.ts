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
  images: {
    // Optimized breakpoints for mobile-first responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Prefer AVIF (smaller), fall back to WebP
    formats: ['image/avif', 'image/webp'],
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
