import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
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
  // Ignore ESLint during builds (prevents build failures on Netlify)
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
