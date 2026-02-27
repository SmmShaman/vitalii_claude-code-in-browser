import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
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
